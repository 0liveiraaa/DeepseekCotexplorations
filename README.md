# LLM 探索结果收录仓库

> 把对 LLM（重点：DeepSeek V4 系列）在工程维护任务上的探索结果，按人、按主题收录。
> 每个贡献者通过 PR 上传自己的文件夹，文件夹自带 README 记录研究结果与实验环境。
>
> [主仓库](https://github.com/xiaobright/dsh-anchored-standard)
>
> 该仓库为xiaobright仓库的issue和pr进行分流,用以接受关于思维链优化的新发现或尝试性新插件。

## 收录规则（摘要，详见 [CONTRIBUTING.md](./CONTRIBUTING.md)）

- 每人一个文件夹，放在 `contributions/` 下，通过 **PR** 上传。
- 文件夹命名：`<上传者ID>-<主题>`，例如 `joe-dsh-vs-opencode`。
- 文件夹内**必须**有 `README.md`，至少包含：
  - 上传者 ID、研究主题、日期
  - 结果摘要
  - 实验环境：**dsh 版本 / 操作系统 / API 来源 / 模型**（详见模板）
- API 来源二选一：**DeepSeek 官方 API** 或 **opencode go 订阅**。二者渠道不同、成本不同，不标注无法横向比较。
- 其余文件任意放置，但尽量整齐（建议：脚本、日志、报告分目录）。
- 不收录：含密钥/token 的文件、超过 GitHub 单文件限制的大文件、评测的隐藏测试内容。

## 目录布局

```text
DeepseekCotexplorations/
├── README.md            # 本文件：总览 + 贡献者索引
├── CONTRIBUTING.md      # PR 流程、命名规范、README 模板
└── contributions/       # 探索结果收录区
    ├── README.md        #   收录区说明
    └── _TEMPLATE.md     #   贡献者 README 模板（复制后填写）
```

## 贡献者索引

| 上传者 ID | 研究主题 | 文件夹 | 环境摘要 |
|---|---|---|---|
| xiaobright | DeepSeek V4 在 DSH 各 preset 下的能力与触发机制 | [`xiaobright-deepseek-v4-harness`](./contributions/xiaobright-deepseek-v4-harness/) | DSH commit 47f9438 · Windows 11 + WSL 24.04 · DeepSeek 官方 API · deepseek-v4-pro/flash · minimal/standard/PTC/anchored-standard |
| MolecularFullerene | DSH 首请求工具 schema 2×2 消融与 Request #2 协议 pilot | [`molecularfullerene-dsh-schema-ablation`](./contributions/molecularfullerene-dsh-schema-ablation/) | DSH 0.1.0-rc.5 / 47f9438 · macOS 26.5.2 arm64 · DeepSeek 官方 API · deepseek-v4-pro · exact Minimal + 自建 2×2 surface |
| 1127353621zxm-netizen | DSH 会话导出（明文 JSONL）与内部存储（zstd 多帧）的格式差异与导入方法 | [`1127353621zxm-netizen-dsh-session-import-export`](./contributions/1127353621zxm-netizen-dsh-session-import-export/) | DSH rc.6 · Windows 11 · opencode go 订阅 · deepseek-v4-pro/flash · 自建 preset · node 22.23.2 |
| 1127353621zxm-netizen | node 版本与 DSH zstd 会话存储的兼容性（22.14 缺 zstd API 启动崩溃） | [`1127353621zxm-netizen-node-zstd-compat`](./contributions/1127353621zxm-netizen-node-zstd-compat/) | DSH rc.6 · Windows 11 · opencode go 订阅 · deepseek-v4-pro/flash · 自建 preset |
| 1127353621zxm-netizen | DSH 插件工具 JSON Schema 合规性修复（字段级 required / type:json） | [`1127353621zxm-netizen-deepwrite-schema-fixes`](./contributions/1127353621zxm-netizen-deepwrite-schema-fixes/) | DSH rc.6 · Windows 11 · opencode go 订阅 · deepseek-v4-flash · 自建 preset |
| Greenhand-monster | Wire Think-Execute Standard（wire 级 think 步：工具定义在场 + 调用禁止） | [`greenhand-monster-wire-think-standard`](./contributions/greenhand-monster-wire-think-standard/) | DSH 0.1.0-rc.5 / 47f9438 · Windows 11 原生 · DeepSeek 官方 API · deepseek-v4-pro · 自建 wire-think-standard · 99/A（F9 回填） |
| Greenhand-monster | Eternal Minimal（永驻 Minimal 目录 + dshx 网关） | [`greenhand-monster-eternal-minimal`](./contributions/greenhand-monster-eternal-minimal/) | DSH 0.1.0-rc.5 / 47f9438 · Windows 11 原生 · DeepSeek 官方 API · deepseek-v4-pro · 自建 eternal-minimal · 98/B+（F9 回填） |
| Greenhand-monster | Combo Anchored（think 分相 + 深度门 + CoT 滴灌组合） | [`greenhand-monster-combo-anchored`](./contributions/greenhand-monster-combo-anchored/) | DSH 0.1.0-rc.5 / 47f9438 · Windows 11 原生 · DeepSeek 官方 API · deepseek-v4-pro · 自建 combo-anchored · 97/B+（F9 回填） |
| xiaobright | V4 工具面剂量 + Prefab Anchored Project2 三轮复现与通用化边界 | [`xiaobright-v4-tool-surface-dose-response`](./contributions/xiaobright-v4-tool-surface-dose-response/) | DSH 0.1.0-rc.5 / 47f9438 · Windows 11 原生 · DeepSeek 官方 API · deepseek-v4-pro/flash · 72 probes + Project2 98/99/99 |
| noone89 | V4-Pro-0813 思维链"人格分裂"的机制归因 | [`noone89-deepseek-v4`](./contributions/noone89-deepseek-v4/) | DSH 0.1.0-rc.6 · Windows 11 原生 · OpenCode Go 订阅 · deepseek-v4-pro |
| slicenferqin | Trajectory Thermostat：按思维链指纹反馈调节工具/注入剂量 | [`slicenferqin-trajectory-thermostat`](./contributions/slicenferqin-trajectory-thermostat/) | DSH 0.1.0-rc.6 · macOS 27 arm64 · opencode go 订阅 · deepseek-v4-pro · 自建 zero-warmup 变体 |

> 新 PR 合并时，作者需同步在根 `README.md` 索引表加一行。

## 为什么强制记录环境变量

同一道题，dsh 版本、操作系统、API 来源（官方 API 还是 go 订阅）、harness preset 不同，
得分可能差 5–10 分（V4.1b 基线已有先例）。不记录环境，结果就是孤立的数字，
无法复现、无法比较。这是本仓库对每份贡献的最低要求。

## 参考

- 完整测试套件与工具（Project2 V4.1b 题面、evaluator、harness preset）：
  [`xiaobright/modeltest`](https://github.com/xiaobright/modeltest)
