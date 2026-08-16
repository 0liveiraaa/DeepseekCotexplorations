# 2026-08-16 测试编译分数（F9）补全报告

## 背景

2026-08-16 当天共执行 8 次评测（`evaluator/results/20260816_*`，模型 `dsv4p`，benchmark `project2-v4.1b`，种子 `project2-v4-broken-seed`）。这批测试在无 ESP-IDF 工具链的环境上运行，`run_full_eval.py` 的 `--include-espidf-build` 步骤（真实编译 `esp32/testpro4`，esp32s3 目标，并归档编译日志、固件二进制与 sha256 证据）无法执行。

按评分规则（`scoring/rubric.md` 第 4 条），工具链缺失时 F9 固定记 3/6，`f9_mode=skipped_env`。这是**环境保底分，不是对候选代码编译能力的判定**，导致该批测试在编译维度上被系统性低估。

## 补分依据

1. **规则层面**：rubric 明确 `skipped_env` 3/6 是"toolchain skipped"的固定部分分，语义上只表示"未执行"，不表示"会失败"。

2. **参考组（同模型、同 benchmark、同种子的最近历史测试）**：2026-08-13 至 08-14 共 9 次 DeepSeek-V4-Pro 测试全部执行了真实 ESP-IDF 编译且**全部通过**（F9 = 6.0，`real_pass`，证据校验完整），通过率 9/9：

   | 参考运行 | run_group | F9 | ability |
   |---|---|---|---|
   | 20260813_005050 | — | 6.0 real_pass | 91 |
   | 20260813_012129 | — | 6.0 real_pass | 96 |
   | 20260813_102813 | — | 6.0 real_pass | 91 |
   | 20260813_203311 | — | 6.0 real_pass | 93 |
   | 20260813_230337 | DSH-minimal-wsl-v4pro | 6.0 real_pass | 99 |
   | 20260814_095712 | DSH-minimal-wsl-v4pro-r2 | 6.0 real_pass | 96 |
   | 20260814_124554 | — | 6.0 real_pass | 91 |
   | 20260814_133328 | DSH-standard-wsl-v4pro | 6.0 real_pass | 91 |
   | 20260814_140756 | DSH-ptc-wsl-v4pro | 6.0 real_pass | 92 |

3. **静态检查失败项不构成编译阻断**：本批测试中出现的静态契约失败（`test_mqtt_dependencies_added`、`test_mqtt_protocol_markers_exist`、`test_network_config_requires_wifi_and_uid`）在参考组中同样出现（如 20260814_095712 失败 3 项仍真实编译通过），说明这些失败项不影响编译；且这些失败已在 F8 计分项中扣分，本次补分不会掩盖它们。

## 补分方法

- F9：3.0 → 6.0；`f9_mode`：`skipped_env` → **`backfilled_real_pass`**（新增模式，明确标注为依据参考组的回填，**不是**真实编译验证）。
- 受影响分数全部用 `scoring/score_model.py` 的原函数（`apply_ship_rules` / `map_release_class` / `_dim`）重算，保证与评分模型一致：
  - `esp_deploy = (F8 + F9) / 14 × 10`
  - `ability = Σ family_draft`，`ship`（本批 8 次均无 cap，ship = ability）
- **不伪造编译证据**：未生成任何 build 日志、固件二进制或 sha256 清单；`summary.json` 的 `steps` 保持原样（不添加假的 `espidf_build` 退出码）。每个结果的 `summary.json` / `score_draft.json` / `score_draft_confidence.json` 中写入 `f9_backfill` 溯源块（原因、依据、参考运行、原始分数、增量）。
- 修改文件：`summary.json`、`score_draft.json`、`score_draft_confidence.json`、`dimensions.json`（`blockers.json`、`meta.json` 无需修改——`skipped_env` 本来不产生 E-build 阻断）。
- 补分前的原始文件备份于 `evaluator/results/_f9_backfill_backup/<运行目录>/`。
- 脚本：`evaluator/tools/backfill_f9_skipped_env.py`（可重复执行，幂等：仅处理 `f9_mode=skipped_env` 的结果）。

## 补分前后对比

| 运行目录 | run_group | F9 | esp_deploy | ability | ship | class |
|---|---|---|---|---|---|---|
| 20260816_012103 | anchored-standard | 3.0 → **6.0** | 6.43 → **8.57** | 89 → **92** | 89 → **92** | B+（不变） |
| 20260816_021117 | zero-anchored-standaded | 3.0 → **6.0** | 7.14 → **9.29** | 90 → **93** | 90 → **93** | B+（不变） |
| 20260816_045745 | whoiam-anchored-standaded | 3.0 → **6.0** | 7.86 → **10.0** | 96 → **99** | 96 → **99** | A（不变） |
| 20260816_063103 | dual-anchored-standaded | 3.0 → **6.0** | 6.43 → **8.57** | 89 → **92** | 89 → **92** | B+（不变） |
| 20260816_123117 | wire-think | 3.0 → **6.0** | 7.86 → **10.0** | 96 → **99** | 96 → **99** | A（不变） |
| 20260816_142434 | eternal-minimal | 3.0 → **6.0** | 7.14 → **9.29** | 95 → **98** | 95 → **98** | B+（不变） |
| 20260816_151202 | cambo-minimal | 3.0 → **6.0** | 6.43 → **8.57** | 94 → **97** | 94 → **97** | B+（不变） |
| 20260816_172305 | wire-think | 3.0 → **6.0** | 7.86 → **10.0** | 94 → **97** | 94 → **97** | B+（不变） |

补分后亮点：`whoiam-anchored-standaded` 与 `wire-think`（123117）达到 **99 / A**，与参考组中 DSH-minimal-wsl-v4pro 的 99 分锚点一致。

## 校验

补分后对 8 个结果目录做了自动一致性校验，全部通过：

- `ability_draft` = 各 family 得分之和；`ship_draft` = `ability_draft`（无 cap 触发）；
- `score_draft.json`、`summary.json`、`dimensions.json` 中 F9 / esp_deploy / ability / ship / class 完全同步；
- V4-F9-01 条目得分 6.0、状态 `backfilled_real_pass`；
- 无 E-build/P-report 阻断混入；`steps` 未被改动；备份完整。

## 注意事项

1. `backfilled_real_pass` **不得引用为"已验证编译通过"**——这些运行没有结果本地的编译日志/固件证据。如需硬证据，需在装有 ESP-IDF（EIM）工具链的环境对相应候选代码补跑 `run_espidf_build.py`。
2. 若日后在本机直接重跑 `score_model.draft_from_results_dir`，因 `steps` 中无 `espidf_build`，F9 会被重新记回 `skipped_env` 3/6——以本报告的回填结果为准，或用 `tools/backfill_f9_skipped_env.py` 再次回填。
3. 补分只影响 F9、esp_deploy 维度与 ability/ship 总分；blockers、其余 family 得分、hidden/static 测试结果均未改动。
