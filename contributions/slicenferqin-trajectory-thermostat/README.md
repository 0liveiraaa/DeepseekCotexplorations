# Trajectory Thermostat：用反馈控制调节工具/注入剂量

- **上传者 ID**：slicenferqin
- **研究主题**：把固定 resident 工具目录升级为按思维链指纹（we / let's / let me）反馈调节的轨迹恒温器
- **日期**：2026-08-16

## 结果摘要

在 opencode-go / deepseek-v4-pro / reasoningEffort=max 的本地 headless A/B 中：

- 固定 resident 5 件套：英文技能题面 "We need" 首行 4/6，中文 2/6；
- resident 7 件套（加 read/grep）：英文 5/6、中文 3/6，两个题面 letMe=0 均为 6/6；
- 长会话对照：zero-warmup 全量 25 工具在锚定后约 262 个 reasoning 块中 letMe 全程为 0，而 anchored-standard 同样 25 工具逐轮出现 letMe 4–15 次。

结论：工具/注入“剂量”确实影响轨迹，但没有一个固定剂量对所有会话最优。本贡献提出 **Trajectory Thermostat**：用 durable `assistant/message` 指纹作为传感器，带滞回的 green/yellow/red 状态机作为控制器，下一请求的工具目录与注入作为执行器，形成闭环反馈。详见 `proposal.md`。

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | 0.1.0-rc.6（npm 全局安装） |
| 操作系统 | macOS 27 arm64 |
| API 来源 | **opencode go 订阅** |
| 模型 | deepseek-v4-pro（reasoningEffort=max） |
| harness / preset | 自建 `zero-warmup`（0 工具预热 + 首轮屏蔽 agent-instructions/skill-catalog/skill-invocation + resident 目录变体） |
| 其他 | Node 26.4.0 |

## 材料清单

- `proposal.md`：Trajectory Thermostat 提案正文（问题、机制、状态机、config 草案、安全边界）
- `data/resident-dose-ab.json`：resident 5/7 件套与 hint 措辞的 A/B 汇总（脱敏，无 reasoning 原文）
- `scripts/analyze-sessions.py`：解压本地 DSH session zstd 日志并按 turn 统计 we/let's/let me 的脚本

## 备注

- 指纹统计口径：完整 reasoning 文本、大小写不敏感、整词匹配。
- 未跑 Project2 完整评测；本贡献只涉及轨迹稳定性证据，不声称能力分数提升。
- 源数据会话 ID 与完整 reasoning 未公开。
