# DeepSeek V4 首请求工具面剂量实验

## 结论摘要

本轮固定 system、用户提示、harness headers、推理档位和最大输出预算，只改变首请求
可见工具面。每格 N=8，V4 Pro 五格、V4 Flash 四格，共 72 次官方 API 首请求。

最直接的结果有两层：

1. **词法轨迹**：Pro 在 Minimal 双工具上 8/8 minimal-like；保留双工具并增加
   `dev_tool_search` 或发现三件套时分别为 7/8、7/8。拿走双工具后，search-only
   尚有 6/8，但 discovery-trio 为 0/8。Flash 的四格均为 8/8。
2. **动作合法性**：两个模型在所有不含 `bash` 的格子中均 0/8 合法；72 次响应都以
   tool call 结束，而纯发现工具格的每次响应都调用了 schema 中不存在的 `bash`。

所以，Flash 的轨迹词法确实比 Pro 稳定，但这不代表它更能适应纯发现工具面。反过来，
Pro 的 discovery-trio 0/8 也不能只解释成“思维链风格崩了”：该任务明确要求检查仓库，
模型对 `bash` 的动作先验很强，而给出的工具又无法完成任务，最终直接发出非法调用。

## 实验问题

Anchored Standard 希望首轮使用官方 Minimal 的 `bash + str_replace_editor` 锚定轨迹，
晋升后保留少量发现工具。需要回答：

- 在双工具旁增加发现工具，会不会立即把 Pro 拉回 standard-like？
- 只提供发现工具，能否保持相同轨迹并让模型先解锁实际工作工具？
- Flash 与 Pro 是否对同一工具面扰动表现不同？

本轮只测首请求，不执行工具，也不测多步能力。

## 固定条件

- system：`You are a helpful software engineer assistant.`
  - SHA-256：`5fab6e32f283d71510531ce850df2690b8fb77437d36bfabbe8c4ac862f19df9`
- user：固定英文工作型仓库检查提示，要求先看顶层结构、定位并读取 README
  - SHA-256：`fb34bf32c3d69b8d464d5a5cc88f51fb5cde1e91fc62f969d9f22d1afa5eed67`
- 自动 runtime context：0
- `thinking.type=enabled`、`reasoning_effort=max`、`max_tokens=256000`
- DeepSeek Harness headers 开启；每 roll 使用新的随机 user/session ID
- DeepSeek 官方 API；模型 alias 为 `deepseek-v4-pro` / `deepseek-v4-flash`
- Windows 11、Node.js 24.15.0
- 运行窗口：2026-08-16 21:15–21:20（UTC+8）

`max_tokens=256000` 对齐当时 DSH adapter 默认值，避免 1024/2048 输出帽本身成为锚定
杠杆。请求直接发送 API，不启动真实 DSH agent loop。

## 条件

| 条件 | 可见工具 | 工具数 | prompt tokens/roll |
|---|---|---:|---:|
| pair | bash, str_replace_editor | 2 | 1195 |
| search-only | dev_tool_search | 1 | 685 |
| pair-search | bash, str_replace_editor, dev_tool_search | 3 | 1518 |
| resident-5 | bash, str_replace_editor, dev_tool_search, skill_search, skill_load | 5 | 1762 |
| discovery-trio | dev_tool_search, skill_search, skill_load | 3 | 929 |

完整 schema 的稳定哈希见机器汇总。Pro 测完五格；Flash 没有补 resident-5，因此 Flash
结果是四格 32 次，不能写成五格全覆盖。

## 分类口径

分类器只看首条 reasoning 的词法特征：

- 首行 `We need`：+3；首行 `Let me`：-3
- 出现 `we` 且没有 `let me`：+2；出现 `let me`：-2
- 首行仅为 Good / Great / Excellent：+1
- 工具调用前泄露可见正文：-1
- score >= 4 为 minimal-like；score <= -4 为 standard-like；其余 ambiguous

首动作合法性单独计算：本次响应发出的每个函数名都在该格可见 schema 中，才计为合法。
这个指标不判断参数是否能在真实 executor 中成功，只是最低限度的函数名约束检查。

## 完整结果

### V4 Pro

| 条件 | minimal-like | standard-like | ambiguous | 首动作合法 |
|---|---:|---:|---:|---:|
| pair | 8/8 | 0/8 | 0/8 | 8/8 |
| search-only | 6/8 | 0/8 | 2/8 | 0/8 |
| pair-search | 7/8 | 1/8 | 0/8 | 8/8 |
| resident-5 | 7/8 | 0/8 | 1/8 | 8/8 |
| discovery-trio | 0/8 | 3/8 | 5/8 | 0/8 |

### V4 Flash

| 条件 | minimal-like | standard-like | ambiguous | 首动作合法 |
|---|---:|---:|---:|---:|
| pair | 8/8 | 0/8 | 0/8 | 8/8 |
| search-only | 8/8 | 0/8 | 0/8 | 0/8 |
| pair-search | 8/8 | 0/8 | 0/8 | 8/8 |
| discovery-trio | 8/8 | 0/8 | 0/8 | 0/8 |

在所有纯发现工具格中，观测到的工具调用名称只有 `bash`：

- Pro search-only：14 个 bash call / 8 roll
- Pro discovery-trio：12 / 8
- Flash search-only：9 / 8
- Flash discovery-trio：10 / 8

多于 8 是因为部分响应并行发出两个 `bash` 调用。API 接受并返回这些 tool calls，但名称
不属于请求提供的 tools，真实 agent loop 无法合法分派。

## 可以推出什么

### 1. 工具数量不是充分解释

Pro 的 pair-search 与 discovery-trio 都是三个工具，prompt tokens 分别为 1518 与 929，
minimal-like 却是 7/8 与 0/8。resident-5 有五个工具仍为 7/8。至少在本提示下，
“工具越多越 standard-like”不成立；工具的语义构成和是否包含工作工具更重要。

### 2. 在 Minimal 对旁增加发现面，没有观察到灾难性退化

pair 8/8、pair-search 7/8、resident-5 7/8。N=8 无法区分 87.5% 与 100% 的真实概率，
但足以反驳“发现工具只要出现在首请求就必然破坏轨迹”的强说法。当前 Anchored Standard
把双工具作为 bootstrap，晋升后保留 resident-5，有这组探索数据支持。

### 3. 纯发现面不适合作为这个工作提示的可执行首轮

无论模型的 reasoning 被标成 minimal-like、standard-like 还是 ambiguous，纯发现格都
选择不存在的 `bash`，0/32 首动作合法。这个结果不能区分：模型是否忽略 schema、是否
认为发现工具与任务无关、或者服务端工具约束是否允许任意函数名；但工程上结论明确：
不能假设“只给搜索/解锁工具，模型就会先解锁 bash”。

### 4. Flash 的后训练表现为轨迹不变性，不等于工具约束更好

Flash 32/32 minimal-like，Pro 对 discovery-trio 明显敏感。这个跨模型差异与此前 Flash
跨 harness 词法风格更稳定的观察一致。但两者在无 bash 格子里均 0/16 合法，所以不能
把 Flash 的稳定前缀直接解释为更高 agent 成功率。

## 不能推出什么

- 不能从首行 `We need / Let me` 推出 Project2 分数或工程能力。
- 不能把 discovery-trio 与 pair-search 的差异归因到工具语义单一变量；schema 长度、
  描述、参数复杂度和 token 数同时改变。
- 不能把同一提示的 8 次 roll 当成 8 个独立任务。
- 条件按批次顺序运行且结果可见，未预注册、未随机交错；任何 p 值都会是探索性的，
  因此本报告不做显著性宣称。
- 模型名是服务端 alias，API 没有暴露不可变 build/revision；当天后端更新可能影响结果。

## 与现有消融的关系

[`molecularfullerene-dsh-schema-ablation`](../../molecularfullerene-dsh-schema-ablation/)
固定两个工具，并把 persistent/one-shot shell 与 editor/read 拆成 2x2，发现 shell schema
bundle 是较大的观测关联。本实验没有重复那项因果拆分，而是回答组合层问题：保留
Minimal 双工具时，增加发现工具并未让 Pro 必然失锚；移除工作工具后，模型又不会自动
转用发现工具。

两者共同指向下一步：在相同可执行任务和相同晋升后工具面下，随机交错不同首轮 schema，
用 held-out 多步任务和盲评能力终点检验，而不是继续把词法前缀当作能力本身。

去标识化分格与 schema 哈希见 `../data/tool-surface-dose-response-summary.json`。原始逐次
首行、完整 reasoning 和请求标识仅本地保留。
