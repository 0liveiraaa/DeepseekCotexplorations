# 大脑-手脚双模式：零注入大脑 + harness 手脚的思维链稳定性与闭环编排

- **上传者 ID**：wushi2333
- **研究主题**：在 dsh 内分离"规划大脑"与"执行手脚"，验证思维链稳定与闭环可用性
- **日期**：2026-08-17

## 结果摘要

构建了 `brain-hands` preset（[dsh-head-hand-mode](https://github.com/wushi2333/dsh-head-hand-mode)）：**大脑 = DeepSeek 官方 API 零注入会话**（无系统提示词、无工具），**手脚 = dsh 会话**（minimal 双工具锚定 + 受控提升 + dshx 网关保留全能力），由 `brain-orchestrator` 编排闭环（先大脑后手脚、步进审查、历史折叠、执行纪律）。

已验证：

1. **思维链稳定**：大脑在 53 轮对照 + 多轮评测会话中稳定保持 we_need 风格（381 次 vs let_me 11 次）。零注入下 DeepSeek V4 呈现 RL 训练分布的电报体思维链；注入工具提示词或长系统提示词会切换到 let_me。
2. **闭环可运行**：用户一条消息 → 大脑规划 → 手脚执行 → 结果回大脑 → 迭代到 [DONE]。modeltest Project2 三轮：89/D → 86/B+ → 87/B+（隐藏测试 42/45，Ship 60 → 87）。
3. **诚实定位**：短中任务不优于直连（anchored-standard 同题 98/99）——大脑介入存在信息损耗；架构价值在可监督、可续跑、长任务韧性。
4. **关键坑**：回合边界驱动在"模型一口气执行"时失效（大脑全程缺席）；报告为工具日志时大脑会困惑/模仿 DSML 输出/探索空转（曾有 40 轮 0 修改）；step 级介入（agent/pre-step 扣留 + 每 N 步审查）是使大脑持续参与的关键。

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | master 分支（本地自部署源码构建） |
| 操作系统 | Windows 11 原生 |
| API 来源 | **DeepSeek 官方 API** |
| 模型 | deepseek-v4-pro（reasoning_effort max） |
| harness / preset | 自建 brain-hands preset（minimal 双工具锚定 + 受控提升 + dshx 网关 + 大脑编排 + 双视图） |
| 其他 | Node 22.20.0 · Python 3.13 |

## 材料清单

- 完整插件代码：[wushi2333/dsh-head-hand-mode](https://github.com/wushi2333/dsh-head-hand-mode)（brain-hands preset + 可选 web 双视图 client 包）
- 评测：modeltest Project2 V4.1b（[xiaobright/modeltest](https://github.com/xiaobright/modeltest)），三轮 89/D → 86/B+ → 87/B+

## 备注

- 与同题 anchored-standard（98/99）的差异说明：大脑介入的信息损耗（报告摘要 vs 全量上下文）是短任务差距主因；但大脑参与带来可监督性与长任务韧性。
- 已知盲区：hidden 测试中 probe 不覆盖的语义项（context 策略、CMake 依赖、迁移字段）三轮未命中。
- 踩坑：`agent/status` 是 emit 模式（无 next）；`agent/pre-step` 的 payload.messages 在连续工具调用步骤为空（步进审查需去掉 batch.length 条件）；大脑会话需显式约束"输出自然语言指令"防 DSML 污染。
