# Trajectory Thermostat（轨迹恒温器）提案

## 1. 问题

当前 dsh-anchored-standard 家族通过固定剂量的锚定（Minimal schema / zero-tool anchor / wire think）建立轨迹，再用固定 resident 目录维持轨迹。但社区证据显示：

- #51 / #65：同一 preset 在不同环境/权重下无法保证轨迹与分数复现；
- #52 / #17：晋升、子代理、compaction 后 we need 重新漂回 let me；
- #47 / #61：resident 过小影响吞吐，过大扰动轨迹，固定目录无法同时最优。

固定剂量本质是开环控制：一次给药，之后不再修正。

## 2. 方案

把轨迹指纹当作被控变量，工具目录与注入当作执行器，形成一个闭环：

- **Sensor**：监听 durable `assistant/message` 的 reasoning 块，按滑动窗口统计 `we / let's / let me` 与首行分类。
- **Controller**：带滞回的状态机：
  - green：稳定；
  - yellow：窗口内出现漂移；
  - red：明显 collapse。
- **Actuator**：下一个请求按状态改变可见工具目录，并在需要时注入非命令式 steer。

### 状态表

| 状态 | 下一请求工具 | 额外动作 |
|---|---|---|
| green | 当前 resident 基础集 | 无 |
| yellow | bootstrap 对 + compactionTools | 注入一条 steer |
| red | 空目录 | 下一轮 mini-anchor 重新晋升 |

compaction 边界重置为 yellow；子代理默认继承父状态，可配置 `includeSubagents`。

### 伪代码

```js
on assistant/message:
  score = fingerprint(reasoning)
  if score.drift > yellowThreshold:
      state = min(state + 1, red)
  else if score.stable for restoreWindow:
      state = max(state - 1, green)
  persist state as durable session event

on system-prompt/assemble:
  tools = catalogFor(state)
```

### Config 草案

```yaml
- id: trajectory-thermostat
  config:
    enabled: true
    window: 3
    yellowLetMe: 1
    redLetMe: 3
    restoreStable: 4
    baseTools: [bash, str_replace_editor, read, grep, dev_tool_search, skill_search, skill_load]
    yellowTools: [bash, str_replace_editor]
    includeSubagents: false
```

## 3. 安全边界

- 只增删工具目录，不删除用户上下文；
- 传感器/控制器失败时降级为现有固定 resident 行为；
- 状态作为 durable session event 持久化，resume/reload 可重建；
- `enabled: false` 等价于当前 preset。

## 4. 待验证问题

1. 首版用 durable `assistant/message`（延迟一步但零额外模型调用）还是实时 `reasoning-chunks`；
2. 状态机阈值跨环境是否可迁移；
3. 与 context-gate / compaction-epoch / cot-drip 的协同顺序。
