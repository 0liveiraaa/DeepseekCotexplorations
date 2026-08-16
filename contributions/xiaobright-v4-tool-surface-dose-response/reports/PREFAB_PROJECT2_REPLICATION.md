# Prefab Anchored Standard：Project2 复现与通用化边界

## 结论

Anchored Standard 系列在同一 Project2 V4.1b 题目上得到三次 V4 Pro 分数：
**98、99、99**，均值 **98.67**。最后一次评审为 **99/99/A**，能力检查
**44/45**（仅缺 F12-04 家族语义），ESP 检查 **9/9**，ESP-IDF build passed。

这组结果说明锚定方案在该题上不是单次抽卡。但三轮不是完全相同的独立重复：前两轮使用
较早的 Anchored Standard 预填充版本，第三轮使用 Project2 派生 prefab，并包含 turn
游标与 durable 工具解锁修复。因此应称为“同一方案家族的复现”，不能据此宣称对任意任务
都有 98.67 的期望分数。

## 三轮口径

| 轮次 | 分数 | 预填充实现 | 备注 |
|---|---:|---|---|
| r1 | 98 | earlier Anchored Standard prefill | 完整 Project2 评测 |
| r2 | 99 | earlier Anchored Standard prefill | 完整 Project2 评测 |
| r3 | 99 | Project2-derived prefab | 99/99/A；44/45；ESP 9/9；build passed |

第三轮最终 DSH 会话的可核验运行特征：prefab 占用 turn 1/2，第一条真实任务从 turn 3
开始；首个真实请求头包含 13 个工具；任务阶段记录 203 次工具调用，没有 turn error。

## Project2 专用模板暴露的问题

最初的模板把 Project2 目录和 README 观察固化进 warm-up 历史，不适合直接作为通用模板。
原始轨迹还包含两次失败的 `str_replace_editor` AGENTS.md 读取，durable unlock 只覆盖
`web_search` 与 `todo_write`。另一个运行时问题是 Harness 的 `ReactLoopAgent` 在构造时
缓存最后 turn；preset 选择后原位追加两轮历史不会自动更新该游标，导致真实任务可能再次
从 turn 1 开始。

最终 prefab seeder 做了三类修复：

- 从回放历史删除失败的 instruction-file 调用、错误结果及对应 assistant tool-call block；
- 把 durable unlock 重写为 `read`、`write`、`edit`、`glob`、`grep`、
  `ask_user_question`、`todo_write`、`web_search`；
- 通过 host `agents` registry 定位 live Agent，在写入两轮后同步 turn 游标到 2。

Project2 模板因此保留为插件仓库中的显式 opt-in 复现资产，不作为默认安装。

## 通用模板 v2

默认通用模板在中性工作区 roll，只有两轮、四次工具调用：一次 `bash` 读取 AGENTS.md、
一次 durable unlock、两次 `skill_search`。离线检查得到：

- 3 个实际会进入后续 API thinking passback 的 tool-call reasoning 节点；
- `let me` / 第一人称 `I` 命中为 0，失败工具调用为 0；
- 不包含 Project2、README、目录扫描或源码观察；
- 水合时动态读取 `$DSH_HOME/AGENTS.md`，再读取工作区根 `AGENTS.md`；内容相同只注入
  一次，两者都不存在时使用中性说明；
- 为真实任务轮 durable unlock 上述八个常用工具。

该模板只完成了结构、工具流和轨迹风格验证。API 涨价前没有再跑一次完整 Project2，
所以 **98/99/99 不能归因于通用模板**。这是发布时必须保留的限制。

## 为什么不是简单增加更多锚点

Harness 的 thinking passback 只会把带 tool call 的 assistant reasoning 带进后续请求；
纯文本轮的 reasoning 不会进入下一次 API 上下文。因此日志中的 reasoning 块数量不等于
有效锚点数量。

实验可以 roll 出至少 5 个有效 tool-call reasoning 节点，但轨迹出现
`The user...` / `I...` 风格漂移。最终选择 3 个有效节点的通用 v2，而没有人工拼接或
改写模型 reasoning。这体现了锚点数量与轨迹纯度之间的实际取舍。

## 发布资产

- 默认通用模板：`dsh-anchored-standard/prefab/template.jsonl`
- Project2 专用模板：`dsh-anchored-standard/prefab/templates/project2-benchmark.jsonl`
- 安装器默认 `generic`；只有显式 `--template project2` 才安装专用版，并使用独立 preset id。

## 后续发展方向

当前 `context-gate` 已经证明可以在 Harness 的两条统一上下文路径上拦截自动注入，并能按
durable event 在 compaction 边界重新关门，也可以选择是否覆盖 subagent。但它目前只做
上下文门控，不会为新 epoch 或子 agent 合成一段新的 prefab 轨迹。

一个值得继续验证的方向，是复用这套统一拦截点，把“轨迹建立”扩展到两个生命周期：

- **上下文压缩后**：在模型摘要结束、下一次真实请求前注入经过审查的短锚定轨迹，随后
  再恢复常规上下文，测试长会话是否能稳定重锚；
- **subagent 创建时**：在子 agent 的首次任务请求前注入独立的通用 warm-up，而不是让
  父模型生成的自指式委派提示直接决定其首条 reasoning 风格。

实现上应从 session/agent 生命周期事件生成持久状态，保持重启、resume 和重复事件安全；
同时要为主会话、压缩 epoch、每个 subagent 分别维护游标，避免重放到错误会话。评测必须
单独报告工具可用性、任务成功率和 token 成本，不能只看 `We need` / `Let me` 词法标签。
这只是尚未实现、也未付费实测的研究建议。

完整原始会话与逐 token reasoning 不在本贡献中发布。本报告记录可复核的聚合事实和实现
边界，不把词法风格本身当作能力因果证明。
