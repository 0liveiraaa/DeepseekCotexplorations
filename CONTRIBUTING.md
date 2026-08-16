# 贡献指南

本仓库收录个人对 LLM 的探索结果，按人、按主题各占一个文件夹。所有贡献通过 PR 合入。

## 提交流程

1. **Fork** 本仓库到你的账号。
2. Clone 到本地，新建分支：`contrib/<你的ID>-<主题>`。
3. 在 `contributions/` 下创建你的文件夹：`contributions/<上传者ID>-<主题>/`。
   - `<上传者ID>`：你的 GitHub 用户名或常用 ID。
   - `<主题>`：大致研究主题，英文小写 + 连字符，例如 `dsh-vs-opencode`、`preset-ablation`。
4. 在文件夹内写 `README.md`（复制 `contributions/_TEMPLATE.md` 填写）。
5. 把探索材料放进文件夹（脚本、日志、报告、配置均可），尽量分目录整理。
6. 在根 `README.md` 的「贡献者索引」表加一行。
7. 提交并发起 PR，PR 标题格式：`contrib: <上传者ID> - <主题>`。

## 文件夹规范

- 命名：`<ID>-<主题>`，小写字母、数字、连字符。
- `README.md` 必填字段：

  | 字段 | 说明 |
  |---|---|
  | 上传者 ID | GitHub 用户名或常用 ID |
  | 研究主题 | 一句话说明探索方向 |
  | 日期 | 本次结果对应的日期 |
  | 结果摘要 | 研究结论、分数/观测，简要即可 |
  | dsh 版本 | 例如版本号或 commit hash |
  | 操作系统 | Windows / WSL / macOS / Linux，带版本 |
  | API 来源 | **DeepSeek 官方 API** 或 **opencode go 订阅**，二选一 |
  | 模型 | 例如 deepseek-v4-pro / deepseek-v4-flash |
  | harness / preset | DSH minimal / anchored-standard / 自建，附说明 |
  | 其他 | Python 版本、硬件、推理框架等，可省 |

- API 来源不标或标不清的贡献，会被要求补充后合入。

## 禁止事项

- **不要改动 `modeltest/` 目录**（冻结参考样板）。
- 不要删改他人文件夹。
- 不提交：密钥/token、`.env`、凭据；超过 GitHub 限制的大文件（模型权重、编译产物等）；
  modeltest 的隐藏测试（`evaluator/tests/hidden/`、`evaluator/scoring/`）及其答案。
- 大文件如有必要，放 Releases 或外链，并在 README 注明。

## 评审标准

PR 合入前检查：

- [ ] 文件夹命名合规
- [ ] README.md 存在且字段齐全（含 API 来源）
- [ ] 未触碰 他人贡献
- [ ] 无敏感信息、无超大文件
- [ ] 根 README 索引表已更新
