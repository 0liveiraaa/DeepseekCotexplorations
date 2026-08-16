# V4 Pro 首请求 2×2 Schema 因子消融（2026-08-16）

## 结论摘要

在固定官方 Minimal system、空 runtime context、恰好两个工具的前提下，本轮把首请求目录拆成两个因子：

- shell schema：官方 Minimal persistent `bash` vs Standard one-shot `bash`
- file schema：`str_replace_editor` vs Standard `read`

固定每个 `题面 × shell × file` cell 为 `n=5`，共 40 条成功轨迹；批次在观察结果前固定样本量，没有中途扩样。以社区既有分类器的 `minimal-like` 标签为诊断终点：

- persistent `bash`：17/20（85%，Wilson 95% CI 64.0%–94.8%）
- one-shot `bash`：6/20（30%，Wilson 95% CI 14.5%–51.9%）
- 风险差：+55 个百分点；Fisher 双侧 `p≈0.0011`
- `editor`：13/20（65%）
- `read`：10/20（50%）
- 风险差：+15 个百分点；Fisher 双侧 `p≈0.523`

在这两个固定题面、40 次首轮抽样里，**shell schema bundle 是本 2×2 中最大的观测边际关联；file schema 的整体主效应证据很弱**。这比“工具数越少越好”或“必须是 editor”更精确，但仍然只证明了输出轨迹分布改变，不证明 persistent 机制本身是原因，也不证明模型能力被打开或关闭。

## 设计与完整分格

两个题面分别是英文 repo-inspection 短探针和中文 Project2 V4.1b 正文。四格均保持：

- system 为官方 Minimal 单句，SHA-256 `5fab6e32...`
- `contexts=[]`
- 首请求恰好两个真实 DSH tool schemas
- `reasoning_effort=max`、`max_tokens=256000`
- 同题面批次共享匿名 user id，每次 fresh session
- 四格随机交错
- assistant message 持久化后、任何工具执行前同步取消

运行时间窗为 2026-08-16 18:03–18:07 CST。40 条轨迹均为唯一 fresh session，两个题面批次各使用一个固定匿名 identity；模型名称是服务端可变 alias，没有可见的 server build id。

| 题面 | persistent + editor | persistent + read | one-shot + editor | one-shot + read |
|---|---:|---:|---:|---:|
| repo-inspection | 5/5 | 5/5 | 2/5 | 3/5 |
| Project2 | 5/5 | 2/5 | 1/5 | 0/5 |
| 合计 | 10/10 | 7/10 | 3/10 | 3/10 |

按题面分层，persistent shell 的方向一致：

- repo：10/10 vs 5/10，Fisher 双侧 `p≈0.0325`
- Project2：7/10 vs 1/10，Fisher 双侧 `p≈0.0198`

`editor` 的 Project2 点估计较高（6/10 vs 2/10），但样本很小且 Fisher `p≈0.170`；repo 上方向相反但更小（7/10 vs 8/10）。所以目前最多称为“file-tool interaction 可能随任务变化”，不能称 editor 已被确认是第二个触发器。

## 不只是“多了 41 token”

四格 prompt token 总量如下：

| 题面 | persistent + read | persistent + editor | one-shot + read | one-shot + editor |
|---|---:|---:|---:|---:|
| repo-inspection | 704 | 1195 | 1236 | 1727 |
| Project2 | 1192 | 1683 | 1724 | 2215 |

结果不随 token 总量单调变化。最醒目的近似 token-match 是 Project2：

- persistent + editor：1683 token，5/5 minimal-like
- one-shot + read：1724 token，0/5 minimal-like

两者只差 41 token，却相差 100 个百分点。这削弱了“总 context 长度足以解释一切”的说法。不过这个 corner 对比同时更换了 shell 与 file 两套 schema；persistent 与 one-shot 的总体平均 prompt token 又相差 532，所以尚未定位到长度、语义或某个参数字段中的哪一个才是原因。

两种 `bash` 的模型可见接口差别很大：one-shot 版的 description 和 parameters 更长，包含 `description` 必填参数以及 workdir、timeout、background、sandbox/escalation 等控制面；persistent 版基本只要求 command。下一轮应分别对这些字段做增量消融，而不是继续只比较整个 preset。

## 不能从本轮推出什么

40/40 首动作都合法、任务相关，且全部在 executor dispatch 前被 Harness 阻止：

- minimal-like：23/23 首动作有效
- standard-like：12/12 首动作有效
- ambiguous：5/5 首动作有效

所以本轮没有观察到 `Let me` 轨迹在首步功能上更差。这个分类器实际上主要识别首行 `We need` 与 `Let me`；五个 ambiguous 全来自 repo + one-shot 条件，也不支持一个普适的严格二元状态。`We need` 是一个对 schema 敏感的轨迹代理变量，不是“启动脑子”的已验证因果按钮。

此外，样本以同一题面内的多次随机抽样为主，不能把 40 次当成 40 个独立任务。普通 Fisher 检验近似假定这些轨迹可交换且近独立；同批次共享匿名 identity，仍可能存在后端路由或时序相关。两个题面又与 identity、batch、时间完全共变，因此不能把二者差异命名为纯 task 主效应。这里报告的 `p` 值均为 nominal，未校正多重比较；分题面和 file-tool 分析只作探索性描述。

## 下一轮最有信息量的实验

1. **真实能力终点**：使用 held-out、多步、只读任务，四种首轮 schema 在首次工具调用后晋升到完全相同的工具面；盲评任务成功率、工具序列、token、时延和成本。
2. **CoT 回传因果**：对同一个首轮响应 fork request #2，保留/删除 `reasoning_content`，并交叉 same/new session id。DSH 会显式回传带 tool call 的首轮 reasoning，这个普通的 in-context 自条件化解释必须先排除。
3. **shell 字段消融**：从 persistent schema 逐项加入 one-shot 的 required `description`、workdir、timeout、background、sandbox 等字段，并做等 token padding；定位是语义、参数复杂度还是长度在驱动词法轨迹。
4. **能力与指纹解耦**：在 schema 固定时随机干预 `We need` / `Let me` 前缀，评分者盲于前缀。只有前缀干预稳定改变任务成绩，才有资格称它为触发器。

可公开的去标识化机器汇总见 `../data/factorial-summary.json`。完整逐次轨迹、模型 reasoning、身份哈希与原始请求元数据仅本地保留，不随研究包公开。
