# V4 Pro Request #2 Reasoning × Session Pilot（2026-08-16）

## 结论摘要

四格真实官方 API protocol pilot 全部通过：

| request #2 treatment | HTTP / finish | 预注册 JSON | request #2 reasoning tokens |
|---|---|---:|---:|
| drop reasoning + new session | 200 / stop | 正确 | 51 |
| retain reasoning + same session | 200 / stop | 正确 | 34 |
| retain reasoning + new session | 200 / stop | 正确 | 0 |
| drop reasoning + same session | 200 / stop | 正确 | 32 |

这能排除一个过强说法：**在本 fixture 中，删掉首轮 `reasoning_content` 并不会被 DeepSeek API 协议必然拒绝，也不会让这个简单答案立刻失败。**

它不能证明 reasoning passback 或 session header 对复杂 agent 任务没有影响。每格只有一个独立 source，且目标答案很简单，四格均处于正确率天花板；本轮是协议与实验路径 pilot，不是效应量检验。按冻结规则，`--pilot-only` 后主样本为 0，没有看结果后自动扩跑。

## 设计

- exact 官方 Minimal system：`You are a helpful software engineer assistant.`，SHA-256 `5fab6e32...`
- exact persistent `bash` schema：`fd7afc1c...`
- exact `str_replace_editor` schema：`0948b708...`
- surface 来自 `deepseek-harness@47f943859bef...` 的 macOS arm64 真实 mount；fixture 在读取 key 前校验完整 surface lock
- 四个 treatment 各使用独立 request #1 source session；每个 source 只发送一个 live request #2
- new-session 每次使用从未出现过的新 id；anonymous user id 固定
- request #1 必须产生非空 reasoning、合法 tool call，并以 `tool_calls` 结束
- 不执行模型生成的命令；按 call id 注入预先冻结的安全 tool-result fixture
- 每个 live request #2 发送前，四个变体均通过官方 adapter 的 no-network serializer conformance；实际 body 再与 assigned preflight 做字节级比较
- protocol success 与 exact-JSON correctness 分开；`We need / Let me` 仅作诊断

四个 source 的 conformance 检查和 tool-call/result pairing 全部通过。输出 artifact 权限为 `0600`，未保存 raw request body、Authorization、key、原始 user/session id；工作区通用 key 模式扫描无命中。

## 有意思的轨迹现象

四个 request #1 都以 `We need` 开头，reasoning tokens 分别为 55、61、62、8；其中三个选择 `bash`，一个选择 `str_replace_editor`。同一个词法前缀已经覆盖 8–62 token 的连续范围，不像一个固定“长思考态”。

四个 request #2 都没有以 `We need` 或 `Let me` 开头，却全部给出正确 JSON；其中 retain + new 甚至没有可见 reasoning token。这个小样本再次说明：词法指纹强烈依赖当前 step/任务形态，不能当作普适的“脑子在线”判据。

## 为什么暂不直接跑主样本

当前任务只要求从固定工具结果复制两个字段，区分度不足；把它扩到每格 10 次大概率只会更精确地测出四格都接近天花板。更有信息量的正式任务应让 request #2 选择正确的第二个工具与参数，或完成带干扰项的多约束合成，并预注册工具行为/答案评分。

正式效应实验建议：

1. 两个 held-out 合成任务族，各 treatment 至少 `n=5`，合计 `n=10/cell`。
2. request #2 的主要终点为正确第二工具/参数或严格 JSON，不以词法分类为主。
3. 继续保持每个 source 只 live 发送一个 treatment，避免 stateful session 的分支顺序污染。
4. 对 header 机制最多解释为“session header 连续性的总效应”；即便显著，也不能区分 sticky routing、缓存、A/B cohort 或隐藏状态。

可公开的四格去标识化汇总见 `../data/request2-pilot-summary.json`。完整 reasoning、请求体、header/身份哈希与 tool-call id 仅本地保留。
