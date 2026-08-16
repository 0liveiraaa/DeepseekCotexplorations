# DeepSeek V4 在 DeepSeek Harness 各 preset 下的工程维护能力与触发机制

- **上传者 ID**：xiaobright
- **研究主题**：DeepSeek V4 Pro / Flash 在 DeepSeek Harness（DSH）minimal / standard / PTC / 自建 anchored-standard preset 下的工程维护能力、轨迹风格与触发机制
- **日期**：2026-08-14

## 结果摘要

在 Project2 V4.1b（冻结题面）上，同一 DeepSeek V4 Pro 正式版随 harness/preset 得分差异显著：

- DSH minimal + max（WSL）两跑 **99/96**，Python hidden 44/45；
- 自建 `anchored-standard`（Windows）：首轮只暴露 `pwsh/read`，首个工具调用后恢复 Standard 25 工具，连续两跑 **98/99**（均值 98.5，worst 98）；
- 同 WSL/max 环境 standard 91、PTC 92；正式 OpenCode 四跑 91–96，均值 92.75；
- V4 Flash 从 OpenCode 切到 minimal 后轨迹风格剧变，Ability 仍为 92，跨 harness 泛化更稳。

核心结论：Pro 的增益主要来自**首次请求的 RL 对齐 prompt + 两工具 schema**（官方源码快照测试明文称 "exact RL prompt and schemas"），而不是 Linux、官方 harness、单一 `run_code` 入口或全程限制工具数。`anchored-standard` 证明先锚定 minimal 轨迹、再恢复完整工具目录，可同时保住高能力与完整工具面。未证明灰测/正式服务代理了任何 Claude 后端。

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | deepseek-harness commit `47f9438`（固定提交，见报告证据索引） |
| 操作系统 | Windows 11（anchored-standard / standard-win32）；WSL Ubuntu 24.04（minimal / standard / PTC 对照） |
| API 来源 | DeepSeek 官方 API |
| 模型 | deepseek-v4-pro、deepseek-v4-flash |
| harness / preset | DSH minimal / standard / PTC（官方内置 code preset）；anchored-standard 为自建实验 preset，独立仓库 [xiaobright/dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard) |
| 其他 | Project2 V4.1b 冻结题面；`reasoning_effort=max`；真实 ESP-IDF v6.0 构建验证；Python 3.x |

## 材料清单

- `reports/DEEPSEEK_V4_PRO_HARNESS_ANALYSIS_20260814.md` — harness 对照分析（结果矩阵、官方源码审计、最可能解释）
- `reports/DEEPSEEK_V4_TRAJECTORY_ANALYSIS_20260814.md` — 轨迹风格与 PTC 对照分析（词频指纹、两阶段验证）
- `reports/DEEPSEEK_V4_TRIGGER_MECHANISM_EXPERIMENTS_20260814.md` — Pro / Flash 触发机制消融（微探针矩阵、动态工具晋升）

完整测试套件与测试用工具（Project2 V4.1b 题面、evaluator 与 harness preset）见：
<https://github.com/xiaobright/modeltest>

## 备注

- 三份文档复制自冻结样板仓库 `modeltest/`（V4.1b，2026-07-23 冻结），文档内相对链接指向 modeltest 的 `evaluator/reviews/`、`evaluator/trajectory_evidence/` 等路径，未随迁移改写。
- 原始 session/OpenCode 导出含完整 reasoning、system prompt、绝对路径与本地环境信息，仅本地保留；公开侧提供的是去原文的分析报告。成绩榜（`evaluator/reports/v4.1b_scoreboard.md`）与 130+ 份单次评审仍在 modeltest 仓库内。
- 98/99 为 n=2 同题复现，不构成跨任务、跨仓库的普适能力证明；下一次有信息增量的实验是换结构不同的第二个工程任务复验 minimal 与 anchored-standard。
