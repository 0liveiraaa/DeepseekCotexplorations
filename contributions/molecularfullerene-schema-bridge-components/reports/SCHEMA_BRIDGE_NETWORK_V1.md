# V4 Pro Schema Bridge Description × Parameters 消融

状态：完成预注册执行，并由冻结 strict scorer 机械验证。

本轮使用真实 DSH agent loop，始终注册同一个 official persistent `bash` executor，
只替换模型可见的 `bash.description` 与 `bash.parameters`。`str_replace_editor`、
Minimal system prompt、工具顺序、reasoning effort 和执行器均保持不变。所有 arm 都在
第一条 assistant response 后停止，并由 guard 与 execute tripwire 双重禁止工具执行。

## 设计

- 1 个四臂 protocol pilot；词法标签不参与 pilot 的 go/no-go；
- 10 个冻结公开只读提示；
- 4 个固定 runtime identity；
- `10 prompts × 4 identities × 4 arms = 160` 条主轨迹；
- 每个 `identity × prompt` 构成连续四臂 block；每个提示内使用 Latin
  随机化，使每个 arm 在四个位置各出现一次；
- 主要终点：社区既有分类器的 `minimal-like` 首响应词法标签；
- 主要对比：description `D`、parameters `Q` 与 interaction `I`；三项使用 Holm
  控制 familywise alpha 0.05。

`P` 表示 persistent schema bundle，`O` 表示 one-shot bundle；字母顺序为
`description × parameters`。

## 四臂结果

| Arm | Minimal-like | Standard-like | Ambiguous | Minimal-like rate |
|---|---:|---:|---:|---:|
| `PP` | 26/40 | 2/40 | 12/40 | 65.0% |
| `PO` | 21/40 | 1/40 | 18/40 | 52.5% |
| `OP` | 14/40 | 3/40 | 23/40 | 35.0% |
| `OO` | 9/40 | 1/40 | 30/40 | 22.5% |
| **合计** | **70/160** | **7/160** | **83/160** | **43.75%** |

## 预注册统计结果

| Contrast | Estimate | 双侧 Latin randomization p | Holm-adjusted p | FWER .05 |
|---|---:|---:|---:|:---:|
| `D = 0.5 × ((OP+OO)−(PP+PO))` | −0.300 | 0.000110 | 0.000330 | reject |
| `Q = 0.5 × ((PO+OO)−(PP+OP))` | −0.125 | 0.159868 | 0.319737 | do not reject |
| `I = OO−OP−PO+PP` | 0.000 | 1.000000 | 1.000000 | do not reject |

任务簇 bootstrap 的 95% 描述性区间为：`D [-0.4128,-0.1750]`、
`Q [-0.2250,-0.0250]`、`I [-0.1750,0.2000]`。这些区间按预注册只作描述。
尤其是，Q 的描述性区间没有跨 0，不能覆盖它的随机化检验和 Holm 校正结果；本轮
**没有**获得 parameters 主效应的确认性证据。

family 外的 secondary `OP−PO` 为 `−0.175`，双侧随机化 `p=0.150818`，同样不能
宣称差异成立。

## 协议完整性

- 164/164 observation 被接受：4 pilot + 160 main；
- 164 个 logical model request header 和 164 条 assistant response；
- 0 retry、0 executor dispatch、0 failed-unit replacement；
- 全部 160 条主轨迹至少调用了一个已声明工具；工具名和参数均通过当前可见 schema
  校验；
- 正式 summary 重新验证 oracle、prompt set、classifier、seed-derived allocation、
  schema hash 与 artifact 内部一致性。

公开 summary 内的 raw artifact digest 仅证明内部字段可对账，不是 DeepSeek 或其他
provider 的签名，也不能独立证明供应商侧真实性。

## 可以推出什么

相较早期 shell × file 2×2，本轮固定真实 executor 和第二工具，把 shell bundle
进一步拆成 description 与 parameters。结果把主要观测关联收窄到模型可见的
description bundle：从 persistent description 换成 one-shot description，与
minimal-like 率平均降低 30 个百分点相关，并通过预注册多重校正。

这说明在本次配置中，tool schema 的 description bundle 操作显著改变了该模型的
首响应词法终点。它也比“工具越少越好”更具体，因为四臂始终只有同样两个工具。

## 不能推出什么

- 主要终点是词法轨迹标签，不是任务成功、代码质量或 Project2 分数；
- executor 从未 dispatch，因此不是 executor persistence 的能力效果；
- description 因子仍是一整套文本，不是单词级或纯 token-length 因果定位；
- 83/160 为 ambiguous，不支持把行为描述成普适、严格的两个人格或两个吸引子；
- 只有 10 个有效提示簇；160 条采样不是 160 个独立任务；
- 模型名是 mutable service alias，账户、cohort、server shard 与时间未随机化，不能把
  结果归因到不可变模型权重；
- Harness Git commit 没有 attestation 被忽略的生成 `lib/` / `node_modules` bytes。

## 公开材料

- 本目录机器汇总：
  [`../data/schema-bridge-network-v1-summary.json`](../data/schema-bridge-network-v1-summary.json)
- 上游完整结果说明：
  [Network-v1 results](https://github.com/MolecularFullerene/deepseek-v4-pro-harness-ablation/blob/53cd4661e63dc6d9420559806c0a53e096e7fadc/experiments/schema-bridge-live/results/network-v1/RESULTS.md)
- 正式预注册：
  [`PREREGISTRATION.md`](https://github.com/MolecularFullerene/deepseek-v4-pro-harness-ablation/blob/e97670b0a875026d091b9658ced1bd4fa08d25d0/experiments/schema-bridge-live/PREREGISTRATION.md)

本贡献只复制 strict scorer 的 allowlisted summary，不包含 raw trajectory、原始模型文本、
真实运行标识或私有 artifact。公开标签矩阵的 design ordinals 可由 analysis seed
重建，因此“去标识化”不代表密码学匿名化。
