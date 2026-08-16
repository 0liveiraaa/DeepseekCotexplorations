# DSH 会话导入导出：明文 JSONL 与内部 zstd 多帧存储的转换

- **上传者 ID**：1127353621zxm-netizen
- **研究主题**：dsh 会话导出的 `session.jsonl`（明文）与内部存储 `session.jsonl.zstd`（zstd 多帧）的格式差异，以及无损导入的方法
- **日期**：2026-08-16

## 结果摘要

- dsh 的会话持久化（`@deepseek-ai/dsh-session-persistence-jsonl`）把每条会话存为 `session.jsonl.zstd`：**zstd 多帧拼接**，第一帧解压后必须是**恰好一行** header（`{"type":"session","version":0,...}`），后续帧为事件批次（JSONL 文本，可多行）。
- 从 Web UI / 其他途径导出的 `session.jsonl` 是**明文单文件 JSONL**（每行一个 JSON 对象）。
- **直接把明文内容整体压成单个 zstd 帧写入，dsh 启动会报 `corrupt Zstandard session log: first frame is not exactly one header line`**，工作区插件加载失败、整个 dsh 无法启动。
- 正确做法：把明文按「第 1 行 header + 其余事件行」拆成两段，**分别** zstd 压缩成两个 frame 后拼接写入（见 `scripts/import-session-jsonl.mjs`）。
- 会话文件放入 `<DSH_HOME>/sessions/<cwd-编码名>/session-<uuid>/` 后，还需要把它登记进对应工作区的注册表（`storages/workspace.json` 的 `tables.workspaces.<id>.sessionIds`），否则 Web UI 的会话列表不会显示（列表并非直接扫描文件目录）。

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | 0.1.0-rc.6（npx @deepseek-ai/dsh） |
| 操作系统 | Windows 11 |
| API 来源 | opencode go 订阅（llm-pi-ai / opencode-go provider） |
| 模型 | deepseek-v4-pro / deepseek-v4-flash |
| harness / preset | 自建（warmupbetter-replay + router-flash） |
| 其他 | node 22.23.2；会话导出文件来自 Web UI 导出 / 历史备份 zip |

## 材料清单

- `scripts/import-session-jsonl.mjs`：明文 `session.jsonl` → dsh 内部 zstd 多帧格式的转换脚本。
  - 用法：`node import-session-jsonl.mjs <导出的 session.jsonl> <目标 session.jsonl.zstd 路径>`
  - 依赖 node ≥ 22.13（`node:zlib` 的 zstd API）。

## 备注

- 踩坑记录：第一次导入把整体压缩成单帧，两个实例启动全部失败，排查到 `dsh-session-persistence-jsonl/lib/index.js` 的 `assertZstdHeaderFrame`（`plaintext.indexOf(10) !== plaintext.length - 1`）才定位是帧结构问题。
- UI 显示还依赖 `storages/session_projcache.json`（会话元数据索引），纯文件导入后元数据可能缺失，打开会话后 dsh 会自动补写；标题以会话内事件为准。