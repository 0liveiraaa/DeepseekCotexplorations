# DeepSeek V4 Pro：DSH Schema Bridge 组件消融

- **上传者 ID**：MolecularFullerene
- **研究主题**：固定真实 executor，只交叉模型可见 `bash` description 与 parameters 的预注册首响应消融
- **日期**：2026-08-17

## 结果摘要

这是已合入贡献
[`molecularfullerene-dsh-schema-ablation`](../molecularfullerene-dsh-schema-ablation/)
的确认性后续。旧实验发现整个 shell schema bundle 与词法轨迹变化相关；本轮保持
官方 persistent `bash` executor、Minimal system、`str_replace_editor`、工具顺序和
执行安全边界不变，只交叉 persistent / one-shot 两套 `bash.description` 与
`bash.parameters`。

四格各 `n=40`，主要终点是首条 assistant trajectory 的 `minimal-like` 词法标签：

| Arm（description × parameters） | Minimal-like |
|---|---:|
| persistent × persistent (`PP`) | 26/40（65.0%） |
| persistent × one-shot (`PO`) | 21/40（52.5%） |
| one-shot × persistent (`OP`) | 14/40（35.0%） |
| one-shot × one-shot (`OO`) | 9/40（22.5%） |

预注册的任务内 Latin 随机化检验与 D/Q/I 三项 Holm 校正结果：

- description 主效应 `D`（one-shot − persistent）：`−0.300`；双侧
  `p=0.000110`，Holm-adjusted `p=0.000330`；
- parameters 主效应 `Q`：`−0.125`；双侧 `p=0.159868`，Holm-adjusted
  `p=0.319737`，没有确认性证据；
- interaction `I=0`，`p=1`。

因此，在这 10 个冻结只读提示和本次 model–Harness–账户配置中，`D` 是 D/Q/I
三个主要对比里唯一通过预注册 Holm 校正的一项。这个终点不是任务能力、回答质量或
内部路由测量；它不能证明存在两个离散“人格”，也不能把效应归因到 executor
persistence、某一个单词或不可变模型权重。160 条主轨迹中有 83 条为 ambiguous，
同样不支持普适的严格二态描述。

## 与工具面剂量实验的关系

[`xiaobright-v4-tool-surface-dose-response`](../xiaobright-v4-tool-surface-dose-response/)
改变工具目录的数量与组合，探索 Pro / Flash 的轨迹标签和首动作合法性；本研究始终
固定两个工具、工具顺序、system、真实 persistent executor 与 editor，只交叉
`bash.description × bash.parameters`，并对 Pro 使用预注册的提示内 Latin 随机化、
随机化检验和 Holm 校正。因此这里是 component-level 的确认性收窄，不重复其
dose-response，也不复现其 Project2 结果。

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | `0.1.0-rc.5`，commit `47f943859bef60e4160492346772ded9b24f765a` |
| 操作系统 | macOS 26.5.2，arm64 |
| API 来源 | DeepSeek 官方 API |
| 模型 | `deepseek-v4-pro`，`reasoningEffort=max`（服务端可变 alias） |
| harness / preset | 真实 DSH agent loop；自建 guarded schema bridge；固定 persistent executor |
| 其他 | Node.js v24.18.0；`max_tokens=768`；10 prompts × 4 identities × 4 arms；另有 4-cell protocol pilot |

全部 164 个 observation（4 pilot + 160 main）均通过冻结协议校验：164 个 logical
request header、164 条 assistant response、0 retry、0 executor dispatch、0 失败样本
替换。所有模型工具调用都在执行器 dispatch 前被阻止，所以本实验没有能力终点。

## 材料清单

- [`reports/SCHEMA_BRIDGE_NETWORK_V1.md`](./reports/SCHEMA_BRIDGE_NETWORK_V1.md)：
  设计、统计结果、解释与限制。
- [`data/schema-bridge-network-v1-summary.json`](./data/schema-bridge-network-v1-summary.json)：
  strict scorer 原样生成的 allowlisted 汇总与去标识化主要标签矩阵。

机器汇总与上游研究仓公开版本逐字节相同，文件 SHA-256 为
`77e3f411a584c5ef32e2939e740693388d4c5f9fe33090406daa27f8c9644f88`。
其中标签矩阵的 task/row/block ordinals 可由公开 analysis seed 重建；这里的
“去标识化”不是密码学匿名化保证。

## 预注册与实现溯源

- [正式预注册](https://github.com/MolecularFullerene/deepseek-v4-pro-harness-ablation/blob/e97670b0a875026d091b9658ced1bd4fa08d25d0/experiments/schema-bridge-live/PREREGISTRATION.md)
- [冻结实现 commit `9de7a15`](https://github.com/MolecularFullerene/deepseek-v4-pro-harness-ablation/commit/9de7a15f927b7add7c6bcaa759460a37b228254f)
- [结果发布 commit `53cd466`](https://github.com/MolecularFullerene/deepseek-v4-pro-harness-ablation/commit/53cd4661e63dc6d9420559806c0a53e096e7fadc)

模型 alias 没有可见的 immutable server build id；账户、endpoint cohort、server
shard 与时间没有随机化。报告的 Harness commit 也没有密码学证明被 `.gitignore`
忽略的生成 `lib/` 和 `node_modules/` 字节来自该 commit。公开 summary 中的 raw
artifact integrity digest 只用于内部对账，不是 provider 签名。

不公开 API key、Authorization 值、原始 reasoning/text、工具参数、请求体、真实
identity/session/request/call 标识或其 hash、绝对路径、逐请求时间和私有 raw
artifact。

实验器实现、统计复核及报告草稿由 OpenAI Codex 辅助；实验运行与公开结论由上传者复核。
