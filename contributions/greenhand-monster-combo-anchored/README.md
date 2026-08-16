# Combo Anchored — 三机制组合锚定的 DSH preset

- **上传者 ID**：Greenhand-monster
- **研究主题**：think 分相 + 深度门 + CoT 滴灌三个正交锚定机制组合的 preset 在 Project2 V4.1b 上的分数表现
- **日期**：2026-08-16

## 结果摘要

Project2 V4.1b（冻结题面）、deepseek-v4-pro、`thinking_level=max`、Windows 11 原生、DeepSeek 官方 API：

| 运行目录 | ability / ship | class |
|---|---|---|
| `20260816_151202` | **97** | B+ |

- n=1 单次运行（评测 run_group 记为 `cambo-minimal`），同题复现不足，不构成跨任务、跨仓库的普适能力证明；
- 机制：三个正交锚定机制作为独立行组合，各自可调、可拆：
  - `think-phase`：轮次开场零工具 think 步 + 转向提示，负责轮次**开场**；
  - `deliberation-gate`：浅轮首个工具调用被拒一次（要求先写全推理；深度代理 = 该轮累计推理字符数，默认 ≥400 放行），负责**首个动作**；
  - `cot-drip`：每第 N 个工具结果后经 `tools/post-execute` 注入一个 "We …" 思维节拍（永不阻塞、永不报错），负责**长工具循环的中段**。
- 代价：每轮 +1 次模型调用；已探明并弃用的方案：纯 Code Mode 单工具面（参考评测中明显劣于双工具条件）与文本假工具/幽灵工具调用（实践证明非可靠锚定）。

**F9 补分说明（引用分数时必须带上）**：本批环境无 ESP-IDF 工具链，F9 按评分规则先记 3/6（`skipped_env`），后依 2026-08-13～14 九次同模型同 benchmark 真实编译全通过（9/9 `real_pass`）的参考组回填至 6.0（`f9_mode=backfilled_real_pass`）。回填前原始 ability：94。`backfilled_real_pass` **不是真实编译验证**——如需硬证据，须在装有 ESP-IDF（EIM）工具链的环境对候选代码补跑 `run_espidf_build.py`。

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | deepseek-harness 0.1.0-rc.5（commit `47f9438`，与 [xiaobright-deepseek-v4-harness](../xiaobright-deepseek-v4-harness/) 基线相同） |
| 操作系统 | Windows 11 原生（preset 内置免 PTY 的 custom-bash 支持） |
| API 来源 | **DeepSeek 官方 API** |
| 模型 | deepseek-v4-pro（dsv4p） |
| harness / preset | 自建实验 preset `combo-anchored`，源码仓库 [Greenhand-monster/dsh-deliberation-presets](https://github.com/Greenhand-monster/dsh-deliberation-presets)；全部源码附于本文件夹 `presets/` |
| 其他 | Project2 V4.1b 冻结题面；种子 `project2-v4-broken-seed`；`thinking_level=max`；**无 ESP-IDF 工具链，F9 为参考组回填而非真实编译验证**（见上） |

与 [xiaobright-deepseek-v4-harness](../xiaobright-deepseek-v4-harness/) 环境的差别（其余项相同）：

1. 全部运行在 **Windows 11 原生**——xiaobright 的 minimal / standard / PTC 对照在 WSL Ubuntu 24.04；
2. **仅 deepseek-v4-pro**——xiaobright 另有 deepseek-v4-flash 跨 harness 对照；
3. **preset 为实验 mode**——非官方 minimal / standard / PTC，也非第一代 anchored-standard；
4. **无真实 ESP-IDF 编译验证**——xiaobright 基线为真实 ESP-IDF v6.0 构建验证，本批 F9 为规则保底分 + 参考组回填。

## 材料清单

- `presets/combo-anchored/` — 完整源码（10 文件：`think-phase.mjs` / `deliberation-gate.mjs` / `cot-drip.mjs` 三机制行 + 常规模块）
- `reports/20260816_f9_backfill_report.md` — 当日 8 次评测的 F9 补全报告原件（分数表、补分依据、幂等脚本、校验记录）

安装：`cp -R presets/combo-anchored ~/.dsh/.agent-presets/combo-anchored`，重启 DSH 后新建会话选择该 preset。

## 备注

- preset 目录是自包含快照（上游仓库以 `shared/` + `scripts/sync-modes.mjs` 生成各 mode 副本）；如需跟进后续修改，以上游 develop 分支为准。
- 分数引用限定：能力分含 F9 回填增量（+3），对比真实编译验证的运行时须注明；`skipped_env`→`backfilled_real_pass` 的语义是"依据参考组回填"，不是"已验证编译通过"。
- 原始评测产物（summary / score_draft / 轨迹日志）在 modeltest 仓库 `evaluator/results/20260816_*`，未随本贡献复制；完整测试套件见 [xiaobright/modeltest](https://github.com/xiaobright/modeltest)。
