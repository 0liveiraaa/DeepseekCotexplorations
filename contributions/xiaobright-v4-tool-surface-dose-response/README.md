# DeepSeek V4 首请求工具面剂量实验

- **上传者 ID**：xiaobright
- **研究主题**：V4 Pro / Flash 首请求工具面剂量，以及 Prefab Anchored Standard 的 Project2 复现与通用化边界
- **日期**：2026-08-16

## 结果摘要

在固定官方 Minimal system、固定英文仓库检查提示、空自动注入、
`reasoning_effort=max`、`max_tokens=256000` 的纯 API 首请求探针中，
每个条件独立运行 8 次：

- V4 Pro 的 Minimal 双工具基线为 **8/8 minimal-like**；加一个
  `dev_tool_search` 为 7/8，完整 resident-5 为 7/8。
- 移除 `bash` / editor 后，search-only 为 6/8，而 discovery-trio 降至
  **0/8 minimal-like**。相同工具数不产生相同结果：pair-search 与
  discovery-trio 都是 3 个工具，结果分别为 7/8 与 0/8。
- V4 Flash 在已测四个条件中均为 **8/8 minimal-like**，显示其词法轨迹对工具面
  扰动更稳定。
- 但两个模型在 search-only 和 discovery-trio 中都 **0/8 首动作合法**：每次均调用
  未提供的 `bash`。因此“轨迹稳定”不等于“遵守当前工具 schema”，Flash 的 32/32
  不能解释为这些工具面均可正常工作。

本实验的终点是首条推理的词法标签和首个工具调用是否合法，不是 Project2 能力分数。
它支持“工具面内容而非单纯工具数量会改变轨迹分布”，但不能证明某个思维链前缀会导致
更强工程能力。

独立的完整 Project2 评测中，Anchored Standard 家族三轮得到 **98、99、99**（均值
**98.67**）；最后一轮为 **99/99/A、44/45、ESP 9/9、build passed**。该结果与默认
通用 prefab 的适用边界见 `reports/PREFAB_PROJECT2_REPLICATION.md`。

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | DeepSeek Harness `0.1.0-rc.5`，commit `47f943859bef60e4160492346772ded9b24f765a` |
| 操作系统 | Windows 11 原生 |
| API 来源 | DeepSeek 官方 API |
| 模型 | `deepseek-v4-pro`、`deepseek-v4-flash`（服务端可变 alias） |
| harness / preset | 纯 API probe，复刻官方 Minimal system 与双工具 schema；不是实际 DSH agent loop |
| 其他 | Node.js 24.15.0；thinking enabled；`reasoning_effort=max`；harness headers on；每次 fresh user/session ID；`max_tokens=256000` |

## 材料清单

- `reports/TOOL_SURFACE_DOSE_RESPONSE.md`：完整实验设计、分格结果、合法性复核和限制。
- `reports/PREFAB_PROJECT2_REPLICATION.md`：三轮 Project2 复现、prefab 修复、有效
  reasoning 回传机制及通用版未复测限制。
- `data/tool-surface-dose-response-summary.json`：去标识化机器可读汇总，包含 schema
  哈希、标签计数、首动作合法性和 token 总量。

原始逐次文件仅本地保留。本贡献不包含完整 reasoning、reasoning 首行、请求或会话 ID、
provider request ID、原始 request body、API key、绝对路径或 Project2 题面。

## 备注

- `minimal-like` 分类器以 `We need`、`Let me`、`we` 词频等词法特征计分；它是轨迹
  诊断标签，不是模型能力标签。
- 五个 Pro 条件和四个 Flash 条件按批次顺序执行，没有随机交错；N=8/格且运行中可见
  前一批结果，因此全部按探索性证据解释。
- 本实验与 MolecularFullerene 的 shell/file schema 2x2 消融互补：后者固定双工具并
  拆分 schema bundle，本实验改变发现工具的有无及组合，不能把差异归因到单个字段。
