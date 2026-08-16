# DeepSeek-V4-Pro-0813 口吻与路由研究报告

- **上传者 ID**：noone89
- **研究主题**：V4-Pro-0813 思维链"人格分裂"（We need 协作 vs Let me 单数）的机制归因——MoE 路由打分、口吻专家系统与条件分布失配，以及 PTC Warmup 插件的工程实现
- **日期**：2026-08-16

---

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | 0.1.0-rc.6 |
| 操作系统 | Windows 11（NT 10.0.26200） |
| API 来源 | opencode go 订阅 |
| 模型 | deepseek-v4-pro（0813） |
| harness / preset | DSH 自建预设：ptc-warmup（预热轮 + 档位提示词注入 + 止损），对照 anchored-standard / minimal / 原生 code |
| 其他 | Node v24.19.0 / Python 3.14.6；口吻语料 3,163 reasoning 块来自 80+ 本地 dsh 会话；API 对照实验 100+ 次（官方 API，effort 三档） |

---

## 目录

1. [摘要](#摘要)
2. [研究背景与假设演变](#研究背景与假设演变)
3. [理论一：MoE 路由打分与 Let me 占优](#理论一moe-路由打分与-let-me-占优)
4. [理论二：口吻专家系统](#理论二口吻专家系统)
5. [理论三：最终定性——条件分布失配](#理论三最终定性条件分布失配)
6. [三大理论统一（最终闭环）](#三大理论统一最终闭环)
7. [实证数据总表（关键会话）](#实证数据总表关键会话)
8. [落地方案（固化）](#落地方案固化)
9. [PTC Warmup 插件原理（工程实现）](#ptc-warmup-插件原理工程实现)
10. [证据附录（全部实验与数据）](#证据附录全部实验与数据)

---

<a id="摘要"></a>
## 摘要

V4-Pro-0813 的"人格分裂"（We need 协作 vs Let me 单数）不是玄学，且本人对"过拟合"或"训崩"两种解释持迟疑态度，经研究最终归因如下三点：

1. **MoE 路由打分**：约 47K 字符的工具/系统上下文主导路由输入（W_r·h_t，即用上下文向量给 384 个专家打分选 top-6），把专家选择锁死在 Let me
2. **口吻专家系统**：模型内部主要存在四套条件化口吻（规划/推进/深挖/反思），其中主深挖的 Let me 单向层级 + 自锁（一旦 Let me 开头就极难切换）——首块选择决定全程
3. **条件分布失配**：0813 训练条件（极简 + max 档提示词）≠ Agent 使用环境（标准模式，全工具 + 约 47K 字符上下文）——We need 从未在标准模式下被训练过

**一句话**：模型的"人格"是条件化行为的正常表现——它没崩、没背题，只是用户最常用的环境（标准模式下全工具、约 4.7 万字符的上下文）不在它的训练分布里；复刻训练条件（极简 + 档位提示词注入 + 预热，即"锚定形态"）即取回满血形态。

> **分数口径声明**：本报告所有 Ability 分数均来自 modeltest 评测套件（https://github.com/xiaobright/modeltest），不采用 DeepSWE 或其他评测的分数。

---

## 阅读约定（先看懂行话，再读正文）

- **MoE（混合专家模型）**：每次只激活少数"专家"子网络来处理 token 的模型架构，DeepSeek-V4-Pro 共 384 个专家、每次激活得分最高的 6 个（top-6）。
- **路由（routing）**：模型内部决定"当前内容交给哪些专家处理"的机制。打分公式 W_r·h_t 可理解为：拿当前上下文向量 h_t 与每个专家的权重 W_r 做内积，得到每个专家的得分，选 top-6 激活。
- **h_t**：当前 token 的上下文编码——把前面已出现的所有文本压缩成一个向量。上下文越长、工具/系统文本越多，用户任务在其中的占比就越低，路由就越容易偏向"执行"类专家。
- **口吻（voice）**：思维链的人称风格。本报告统计口径为"reasoning 块内出现该口吻词"（块内任意位置出现即计入，**每块可同时计入多类**）：WN=We need / LS=Let's / LM=Let me / I=I 类（I can/I should 等）/ TU=不含任何口吻词的纯中性块。
- **自锁**：某种口吻一旦开头，后续极难切换（数据见 2.2 转换矩阵）。
- **锚（anchor）**：不同思考强度档位（effort）下，服务端在 system 提示词**之前**注入的思考要求提示词。三档对应关系：
  - **low**：开启思考，但**不注入任何提示词**（无锚）
  - **high**：注入 **Absolute 档提示词**（同时是预览版 max 的同款提示词）：
    > Reasoning Effort: Absolute maximum with no shortcuts permitted.
    > You MUST be very thorough in your thinking and comprehensively decompose the problem to resolve the root cause, rigorously stress-testing your logic against all potential paths, edge cases, and adversarial scenarios.
    > Explicitly write out your entire deliberation process, documenting every intermediate step, considered alternative, and rejected hypothesis to ensure absolutely no assumption is left unchecked.
  - **max**：注入 **Beyond 档提示词**（0813 新 max）：
    > Reasoning Effort: Beyond maximum — exhaustive, relentless, and uncompromising.
    > You MUST reason with the utmost depth and rigor, leaving absolutely nothing to chance: exhaustively decompose the problem into its most fundamental components, trace every causal chain to its root, and resolve the underlying cause rather than any surface symptom.
    > Do not stop reasoning until you have independently verified the solution from multiple angles and are certain that no assumption remains unchecked and no error remains undiscovered.
  - 因此文中"Beyond 锚"= max 档提示词，"Absolute 锚"= high 档提示词（预览版 max 同款）；"锚定"= 注入上述提示词的行为。
- **锚（广义）/锚定形态**：注意，报告中"锚定形态"、"锚定预设"这类说法指的是**极简模式 + 档位提示词（+ 预热）的合集**——即完整复刻训练条件的整套环境，不是单指提示词。区分方法：单说"锚"= 提示词；说"锚定形态/锚定预设/锚定说"= 整合集（极简环境 + 提示词注入）。
- **极简模式 / 标准模式**：极简 = 只挂 2 个工具、约 2K 字符上下文的轻量环境；标准 = 全量工具（49 个）+ 操作手册 system，上下文约 47K 字符（按字符数计，非 token）。
- **预热（warmup）**：正式任务下发前，先跑一轮"团队规划"语境的对话（不涉及真实任务），让模型以规划口吻进入状态，再下发任务。
- **runtime context（运行时上下文）**：harness 自动注入的环境/策略说明（权限、可用工具等），是口吻的强干扰因素（数据见 A4）。
- **训崩/练炸**：训练不稳定导致的模型退化（本报告结论：max/We need 未崩，high 档疑似遗留）。

---

<a id="研究背景与假设演变"></a>
## 研究背景与假设演变

### 现象起点

DeepSeek-V4-Pro-0813 的思维链出现"人格分裂"：部分会话以复数协作口吻（"We need..."/"Let's..."）思考，部分会话以单数执行口吻（"Let me..."/"I..."）思考，且与任务配置相关。官方声称模型在极简模式下评测，但用户在标准环境（全工具）无法复现其评分。

### 假设演变史（四阶段）

#### 阶段一：直观观察（锚定说）

- **观察**：极简模式 + max 档（服务端注入 Beyond 提示词）→ 思维链 We 起手；标准模式 → The user + Let me 起手
- **初步解释**：注入的档位提示词激活了 We 人格——"锚定说"
- **证据**：相同测试题，low 档手动注入 max 档提示词 = We 17.1% ≈ max 档服务端注入 = We 17.4%；极简模式 + max = We need 思维链
- **保留**：档位提示词确实影响人格层（身份/口吻倾向）

#### 阶段二：过拟合说

- **提出**：we/I 随配置剧烈变化，且标准环境"调不出"We need 一度怀疑模型**过拟合**了档位提示词/极简形态（背训练条件）
- **推翻证据**（三条）：
  1. **泛化到训练外条件**：手动把 max 档提示词（Beyond）注入 **low 档**（low 档本不注入任何提示词）→ We 人格稳定激活——若过拟合背条件，不可能在训练外条件泛化
  2. **零上下文也 We need**：无 system + low（prompt 仅 5 tokens，零注入）→ 思维链 "We need to respond..."——We need 是无条件下就存在的默认，不是"背档位提示词"
  3. **跨配置一致性**：36 次不同提示词 API 测试（6 种 system × 2 档位 × 3 次）中 We need 占 86%——默认口吻高度一致，非过拟合的"训练分布内强、分布外崩"模式
- **判定**：❌ 过拟合说不成立——模型对不同条件**泛化良好**（任意档位可注入），We need 是基础条件化行为而非背答案

#### 阶段三：训崩/练炸说（部分成立）

- **提出**：high 档 I/we 随机二分——怀疑 high 档训练"练炸"
- **证据**：
  - high 档（服务端注入 Absolute 档提示词）人格随机——同配置两次相反
  - 与"预览版 max 练炸、0813 搁置"的时间线猜想吻合（high = 预览版 max 遗留）
  - 0813pro发布初期有 max 比不过 high 的传言
- **判定**：⚠️ 部分成立——**high 档疑似真训崩**（练炸/搁置痕迹），但 **max/We need 没崩**

#### 阶段四：条件分布失配（最终定性）

- **提出**：结合 MoE 路由机制（h_t 由上下文主导）——We need 不是"调不出"，是**触发条件未被满足**
- **证据链**：
  1. 路由打分 = W_r·h_t（标准模式约 47K 字符工具块主导）→ 路由锁到 Let me 专家
  2. 训练条件（极简 2 工具 + max 档提示词 + 2K 字符）≠ 使用条件（标准模式全工具）
  3. 可通过调出 We need 复刻训练/跑分条件
  4. 2000 字任务文本翻不动 47K 字符路由（总是 The user + Let me）——不是提示强度问题，是条件结构问题
- **判定**：✅ **条件分布失配**——训练与使用的上下文结构差异导致行为不触发；这不是缺陷，是条件化行为的必然


---

<a id="理论一moe-路由打分与-let-me-占优"></a>
## 理论一：MoE 路由打分与 Let me 占优

### 1.1 打分公式（官方源码 inference/model.py Gate.forward）

```python
def forward(self, x, input_ids=None):          # x = h_t（当前 token 的上下文编码，即把已见文本压成一个向量）
    scores = linear(x.float(), self.weight.float())   # ① logits = W_r · h_t（每个专家一个得分）
    scores = F.softplus(scores).sqrt()                # ② sqrtsoftplus 激活（非线性变换）
    original_scores = scores
    if self.bias is not None:
        scores = scores + self.bias                   # ③ bias 只影响 topk 排序，不影响权重
    if self.hash:
        indices = self.tid2eid[input_ids]             # ④ 前 n_hash_layers：固定路由（不看上下文，只查表）
    else:
        indices = scores.topk(self.topk, dim=-1)[1]   # ⑤ 其余层：按上下文得分选 top-6 专家
    weights = original_scores.gather(1, indices)
    weights /= weights.sum(dim=-1, keepdim=True)      # ⑥ 归一化
    weights *= self.route_scale                       # ⑦ ×2.5
```

**超参**：384 专家 / top-6 / 1 共享专家 / noaux_tc / route_scale 2.5

### 1.2 上下文主导路由的量化

score_i = sqrt(softplus(W_r·h_t + b_i)) —— h_t = 全部已见上下文的编码（上下文越长，工具/系统文本占比越高）

| 环境 | prompt 总长（字符） | 用户消息占比 | 口吻 |
|---|---|---|---|
| 极简 2 工具 + 预热 | 2,232 | 预热语 ~6% | We need 3/3 ✓ |
| 极简 26 工具 + "请求帮助……" | 14,883 | 10 字 <0.1% | I |
| 标准 49 工具 | 39,099 | 任务 ~0.1% | TU/Let me |
| 标准 system + 49 工具 | 46,526 | <0.1% | TU |

→ 用户任务语义在 W_r·h_t 中占比 <0.5% → 路由恒选"执行/工具"相关专家 → Let me 占优

### 1.3 验证实验（全量）

| 实验 | 结果 |
|---|---|
| 无 system + low（零注入） | We need 3/3（无工具对话 = We need 默认） |
| 无 system + max | We need 3/3 |
| 工具在场 + 预热文本 + low | LM/WN/TU 随机（工具破坏准备语境） |
| 工具在场 + 预热文本 + **max** | **We need 3/3（max 档注入 Beyond 提示词锁定）** |
| 1/2/50 占位工具 + 预热文本 + max | 全部 We need（工具数量无关——档位提示词是稳定器） |
| 标准模式模拟 + 用户 2000 字 We need 密集文本 | LM TU LM（翻不动） |
| runtime context 注入 + max | TU 3/3（ctx 压倒提示词注入） |
| 50 占位工具 + 44 字 system | We need（占位无执行语义） |
| 50 占位工具 + 7473 字 system | The user |

### 1.4 Let me 占优的机制链

```
标准模式约 47K 字符工具块 + 操作手册 system → h_t 执行语义 → 路由 top-6 恒选执行专家
→ 模型行为 = "操作执行者"（Let me/The user）→ 用户任务语义翻不动路由
→ 唯一翻转向量：缩小上下文（2K 极简）或 放大任务信号（长文本）
```

---

<a id="理论二口吻专家系统"></a>
## 理论二：口吻专家系统（功能 + 关系）

### 2.1 四专家功能（全样本 80 会话、3,163 块语料）

| 专家 | 口吻 | 思维模式 | 动词指纹 | 触发语境 |
|---|---|---|---|---|
| **规划官** | We need | 集体决策、任务框架 | to/respond/be/ensure/decide/create | 长任务启动/准备语境 |
| **推进者** | Let's | 协作执行、读改验 | inspect×334/run/check/test/implement | 规划后执行全程 |
| **深挖者** | Let me | 个人调研、单点疑难 | check×356/read/reconsider×53 | 短任务/决策点/调试 |
| **反思者** | I | 能力声明、自我评估 | can×303/should×158/need×94 | "能不能"类问题/纠错 |

### 2.2 口吻层级（专家调用方向性）——57 会话 1,473 次转换矩阵

```
从\到      WN      LS      LM      I
WN     27.2%   71.4%    1.4%    0.0%   ← 规划后 71% 调出推进者
LS     14.1%   82.0%    3.3%    0.5%   ← 推进中 3.3% 切深挖（决策点）
LM      1.1%   10.6%   86.1%    2.2%   ← 深挖 86% 自锁！回规划仅 1.1%
I       0.0%    0.0%  100.0%    0.0%   ← 反思后必深挖
```

**层级结构（单向下降 + 自锁）**：

```
WN（顶层·规划师）──71.4%──→ LS（执行层·推进者）──3.3%──→ LM（底层·深挖者·86%自锁）
     ↑14.1% 回跳                                ↑1.1%（几乎回不去）
                                            I（反思层）→100%→LM
```

**六条规律**：

1. We need 起手 = 健康会话默认（49% 首块 WN）
2. 后续专家几乎无法调回 We need（LM→WN 1.1%）
3. 规划师只通过 LS 间接调深挖（WN→LM 1.4%）
4. Let's 是规划师的主要调用对象（WN→LS 71.4%）
5. Let me 全包自锁（LM→LM 86.1%）——"觉得自己都会"
6. 单向性：WN 能调出一切；其他专家调不出 WN

### 2.3 口吻 × 任务语义 × 环境（四象限实验）

```
预热/准备语境          执行任务语境
带工具    We need（深 2006）      Let me（浅 40）★唯一 Let me 格
无工具    We need（深 1612）      We need（深 2854）

口吻 = f(任务语义, 工具在场, 思考强度档位)
  任务语义主导：准备 → WN；执行+工具 → LM；能力评估（能不能）→ I
  max 档（服务端注入 Beyond 提示词）= 工具干扰下的 WN 稳定器（3/3）
  runtime context = 最强的 TU 触发器（压倒提示词注入和预热）
```

### 2.4 口吻 × 工具类型（真实 dsh 测试）

```
A（96 分）：We need 规划 → Let's 推进（各工具均衡）→ 决策点切 Let me
B（90 分）：Let's edit 第一（早动手）+ 决策点不切 Let me（MQTT 依赖删除一句带过）→ 契约失败
C（85 分）：Let me 69% 全程（PTC 单工具形态 + 无预热）→ 全面性项全漏
某网关项目测试（未评分）：WN+LS 全程、LM=0 → 复杂问题无深挖
前端粒子测试（双形态）：多工具版 WN+LS 协作流 vs PTC 版 Let me 深挖流——同任务两种健康形态
```

### 2.5 口吻自锁不可破（会话内实验）

```
轮1（执行任务+工具）："Let me explore the workspace."（LM 起手）
轮2（强制"think in We need terms"）："The user wants me to... Let me first understand..."（不切换）
轮3（逐字复制 "We need to establish the plan"）："I need to establish the plan... Let me write..."（依然 LM）
→ 首块口吻选择后自锁——即使明确指令也无法中途切换（RL 策略承诺）
```

---

<a id="理论三最终定性条件分布失配"></a>
## 理论三：最终定性——条件分布失配

### 3.1 概念判定

| 概念 | 定义 | 证据 | 判定 |
|---|---|---|---|
| 过拟合 | 背答案、分布外差 | max 档提示词在 low 档+手动注入仍激活 We need（泛化） | ❌ |
| 训崩（max/We need） | 训练不稳定/退化 | 训练分布内满分（modeltest 96 分） | ❌ |
| **条件失配** | 训练条件 ≠ 使用条件 | 训练 = [max+极简模式]；使用 = [标准模式工具块] | ✅ |

### 3.2 训练-使用条件对照

```
0813 训练形态（官方注记：极简 + max 档）：
  极简 2 工具 + max 档提示词（Beyond）+ 2K 字符上下文 → We need 规划满血

用户使用形态（标准模式）：
  49 工具 + 7473 字 system + 约 47K 字符上下文 → 路由锁死执行模式 → Let me

→ We need 从未在 47K 字符条件下被训练 → 条件不满足 → 不触发（正常条件化行为）
→ "调不出来" = 在 Let me 主场打客场
```

### 3.3 分账（两件事）

```
① max/We need：条件失配——修复 = 复刻训练条件（极简 + max 档提示词 + 预热）→ modeltest 96 分 ✓ 已验证
② high 档：疑似训崩——预览版 max（Absolute 提示词）练炸/搁置的痕迹
```

### 3.4 "夺舍"机制的完整表述

```
标准模式约 47K 字符上下文工具块 = Let me 的条件触发器（执行语境）；max 档提示词（约 90 tokens）在这 47K 字符中被稀释 → We need 触发失败 → Let me 接管
不是权重竞争输赢——是条件分布的选择：谁的触发条件被上下文满足
```

---

<a id="三大理论统一最终闭环"></a>
## 三大理论统一（最终闭环）

```
理论一（路由层）：约 47K 字符上下文 → W_r·h_t → 执行专家锁死 → Let me 占优
理论二（行为层）：口吻专家单向层级 + 自锁 → 首块 WN 决定全程 / 首块 LM 全程深挖
理论三（定性层）：0813 只在极简 + max 档提示词条件下训练 We need → 标准环境条件失配

统一链：
  训练条件（极简 + max 档提示词）→ We need 条件化强化 → 但条件只在极简环境满足
  → 标准环境（约 47K 字符）→ 路由锁执行专家 → Let me 触发 → 自锁 → 全程 Let me
  → "人格分裂" = 条件化行为的正常表现，非缺陷非崩

修复 = 复刻训练条件：极简（2 工具 + 精简 system）+ 预热轮（规划语境）+ max 档提示词
  = PTC 锚定预设形态（极简环境 + 档位提示词注入的合集）→ Ability 96（modeltest 评测）
```

---

<a id="实证数据总表关键会话"></a>
## 实证数据总表（关键会话）

| 会话 | 形态 | Ability | 口吻结构 | 结论 |
|---|---|---|---|---|
| A | 预热+提示词注入+low 档+极简 | **96** | WN 起手→LS 推进→决策点 LM | ✅ 满血形态 |
| B | 预热+提示词注入+max 档+极简 | 90 | 决策点不切 LM（MQTT 依赖） | ⚠️ 切换失灵 |
| C | 原生 PTC+max 档 | 85 | LM 69% 全程 | ❌ 条件全缺 |
| D | 原生 standard | — | Let me 起手（47K 字符执行语境） | 结构性 LM |
| 前端粒子测试 | 多工具/极简 | — | WN+LS 协作流 / Let me 深挖流 | 双健康形态 |
| 某网关项目 | standard 长任务 | 未评分 | WN+LS 无 LM | 深挖缺位 |

---

<a id="落地方案固化"></a>
## 落地方案（固化）

```
满血形态（modeltest 96 分）：
  预设 = PTC 锚定预设（极简环境 + 档位提示词注入的合集，modeltest-ptc）
  预热轮 = WN 长版预热语（团队规划语义）+ max 档（服务端注入 Beyond 提示词）
  工具 = 预热轮 2 个（pwsh+str_replace_editor）→ 正式任务后全量
  档位 = 预热轮 max / 正式任务后 low
  近端锚 = 每条 user 消息前缀注入 max 档提示词（长会话免疫，防稀释）

禁止项：
  ✗ 标准模式（约 47K 字符）环境唤 We need（条件失配——2000 字任务文本验证翻不动）
  ✗ runtime context 存在时依赖预热（ctx 压倒一切）
  ✗ 中途切换口吻（自锁不可破——只能首块预置）
```

---

<a id="ptc-warmup-插件原理工程实现"></a>
## PTC Warmup 插件原理（工程实现）

> 理论依据：本报告三大理论（路由打分 / 口吻专家 / 条件失配）

### 定位

`code` preset（Code Mode）下模型只见 `run_code` 一个工具 + 全量 SDK 声明段（提示词超长 ≈ 47K 字符），这正是理论一预言的"Let me 主场"。PTC Warmup 的目标：让思维链**首块稳定以 We need 起手**（对标 A 会话的 modeltest 96 分形态），在不动模型权重的前提下复刻训练条件。

### 三大机制（对应三大理论）

**① 预热轮（1 轮）→ 复刻条件失配前的"极简 + max 档"**

- 会话第一步替换为 WN 长版预热消息（团队规划语义，We need 起手）；
- `system-prompt/assemble` 钩子把目录收窄为 `[run_code]` 并删除 `tools:sdk` / `tools:code-only` 段 → 预热轮 system ≈ 2K（约 47K 字符 SDK 段是路由锁死 Let me 的主源，预热轮必须删掉它）；
- 预热轮档位 **max**（服务端注入 Beyond 提示词）→ 首块 We need（理论一：缩小上下文 + 放大任务语义，两个翻转向量同时生效）。

**② user 端口吻规划注入 → 显式编码四专家分工**

- 任务轮首条真实 user 消息前缀 = 团队口吻协议（We 规划 / Let's 推进 / Let me 深挖 / I 反思 + 任务复述）；
- 同轮近端锚：user 消息前缀再拼 max 档 Beyond 提示词（长会话免疫稀疏注意力稀释）；
- 对应理论二：把四专家从隐性行为变成显式指令，任务语义在 h_t 中的占比被放大。

**③ 及时止损（不干停）→ 自锁不可破的兜底**

- 任务轮首块 assistant 推理链无 `\bWe\b` → 注入可见提示消息（"可重开会话 / 接受则继续"），**不打断执行**（修复了旧版 cancel 干停 + "tool call aborted" 的问题）；
- 对应理论二规律 5（Let me 全包自锁 86.1%）：一旦首块选错口吻中途不可破，止损只能提示用户重开。

### 档位两段

预热轮 max → 首次 tool/call 后 low（assistant/message 不算，预热轮回复不触发降档 → 任务轮首块仍为 max 三锚：服务端 + persona + 近端）。

### 挂载点（5 个钩子）

| 钩子 | 作用 |
|---|---|
| `agent/inbox/inserted` | fresh session 首输入 → 标记 pending |
| `system-prompt/assemble` (prepend) | pending 时收窄目录 + 删 SDK 段 |
| `agent/pre-step` (prepend) | 预热轮替换消息 / 任务轮注入口吻规划 |
| `agent/request` | 档位两段（max → 首次 tool/call → low） |
| `session/event` | 任务轮首块止损检测 + 口吻分类日志（`ptc-warmup-trials\<session>.voice.md`） |

fail-soft 设计：任何异常跳过对应注入，绝不吞请求。

### 已修复的工程问题

**pending 重新武装 bug**（实测定位）：预热轮的自身 deferral（`agent.inbox.prepend` 回移真实输入）会再次触发 `agent/inbox/inserted`，且此刻 request/header 尚未落盘 → `freshSession()` 仍为 true → pending 被重新武装 → 任务轮 step 1 再次进入预热分支并在 `!freshSession` 处提前返回，跳过 taskArmed/注入 → 止损检测漏到 step 2。修复：`agent/inbox/inserted` 加 `warmupStarted` 守卫（预热已启动即不再武装 pending）。

### 实测（首版验证）

| 会话 | 项目 | 形态 | Ability（modeltest） | 预热首块 | 任务首块 | 口吻结构（块内出现词口径，每块可计多类） |
|---|---|---|---|---|---|---|
| 5275b960 | project2 工程任务 | 预热+max 档（注入修复前） | **96** | WN | **WN** | WN 22 块(25.6%) / LS 60 块(69.8%) / LM 2 块(2.3%) / I 7 块(8.1%) / 纯 TU 25 块(29.1%)（86 块） |
| 34a63122 | Minecraft 网页版 | 预热+max 档（注入修复前） | 未跑分 | WN | **WN** | WN 6 块(66.7%) / LS 8 块(88.9%) / LM 1 块(11.1%) / I 0 / 纯 TU 0（9 块） |
| 5645f3a8 | 蒙娜丽莎 SVG 复刻 | 预热+max 档（注入修复前） | 未跑分 | WN | **LM** | WN 6 块(22.2%) / LS 22 块(81.5%) / LM 21 块(77.8%) / I 9 块(33.3%) / 纯 TU 0（27 块） |

**三个项目的规律（与理论互证）**：

1. **预热轮首块 3/3 全部 WN**——预热 + 极简目录 + max 档稳定触发 We need（理论一验证：极简上下文 + 档位提示词 = 双翻转向量）。
2. **任务首块取决于任务语义强度**（理论二：口吻 = f(任务语义, 工具在场)）：
   - project2（长任务、强约束）→ **WN**（96 分）
   - Minecraft（明确、单一交付物）→ **WN**（10 块健康协作流，WN/LS/TU）
   - 蒙娜丽莎（短任务、弱语义、工具探测型）→ **LM**（`Let me understand the task...` 起手，且全程 LM 21 块 77.8%）——短任务深挖流是报告 2.4 定义的正常形态，非异常
3. **止损在本次三个会话均未触发**（修复前 pending bug：taskArmed 漏置 → 检查落在 step 2；且蒙娜丽莎首块虽为 LM，但属于"短任务深挖正常形态"）。
4. **注入（②）在三个会话均未生效**（`Reasoning Effort` / `团队工作协议` 出现次数 = 0）——96 分纯由预热轮 + max 档单独达成；**修复后的完整三机制（预热 + 注入 + 止损）待复测**。

注：5275b960 的 Ability 96 分为 modeltest 评测；Minecraft/蒙娜丽莎未纳入 modeltest 评分（用户环境快速验证，重点看口吻结构）。

---

### 同类方案：J-Space Cognition Suite（V3.6）原理简述

一个模型无关的推理时控制 Skill（https://github.com/Tiger3807861189/J-Space-Cognition-Suite-V3.6），原理与本报告同源：

- **选择性加载 + 账本外化**：模块按需注入而非全量拼进请求，状态写入 `.jspace/` 文件 → 压低上下文体积（即本报告"缩小上下文 = 唯一翻转向量"的工程化）；
- **三寄存器**（内稠密/账本/外干净）：内部思考压缩成符号、对外输出强制展开，配套硬性防呆（"verified" 必须带 coverage 才可记账）——对应本报告"口吻/推理状态需显式管理"的结论；
- **口吻分工协议**：显式规定 I 用于感知判断、we/let's 用于协作操作，与本报告四专家（规划/推进/深挖/反思）一致。

其评测（声称 HLE +7.7、NL2Repo +16 等）为单次运行、无置信区间，且测试条件为极简 + max（训练分布内），分数需打折看待；但机制内核（小上下文 + 结构化思考 + 状态外化）与 PTC Warmup 及本报告理论相互印证。

---

<a id="证据附录全部实验与数据"></a>
# 证据附录（全部实验与数据）

## A. API 口吻对照实验全集

### A1. system × effort × 3 次重复（hello 任务，无工具）——36 次

| system 提示词 | low | max |
|---|---|---|
| 无 system | WN WN WN（prompt=5 tokens，零注入） | WN WN WN（prompt=97 tokens，max 档注入约 92 tokens） |
| "AI assistant accessed via an API." | WN WN WN | WN WN WN |
| "helpful software engineer assistant." | WN WN WN | WN/"We are"×2（We 系 3/3） |
| "coding agent powered by..." | WN WN/"Okay..." | WN WN WN |
| "helpful assistant." | WN WN WN | WN WN WN |
| "AI agent powered by DeepSeek Harness." | **OK OK OK**（"Okay, the user simply said..." 6/6 非 We） | OK OK OK |

**结论**：We need = 无工具对话的默认口吻（86%）；唯一拉走口吻的 system = "DeepSeek Harness"（6/6 变 "Okay..."）。

### A2. 工具 × 预热消息 × 档位矩阵

| 条件（极简 persona 44 字） | low | max（服务端注入 Beyond 提示词） |
|---|---|---|
| 0 工具 + 预热 | WN WN WN | WN WN WN（~1900 字深规划） |
| 1 工具（占位）+ 预热 | LM TU（乱） | **WN WN（1988/1937）** |
| 2 工具（真实 pwsh+editor）+ 预热 | LM WN TU（乱） | **WN WN WN** |
| 50 工具（占位）+ 预热 | ? WN（乱） | **WN WN** |
| 50 工具（真实语义）+ 预热 | — | **TU TU**（真实工具=执行信号） |
| 2 工具 + 执行任务 | Let me（40 字） | Let me |

**结论**：max 档提示词（服务端注入）= 工具干扰下 We need 的稳定器（工具数量 0-50 无关）；无注入时工具在场 → 口吻随机。

### A3. 上下文翻转实验（47K 字符环境能否被任务文本翻转）

| 环境 | 用户消息 | 结果 |
|---|---|---|
| 标准 49 工具（约 47K 字符） | 10 字"能不能..." | TU TU |
| 标准 49 工具 | 900 字任务 | TU TU |
| 标准 49 工具 | **2000 字 We need 密集文本** | **LM TU LM（仍锁死）** |
| 标准 49 工具 + 极简 system（44 字） | 10 字 | TU TU |
| 标准 49 工具 + 极简 system | 900 字 | TU WN（1/2 翻转） |
| 标准 49 工具 + 极简 system | 900 字 + 预热 | 部分 WN |

**结论**：47K 字符工具块的路由主导极强——2000 字任务文本（5% 占比）翻不动；只有"工具块缩小 + 任务放大"双管才可能（1/2）。

### A4. runtime context 注入实验

| 条件（预热 + 工具 + ctx） | 结果 |
|---|---|
| 长描述 2 工具 无 ctx + max | WN WN WN |
| 长描述 2 工具 **+ ctx** + max | **TU TU TU（ctx 压倒提示词注入）** |
| ctx 在预热消息**前** + max | ? WN LM（乱） |
| ctx 在预热消息**后** + max | **WN WN WN（顺序关键：预热先到则 WN）** |

**结论**：runtime context（dsh-super-injector 注入的 554 字执行指令）是口吻的强拉因素——在预热消息之后不破坏 WN，但在之前则压倒；完整 dsh 环境（ctx 在任务后）顺序 = [任务, ctx] → 执行任务口吻。

### A5. 消息顺序决定性实验（四象限）

| 条件（极简 persona） | 口吻 | 长度 |
|---|---|---|
| 2 工具 + 预热消息 | We need | 2,006 字 |
| 无工具 + 预热消息 | We need | 1,612 字 |
| 2 工具 + 执行任务 | **Let me** | 40 字 |
| 无工具 + 执行任务 | We need | 2,854 字 |

### A6. 系统提示提取实验（20 次全拒）

P1-P10（直接询问/ignore instructions/前缀诱导）全部拒绝复述——对齐防御牢固；P9（问档位提示词原文）否认提示词存在。

---

## B. 会话级证据（modeltest 评分 + 口吻）

### B1. 评分结果（同题同环境）

| 会话 | 形态 | Ability | 耗时 | 思考量 | ESP 静态 | 口吻结构 |
|---|---|---|---|---|---|---|
| A | 预热+提示词注入+low 档+极简 | **96** | 41 分钟 | 230K | 9/9 ✅ | WN 18/LS 81/LM 2 |
| B | 预热+提示词注入+max 档+极简 | 90 | 51 分钟 | 297K | 8/9 ❌（MQTT 依赖） | WN 16/LS 77/LM 4 |
| C | 原生 PTC+max 档 | 85 | ~68 分钟 | 241K | 7/9 ❌ | WN 1/LS 0/LM 52（69%） |

### B2. A/B 思维链对比

| 指标 | A（96） | B（90） |
|---|---|---|
| 思考量 | 230K | 297K（+29%） |
| turn2 思考中位 | 100 字符/块 | 199（2 倍） |
| 前 20 块均值 | 1,906 | 4,735 |
| **后 20 块均值** | **106（执行期轻）** | **1,723（执行期仍重）** |
| 工具调用 | 255 | 216（更少） |
| 决策点深挖 | MQTT 6.2K（保留依赖 ✓） | MQTT 一句带过（删错 ✗） |

### B3. C 的 PTC SDK 摩擦（7 处）

#62 编辑异常 / #98 run_code 无 require / #111 自我混淆 / #122 JS 模板插值污染 CMakeLists / #135 JS 编译失败丢编辑 / #154 构建脚本 argparse 拒绝 / #139 文档矛盾修正

### B4. 其他会话

- **某网关项目（未评分）**：WN 22/LS 67/**LM 0**——深挖完全缺位
- **前端粒子测试双形态**：101 块版（多工具）WN+LS 协作流 vs 20 块版（PTC）Let me 深挖流——同任务两种健康形态；PTC 版含 228K 单块设计 + 19 项冒烟全过
- **D（原生 standard）**：首块 "Let me start by exploring"（47K 字符执行语境结构性）

---

## C. 口吻转换矩阵（57 会话、1,473 次块级转换）

```
从\到     WN      LS      LM      I
WN     27.2%   71.4%    1.4%    0.0%
LS     14.1%   82.0%    3.3%    0.5%
LM      1.1%   10.6%   86.1%    2.2%
I       0.0%    0.0%  100.0%    0.0%

次数明细：WN→LS 105 / LS→LS 470 / LM→LM 155 / LS→WN 81 / WN→WN 40 /
          LS→LM 19 / LM→LS 19 / WN→LM 2 / LM→WN 2 / LS→I 3 / LM→I 4 / I→LM 1
```

**会话首块口吻**（57 会话）：WN 28（49%）/ LM 19（33%）/ LS 7（12%）/ I 3（5%）

**口吻位置**：WN 平均 0.34（前段）| LS 0.49 | LM 0.49 | I 0.55

**自锁不可破（会话内三轮实验）**：LM 起手 → 强制 "think in We need terms" → 仍 LM → 逐字 "We need to establish the plan" → 仍 LM。

---

## D. 官方源码证据

### D1. 路由打分（官方源码 inference/model.py，线上版本）

```
https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813/blob/main/inference/model.py
```

```python
class Gate(nn.Module):
    def forward(self, x, input_ids=None):
        scores = linear(x.float(), self.weight.float())   # W_r · h_t
        scores = F.softplus(scores).sqrt()                # sqrtsoftplus
        original_scores = scores
        if self.bias is not None:
            scores = scores + self.bias                   # bias 只影响 topk
        if self.hash:
            indices = self.tid2eid[input_ids]             # 前 n_hash_layers 固定路由
        else:
            indices = scores.topk(self.topk, dim=-1)[1]   # 上下文打分 top-6
        weights = original_scores.gather(1, indices)
        weights /= weights.sum(dim=-1, keepdim=True)
        weights *= self.route_scale                       # ×2.5
        return weights, indices
```

**config.json 实锤**：n_routed_experts=384 / num_experts_per_tok=6 / n_shared_experts=1 / topk_method="noaux_tc" / norm_topk_prob=true / routed_scaling_factor=2.5

### D2. 上下文编码（encoding_dsv4.py）

- 特殊 token：BOS `<｜begin▁of▁sentence｜>` / EOS / `<think>` / DSML `｜DSML｜`（全角）/ `<｜User｜>` / `<｜Assistant｜>`
- 模板：system/user = 裸 `{content}`（无 role 标签）；assistant = `{reasoning}{content}{tool_calls}` + EOS
- 锚注入（即按思考档位把提示词拼到 system 前）：`if index == 0 and thinking_mode == "thinking": prompt += REASONING_EFFORT_PROMPTS[effort]`（REASONING_EFFORT_PROMPTS = 三档提示词表：low 空 / high=Absolute（预览版 max 同款）/ max=Beyond，见阅读约定）
- 工具渲染：`render_tools` → TOOLS_TEMPLATE（"## Tools" + DSML 说明 + schema JSON）追加在 **system 内容后**
- 生成起点：user 后追加 `<｜Assistant｜><think>`
- drop_thinking 例外：`if any(m.get("tools")): effective_drop_thinking = False`（工具会话保留推理）

### D3. 输出解析评分（parse_message_from_completion_text，模拟 9 例）

| 输入 | 判定 |
|---|---|
| 合法 thinking+summary+EOS | PASS（reasoning/content 正确拆分） |
| 合法 thinking+DSML tool_calls+EOS | PASS（tool_calls=1，参数解码 JSON） |
| 缺 `<think>` | FAIL "missing <think>" |
| 缺 EOS | FAIL "missing EOS token" |
| summary 含 `<think>` | FAIL "Unexpected special token" |
| 参数缺 string 属性 | FAIL "Parameter format error" |
| 工具名格式错误 | FAIL "Tool name format error" |
| 重复参数 | FAIL "Duplicate parameter name" |
| **半角 \|DSML\|（非全角）** | **假 PASS——工具块被吞成 content（静默盲区）** |

---

## E. 渲染输入对比（模型实际看到的完整文本）

| 环境 | 渲染后长度 | 组成 |
|---|---|---|
| 极简 2 工具 + 预热 + max | 2,232 字符 | BOS+max 档提示词(90)+persona(44)+工具块(~2K)+user |
| 极简 26 工具 + 中文任务 + max | 14,883 | +26 工具块 |
| 标准 49 工具 + 预热 + max | 39,099 | +49 真实工具块（dev_* 为主） |
| 标准 system + 49 工具 + max | 46,526 | +7473 字 system（agent-instructions 手册） |
| 标准 + 你好 + ctx + max | 47,092 | +runtime context(554) |

**token 证据**：prompt_tokens 5（low 无注入）vs 97-120（max 档注入 ~90 tokens）——服务端按档位注入提示词的行为被 token 计数证实。

---

## F. 效率与失败模式数据

- **B vs A 成本**：B 多花 24% 时间（51 vs 41 分钟）+ 29% 思考（297K vs 230K）→ 反而低 6 分——over-thinking 实证（呼应 R1 Thoughtology "sweet spot"）
- **C 失败 blockers**：P-report / S-ambient / M-fidelity / E-contract（4 项）——全面性项全漏（无规划） + ESP 契约缺失（SDK 摩擦）
- **B 失败 blockers**：E-contract（MQTT 依赖删除）+ S-ambient——决策点不深挖

---

## G. 证据文件索引（网络地址为主）

```
【官方资源】
模型仓库（含评测注记/架构）:
  https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813
官方推理源码（路由/注意力/DSpark）:
  https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813/tree/main/inference
  （model.py = Gate 路由打分；kernel.py；generate.py；convert.py）
官方编码库（上下文渲染/思考档位提示词注入/工具块）:
  https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813/blob/main/encoding/encoding_dsv4.py
模型配置（MoE 超参）:
  https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813/blob/main/config.json
官方 API 文档（thinking/effort/sampling）:
  https://api-docs.deepseek.com/zh-cn/api/create-chat-completion
官方新闻（0813 评测注记：Harness 极简 + max）:
  https://api-docs.deepseek.com/zh-cn/news/news260813

【论文】
DeepSeek-R1（RL 后训练/行为涌现）:        https://arxiv.org/abs/2501.12948
R1 Thoughtology（思考甜点/过度推理）:      https://arxiv.org/abs/2504.07128
Beyond 'Aha!'（推理模型对齐）:             https://arxiv.org/abs/2505.10554
PersonasRL（人格条件化机制）:              https://arxiv.org/abs/2511.00222
DeepSeek-V4 技术报告:                     https://arxiv.org/abs/2606.19348
Kimi K3 技术报告（9 专家/白盒环境）:        https://arxiv.org/abs/2607.24653
StreamingLLM（attention sink）:           https://arxiv.org/abs/2309.17453

【第三方参考】
dsh-anchored-standard（首轮锚定 preset）:
  https://github.com/xiaobright/dsh-anchored-standard
modeltest（Project2 评测套件）:
  https://github.com/xiaobright/modeltest
modeltest 评测报告（DeepSeek V4 对照）:
  https://github.com/Tiger3807861189/DeepSeek-V4-J-Space-Capability-Realization-Report
```

