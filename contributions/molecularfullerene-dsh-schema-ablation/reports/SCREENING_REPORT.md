# V4 Pro 首请求 Schema Screening（2026-08-16）

## 结论摘要

本轮真实官方 API 实验复现了一个清晰但必须收窄表述的效应：**两项工具的 schema 内容会显著改变 `We need` / `Let me` 词法轨迹的抽样概率**。它没有证明两种轨迹在首步功能质量上存在差异，更没有证明模型内部存在两个离散人格。

- 官方 exact Minimal：`minimal-like` 16/20（80%，Wilson 95% CI 58.4%–91.9%）
- macOS `bash/read` surrogate：8/20（40%，Wilson 95% CI 21.9%–61.3%）
- 探索性风险差：+40 个百分点；Fisher 双侧 `p≈0.022`
- 40/40 都产生了合法、任务相关的首个检查动作；`minimal-like` 24/24、`standard-like` 13/13、`ambiguous` 3/3 均如此

该 `p` 值只能作为探索性描述：初始每格 n=3 后看过结果，才固定补到每格 n=10，不能冒充预注册确认性检验。

## 设计

两个题面：

1. 英文 repo-inspection 短探针
2. 中文 Project2 V4.1b 任务正文

两个 schema 条件：

1. 官方 exact Minimal：persistent `bash` + `str_replace_editor`
2. 冻结历史 preset 在 macOS 的首请求：Standard one-shot `bash` + `read`

固定项：

- system 精确 hash 均为 `5fab6e32...`，即 `You are a helpful software engineer assistant.`
- 每个条件都只有两个工具
- `reasoning_effort=max`、`max_tokens=256000`
- 同题面、同时间块内共享匿名 user id；每次 fresh session
- 条件顺序随机交错
- assistant message 持久化后、任何工具 dispatch 前同步取消
- 真实请求工具 schema hash 在各条件内完全稳定

每个 `题面 × schema` cell 累计 n=10，由两个平衡匿名身份/时间块组成（n=3 + n=7）。早先因网络沙箱导致的 12 个 `TRANSPORT` 失败批次被明确排除；它们没有 assistant response。

历史 98/99 是 Windows `pwsh/read`。本轮 `bash/read` 只检验同类 schema surface，不声称复现 Windows executor 或历史完整任务成绩。

## 分层结果

| 题面 | exact Minimal | `bash/read` surrogate | 风险差 |
|---|---:|---:|---:|
| repo-inspection | 10/10 minimal-like | 6/10 | +40pp |
| Project2 | 6/10 minimal-like | 2/10 | +40pp |
| 合计 | 16/20 | 8/20 | +40pp |

四个独立时间/身份块的差异方向都一致：初始 n=3 块均为 +1/3，扩展 n=7 块均为 +3/7。与此同时，题面也产生同样大小的主效应：repo-inspection 比 Project2 更容易出现 minimal-like；exact Minimal 并非稳定开关，Project2 下仍有 4/10 为 standard-like。

## 请求面差异有多大

同一题面内：system、工具数量、reasoning effort、maxTokens、消息正文均固定。可见差异集中在两个工具的名称、description、parameters 与相应 executor identity。

- repo-inspection 总 prompt token：exact 1195；surrogate 1236
- Project2 总 prompt token：exact 1683；surrogate 1724
- 两题都恰好相差 41 token

所以当前效应仍不能在以下解释中二选一：

1. schema 的语义/参数形状触发了不同轨迹
2. 仅 41 token 的 schema mass 或特定措辞造成偏移
3. Standard shell 的 `description` 必填参数、`read` 名称等局部特征是关键

需要工具组件 2×2 与 token-matched padding 控制。

## 为什么不能称作“脑子开/关”

词法标签与本轮可观察的首步功能没有分离：

- 40/40 都调用了当前目录中存在的工具
- 40/40 参数可解析且符合 schema
- 40/40 首动作都是合理的 `bash` 仓库/工作区检查
- 所有模型工具调用均被 Harness 标记为 `ABORTED_BEFORE_DISPATCH`，工作区未执行任何模型命令

reasoning token 也没有出现可支持“两个长度吸引子”的干净断层：

- minimal-like：平均 45.5 reasoning token
- standard-like：平均 27.5
- ambiguous：平均 54.7
- 各条件内部范围高度重叠；例如 exact Minimal 的 repo-inspection 全部 minimal-like，但 reasoning 仍从 13 到 71 token 连续变化

因此本轮能说的是“schema 改变词法轨迹分布”，不能说“`Let me` 已被证明没有推理能力”。

## 下一步

1. 首轮 schema 组件 2×2 已完成：persistent/Standard `bash` 是主导因子，详见 `FACTORIAL_REPORT.md`。
2. 加入 token-matched schema padding，并逐项加入 shell 参数，分离语义、参数复杂度与 token mass。
3. 在预先固定样本量的 held-out、多步只读任务上测真实答案正确率，不能继续把词法分类当主要终点。
4. 对同一首轮响应 fork request #2：保留/删除 `reasoning_content` × same/new session id，区分显式 CoT 自条件化与服务端会话状态。

可公开的去标识化机器汇总见 `../data/screening-summary.json`。原始事件级记录、完整 reasoning 与身份哈希仅本地保留。
