# DeepSeek V4 Pro × DSH:锚定轨迹的剂量-响应与 both-mode(双工具 + run_code)预设 Auto-B7n

- **上传者 ID**:AndyZHENG0715
- **研究主题**:DSH 预设的 Minimal 首轮锚定对 DeepSeek V4 Pro 轨迹的影响;PTC/both 模式中 run_code 与完整 SDK 的可用性条件;无首轮输出帽、无锚定门的双相预设设计
- **日期**:2026-08-31

## 结果摘要

40+ 会话、10 个自建变体(全量 / 双相 / 带帽 / 带门 / both、code 两种 PTC 呈现),在 git 场景、长题、解析、三方讨论、构建任务上观察首推理块轨迹(指纹 = 推理块中 `we` 与 `let me` 出现次数的 `we/(we+let_me)` 之比)与任务完成度:

1. **锚定可复现**:首轮 minimal 表面(一句话 persona + `bash` + `str_replace_editor`、无注入上下文)的会话 17+ 局全部 minimal-like("We need…" 领衔);只保留句子的半程变体(m1)漂移到 0.64——锚 = 双工具面 + 句子的组合,句子单独不够。
2. **首轮输出帽(1024 tokens)是毒药**:同设计带帽 v5 指纹 0.17,无帽 v6 0.98(截断-续写放大漂移)。
3. **锚定门会挡兜底**:要求 minimal-like 推理块才晋升的门,使单回合委派需求在 phase-1 被静默降级;去门后(b7n)委派兜底实证可用(bash×1 + run_code×1,程序内 subagent 正确回报)。
4. **完整 SDK 是 run_code 可用性的前提**:both 模式 + `restrict` 会把注入 SDK 收窄到 ~10KB;改为"晋升后 wire 裁剪"后,系统提示恢复核心自渲染的 35KB 全量签名文档(与官方 PTC 训练同款),v7 以 5 次调用(bash×1 + run_code×4)完成整题。
5. **最终形态 Auto-B7n**:复测两会话各 16/16(git 场景套件),指纹 0.88 / 0.83,零 run_code 直调错误;全部变体每会话工具表变化 ≤1 次(缓存契约)。
6. **边界(如实)**:n 小(每变体 1–3 局),指纹是代理指标;"轨迹≈性能"在自建题集内零结果差异,未做 Project2 级硬题复验;带帽毒性、SDK 收窄、委派降级均为单次对照,建议复现。

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | 0.1.1-rc.2(npm `@deepseek-ai/dsh`) |
| 操作系统 | Ubuntu 26.04(Node v24.20.0) |
| API 来源 | **opencode go 订阅** |
| 模型 | deepseek-v4-pro(reasoning effort: max) |
| harness / preset | DSH 自建预设(见 `preset/auto-b7n/`);对照组 = 官方 minimal / standard / PTC(code mode) |
| 其他 | 评测任务为本机隐藏脚本,按仓库规则不收录;任务在 csv 中以场景编号脱敏记录 |

## 材料清单

| 路径 | 内容 |
|---|---|
| `data/results.csv` | 40+ 行原始记录:变体、任务、完成度、首块标签、we/let_me 计数与比值、工具表变化次数、run_code 直调错误数 |
| `data/README-data.md` | 列口径说明与数据卫生声明(contaminated 行等) |
| `preset/auto-b7n/` | 最终预设(平铺安装到 `~/.dsh/.agent-presets/auto-b7n/` 即可) |
| `tools/` | 分析工具:zstd 多帧会话解压、轨迹扫描、缓存台账、回合记账 |

## 备注

- 与 xiaobright 主仓库的 dose-response 互为补充:本文补充 both/code 呈现、run_code + 完整 SDK、无门无帽三个维度。
- 参考基线(社区 Project2 报告):standard 91 / PTC 92 / anchored-standard 99·96;本实验不做同题复验。
- run 25(git-07)为会话运行中过早评分的中程快照,已标 `contaminated`;run 26 未完成;结论均不含这两行。
