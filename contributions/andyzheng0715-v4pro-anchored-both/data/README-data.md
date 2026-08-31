# results.csv 口径说明

## 列

| 列 | 含义 |
|---|---|
| `run` | 会话序号(有空缺 = 中断/作废的会话,未入表) |
| `variant` | 预设变体:auto-a(全量)、auto-b/b2/b3/b3v2–v6(双相演进)、auto-b7/b7n(最终)、standard/code(官方对照) |
| `task` / `dir` | 任务类别与场景目录(fix/build/long/parse/tri/git),隐藏测试内容不入库 |
| `completed` | yes / no / contaminated(run 25 为会话运行中过早评分的中程快照,结论不含) |
| `first_label` | 首推理块标签:minimal-like("we" 领衔、无 "let me")或 standard-like;括号内 `score 4` = 该任务 4 项隐藏检查通过,`-4` = 未通过(仅部分任务有此项) |
| `we` / `let_me` | 推理块中两词的出现次数 |
| `we_ratio` | `we/(we+let_me)`,轨迹指纹 |
| `header_changes` | 会话内工具表变化次数(缓存契约:全部变体 ≤1) |
| `run_code_errors` | run_code 直调错误数(全部为 0) |

## 数据卫生声明

- 所有会话的评分均在会话结束后(`turn/end`)进行,唯一例外是 run 25(运行时评分 → 标 contaminated,数据作废重跑)。
- 首轮输出帽对照:v5(b3v5,帽 1024)与 v6(b3v6,无帽)同设计,差一个配置项。
- 锚定门对照:b7(有门)与 b7n(无门)同设计,差一个配置项。
- m1(半程会话,未入 csv)与 v7(部分指标)的观测见 `../README.md` 摘要,原始日志未收录(体积大,需要可联系)。
