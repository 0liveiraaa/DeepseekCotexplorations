# Prefab 模板的"回传锚定质量块"量化与单请求首句探针（涨价约束下的低成本方法论）

- **上传者 ID**：xiaobright
- **研究主题**：Prefab（预制会话）模板的锚定贡献如何量化（回传锚定质量块 anchor mass）、涨价约束下如何用单请求探针评估模板/克隆稳定性，以及一次模板 A/B 晋升决策的完整记录
- **日期**：2026-08-17

## 结果摘要

**机制（离线确认，零 API 成本）**：harness 回放规则为——assistant 消息含工具调用则其
reasoning_content 回传给后续请求，纯文本消息的 reasoning 丢弃。因此预制模板对克隆会话的
锚定贡献 = **回传切片上的 reasoning 字符总量（anchor mass）**，而非模板总步数或总长度。
推论：模板清洗（剔除失败调用）会连带丢失回传资格——project2 模板原始 5,178 字符/7 步，
清洗后只剩 3,533/7；shipped 通用模板为 1,096/3。

**分类器修正**：此前 roll 分类器把 "The user..." 开头的首行一票否决为锚定失败，但对照
request-2 轮形依赖结论，"The user wants/asks..." 是跟进轮的自然叙述声——已发布模板本身
也过不了旧规则（2 处触发）。修正后：硬失败只保留 let-me（全文任意处 + 首行 let-me/I 家族），
新增硬要求"锚定轮首个推理块必须 We 开头"，"The user" 开头记录不失败。

**探针结果（9 个模型请求，探索性，n 小）**：

| 变体 | n | let-me（首行或正文） | 首行家族 | 克隆正文 we 均值 |
|---|---|---|---|---|
| shipped 模板（总结式 follow-up） | 4 | 0/4 | user ×4 | ~5.3 |
| candidate-v3（总结式 follow-up） | 4 | 0/4 | user ×3 + other ×1 | ~1.8 |
| shipped（工作任务式 follow-up） | 1 | 0/1 | user ×1 | 12（首消息即 2 工具调用） |

结论：
1. 两个模板 **9/9 零 let-me**——回传锚完全压制 let-me 退化，预制模板方案的核心承诺成立。
2. 克隆首行家族由 **follow-up 提示词的轮形**决定（总结式提问必出 "The user asks..." 叙述头；
   工作任务式提示直接进入调查形态），与模板无关。**模板管"不崩"，提示词管"开口"。**
3. 反直觉数据点：shipped（回传切片 we=3）的克隆正文 we 均值 5.3 > v3（回传切片 we=2）的 1.8——
   **回传切片的 we 密度而非步数与克隆风格同向**（n=4，仅作方向性证据）。下一次 roll 的
   目标函数应是回传切片的 we-mass，而非步数或回传比。
4. 晋升决定：保留 shipped 模板；candidate-v3（5 步 / 90.3% 回传比）在任何测量轴上均不占优，
   结构优势未转化为风格收益。

**模板基线（离线分析器实测，可直接复用）**：

| 模板 | 有效回传步 | 回传字符 | replay 比 | 回传切片 we/letMe/i |
|---|---|---|---|---|
| shipped generic | 3 | 1,096 | 85.9% | 3/0/0 |
| project2-benchmark | 7 | 3,533 | 73.6% | 20/0/0 |
| generic-candidate-v3（未晋升） | 5 | 1,158 | 90.3% | 2/0/0 |

**方法论（本贡献最想被复用的部分）**：DeepSeek 涨价后（Project2 单轮 ~2 元 → ~12 元），
完整能力评测停止，转向两层低成本结构——离线 anchor-mass 分析器（零 API，走真实种子管线
量化模板，带通用性 lint 与阈值门，可作模板替换的 CI 门）+ 单请求首句探针（每试验恰好
一个模型请求，首个 assistant 消息落盘即 cancel，一条命令出家族计数汇总）。本轮全部花费 =
4 次 roll 尝试 + 9 个探针请求。

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | DeepSeek Harness `0.1.0-rc.5`，commit `47f943859bef60e4160492346772ded9b24f765a` |
| 操作系统 | Windows 11 原生 |
| API 来源 | **DeepSeek 官方 API** |
| 模型 | `deepseek-v4-pro`（服务端可变 alias，观测日疑似 0813 检查点） |
| harness / preset | prefab-anchored-standard（dsh-anchored-standard 仓库 prefab 模式），headless 驱动 |
| 其他 | Node.js 24；thinking enabled；中性 roll 工作区（技能注册表为空）；每试验恰好 1 请求 |

## 材料清单

- `README.md`：本文件（机制、结果、基线表、方法论）。
- `data/anchor-mass-summary.json`：去标识化的机器可读汇总（模板基线 + 探针家族计数）。

工具本体（分析器 / 探针 / 种子重渲染）在
[dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard) 仓库的
`prefab/` 目录（`analyze-template.mjs`、`probe-clone.mjs`、`probe-clone-runner.mjs`），
完整过程记录见该仓库 `HANDOFF-2.md`。

## 备注

- **小样本诚实**：全部探针结果为 n=1~4 的探索性证据；"we 密度 vs 步数"的方向性读数
  尤其脆（一格 0 分拉动均值），未做预注册扩样。
- **headless 坑（通用教训）**：`agent-preset/selected` 等 UI RPC 事件由 UI 层发出，
  headless 的 `agents.create({meta:{agentPreset}})` 不会触发——凡监听此类事件的插件
  （API_REMOTE_FORWARDED_EVENTS 清单内的），headless 驱动必须显式补发事件，否则
  seeder 类插件静默不工作。
- **当日模型侧观察**：锚定轮首块 We 开头率当日仅 1/4（前一日同任务 1/1），疑似 alias
  切到 0813 检查点后的基础抽卡变差；加载轮推理短（125-350 字符）且 we 词频低是该
  检查点的自然行为，非任务设计缺陷。与 noone89 的条件分布失配定性互相印证。
- 本贡献不包含完整 reasoning 文本、会话 ID、请求 ID 或任何工作区路径；roll 产出的
  候选模板按项目纪律仅本地保留，未公开发布。
