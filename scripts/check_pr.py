#!/usr/bin/env python3
"""PR 合规检查：贡献文件夹命名 / 索引同步（增量）/ 改动白名单 / 敏感信息 / 文件大小。

本地运行:
    python scripts/check_pr.py --base main
CI 运行:
    python scripts/check_pr.py --base origin/<base_ref>

检查规则（对齐 CONTRIBUTING.md 评审标准）:
  R1 贡献文件夹命名合规: contributions/<ID>-<主题>/，小写字母/数字/连字符
  R2 根 README 索引已更新: 每个新文件夹名出现在根 README.md 中
  R3 contributions/README 索引已更新: 每个新文件夹名出现在 contributions/README.md 中
  R4 增量白名单: 只允许新增贡献文件夹内容；已跟踪文件仅可增量修改
     README.md 与 contributions/README.md（只增不改），其余文件一律禁止改动/删除
  R5 敏感信息: 变更文件不含密钥/凭据/私钥/本地绝对路径
  R6 文件大小: 变更文件不超过上限（默认 50MB）
"""
import argparse
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MAX_SIZE = 50 * 1024 * 1024

# 只允许被修改（且仅增量）的已跟踪文件
ALLOWED_MODIFY = {"README.md", "contributions/README.md"}
# 贡献文件夹命名: 小写字母/数字，至少一个连字符分隔的两段以上
FOLDER_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)+$")

# 敏感信息: 密钥/凭据格式
SENSITIVE_PATTERNS = [
    (re.compile(r"sk-[A-Za-z0-9]{8,}"), "API key (sk-...)"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "AWS Access Key"),
    (re.compile(r"ghp_[A-Za-z0-9]{20,}"), "GitHub PAT (ghp_)"),
    (re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"), "Slack token"),
    (re.compile(r"AIza[A-Za-z0-9_-]{20,}"), "Google API key"),
    (re.compile(r"Bearer\s+[A-Za-z0-9._~+/=-]{20,}"), "Bearer token"),
    (re.compile(r"BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY"), "私钥块"),
    (re.compile(r"-----BEGIN"), "PEM 证书块"),
    (re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"), "JWT"),
    (re.compile(r"(?i)AKIA"), "AWS key 变体"),
]
# 敏感信息: 本地绝对路径（Windows / Linux / macOS）
PATH_PATTERNS = [
    (re.compile(r"[A-Za-z]:\\\\Users\\\\"), "Windows 绝对路径"),
    (re.compile(r"[A-Za-z]:/Users/"), "Windows 绝对路径(正斜杠)"),
    (re.compile(r"/home/[a-z0-9_-]+/"), "Linux home 路径"),
    (re.compile(r"/Users/[A-Za-z0-9_-]+/"), "macOS home 路径"),
]
# 禁止提交的凭据类文件名
FORBIDDEN_FILENAMES = (".env", ".env.local", ".env.production", ".env.development")


def git(*args):
    return subprocess.run(
        ["git", "-C", ROOT, *args],
        capture_output=True, text=True, check=True,
    ).stdout


def changed_files(base, head):
    """返回 [(status, path)]，status 为 A/M/D/R。"""
    out = git("diff", "--name-status", f"{base}...{head}")
    files = []
    for line in out.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        status = parts[0][0]
        path = parts[1] if len(parts) > 1 else parts[0].split(None, 1)[-1]
        files.append((status, path))
    return files


def numstat_dels(base, head, path):
    """返回该文件在 diff 中的删除行数。"""
    out = git("diff", "--numstat", f"{base}...{head}", "--", path)
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) == 3:
            try:
                return int(parts[1])
            except ValueError:
                return 0
    return 0


def scan_sensitive(path):
    """扫描文本文件的敏感内容，返回 [(行号, 类别, 摘要)]。"""
    hits = []
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except OSError:
        return hits
    if "\x00" in content:
        return hits  # 二进制文件跳过内容扫描
    for lineno, line in enumerate(content.splitlines(), 1):
        for pat, name in SENSITIVE_PATTERNS + PATH_PATTERNS:
            if pat.search(line):
                hits.append((lineno, name, line.strip()[:100]))
    return hits


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base", default="main", help="基准 ref（CI 传 origin/<base_ref>）")
    ap.add_argument("--head", default="HEAD", help="当前分支 ref")
    ap.add_argument("--max-size", type=int, default=DEFAULT_MAX_SIZE,
                    help="单文件大小上限（字节），默认 50MB")
    args = ap.parse_args()

    results = []  # (检查项, 是否通过, 说明)

    def check(name, ok, detail=""):
        results.append((name, ok, detail))

    files = changed_files(args.base, args.head)
    if not files:
        check("变更列表", True, "无文件变更（空 PR）")
    else:
        check("变更列表", True, f"{len(files)} 个文件变更")

    # ---- 提取新增贡献文件夹 ----
    new_folders = set()
    for status, path in files:
        if status == "A" and path.startswith("contributions/") and "/" in path[len("contributions/"):]:
            folder = path.split("/")[1]
            new_folders.add(folder)

    # ---- R1 命名合规 ----
    bad_names = [n for n in new_folders if not FOLDER_RE.match(n)]
    check("R1 文件夹命名合规",
          not bad_names,
          f"新文件夹: {sorted(new_folders) or '无'}; 违规: {bad_names or '无'}"
          if bad_names else f"新文件夹: {sorted(new_folders) or '无'}，全部合规")

    # ---- R2/R3 索引同步 ----
    for folder in sorted(new_folders):
        root_readme = os.path.join(ROOT, "README.md")
        contrib_readme = os.path.join(ROOT, "contributions", "README.md")
        in_root = os.path.exists(root_readme) and f"contributions/{folder}" in open(root_readme, encoding="utf-8").read()
        in_contrib = os.path.exists(contrib_readme) and f"./{folder}/" in open(contrib_readme, encoding="utf-8").read()
        check(f"R2 根 README 索引含 {folder}", in_root,
              "未在根 README.md 索引表中找到该文件夹" if not in_root else "已找到")
        check(f"R3 contributions/README 索引含 {folder}", in_contrib,
              "未在 contributions/README.md 索引表中找到该文件夹" if not in_contrib else "已找到")

    # ---- R4 增量白名单 ----
    for status, path in files:
        if status == "A":
            if not (path.startswith("contributions/") and "/" in path[len("contributions/"):]):
                check(f"R4 新增文件白名单: {path}", False,
                      "新增文件必须位于 contributions/<文件夹>/ 内")
            continue
        if status == "D":
            check(f"R4 禁止删除: {path}", False, "不允许删除已有文件")
            continue
        # M / R
        if path not in ALLOWED_MODIFY:
            check(f"R4 改动白名单: {path}", False,
                  f"只允许增量修改: {', '.join(sorted(ALLOWED_MODIFY))}")
            continue
        dels = numstat_dels(args.base, args.head, path)
        check(f"R4 增量追加: {path}", dels == 0,
              f"该文件删除 {dels} 行，只允许追加新行（新贡献者索引行）" if dels else "仅新增行，符合增量")

    # ---- R5 敏感信息 ----
    for status, path in files:
        if status == "D":
            continue
        full = os.path.join(ROOT, path)
        if os.path.basename(path) in FORBIDDEN_FILENAMES or path.endswith((".pem", ".key", ".p12", ".pfx")):
            check(f"R5 禁止文件类型: {path}", False, "凭据类文件禁止提交")
            continue
        if not os.path.exists(full):
            continue
        hits = scan_sensitive(full)
        if hits:
            desc = "; ".join(f"L{l} {name}" for l, name, _ in hits[:3])
            check(f"R5 敏感信息: {path}", False, f"命中 {len(hits)} 处: {desc}")
        else:
            check(f"R5 敏感信息: {path}", True, "干净")

    # ---- R6 文件大小 ----
    for status, path in files:
        if status == "D":
            continue
        full = os.path.join(ROOT, path)
        if os.path.exists(full):
            size = os.path.getsize(full)
            check(f"R6 文件大小: {path}", size <= args.max_size,
                  f"{size} B / 上限 {args.max_size} B" if size > args.max_size else f"{size} B，OK")

    # ---- 汇总 ----
    failed = [r for r in results if not r[1]]
    print("=" * 64)
    for name, ok, detail in results:
        mark = "PASS" if ok else "FAIL"
        print(f"[{mark}] {name} — {detail}")
    print("=" * 64)
    if failed:
        print(f"共 {len(results)} 项，{len(failed)} 项未通过。")
        return 1
    print(f"共 {len(results)} 项，全部通过。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
