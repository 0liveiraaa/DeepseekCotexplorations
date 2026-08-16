# DeepSeek V4 Pro：DSH 首请求 Schema 消融与 Request #2 Pilot

- **上传者 ID**：MolecularFullerene
- **研究主题**：模型可见工具 schema 对首轮轨迹指纹的影响，以及 `reasoning_content` / session header 对第二请求的协议影响
- **日期**：2026-08-16

## 结果摘要

在固定官方 Minimal system、`contexts=[]`、首请求恰好两个工具、
`reasoningEffort=max` 的条件下，我们完成了固定样本量的
persistent/one-shot `bash` × editor/read 2×2 消融，共 40 条成功轨迹。

- persistent `bash`：17/20 为社区分类器的 minimal-like
- one-shot `bash`：6/20
- 风险差 +55 个百分点；nominal Fisher 双侧 `p≈0.0011`
- editor：13/20；read：10/20；Fisher `p≈0.523`
- 40/40 首动作均合法且任务相关，全部在 executor dispatch 前取消

因此，shell schema bundle 是本轮词法轨迹偏移中最大的观测边际关联；
file tool 的整体主效应证据较弱。该实验只证明 schema 会改变
`We need / Let me` 轨迹分布，不证明存在两个离散“人格”，也不证明
`Let me` 代表能力失败。

另完成 retain/drop `reasoning_content` × same/new session 的四格真实 API
protocol pilot。四格各 `n=1`，均 HTTP 200 且严格 JSON 正确。它只能排除
“删除 reasoning_content 必然触发协议拒绝或让简单任务立即失败”的过强说法；
不能证明 reasoning passback 或 session header 对复杂 agent 任务无影响。

探索性 screening 还观察到 exact Minimal 为 16/20 minimal-like，
macOS `bash/read` surrogate 为 8/20；该批次在初始 n=3 后看过结果再扩样，
所以只作为探索性证据。

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | `0.1.0-rc.5`, commit `47f943859bef60e4160492346772ded9b24f765a` |
| 操作系统 | macOS 26.5.2, arm64 |
| API 来源 | DeepSeek 官方 API |
| 模型 | `deepseek-v4-pro`, `reasoningEffort=max` |
| harness / preset | 官方 exact Minimal system；自建 persistent/one-shot bash × editor/read 2×2 surface |
| 其他 | Node.js v24.18.0；factorial 使用 `max_tokens=256000`；request #2 pilot 使用 4096 |
| 对照快照 | `dsh-anchored-standard@db4527a2...`; `modeltest@04255b55...` |

模型名为服务端可变 alias，API 未暴露 server build/revision。两个题面与批次、
identity 和时间仍有共变；报告中的 Fisher p 值为 nominal，不能替代跨任务复现。

## 材料清单

- `reports/FACTORIAL_REPORT.md`：固定样本量 2×2 schema 消融
- `reports/REQUEST2_PILOT_REPORT.md`：request #2 四格协议 pilot
- `reports/SCREENING_REPORT.md`：探索性首轮 screening
- `data/factorial-summary.json`：去标识化分格与效应汇总
- `data/request2-pilot-summary.json`：四格 protocol/correctness 汇总
- `data/screening-summary.json`：去标识化探索性汇总

不公开 API key、原始 user/session id、其稳定 hash、完整 reasoning、原始 request
body、工具调用 ID、绝对路径或 Project2 测试内容。

## 备注

`minimal-like` 是对 `We need / Let me` 等词法特征的轨迹标签，不是能力分数。
分类口径引用 [`xiaobright/modeltest@04255b55`](https://github.com/xiaobright/modeltest/tree/04255b55f16c4439e538239fb9783070c4165081)，未复制其源码。

实验器实现、统计复核及报告草稿由 OpenAI Codex 辅助；实验运行与公开结论由上传者复核。
