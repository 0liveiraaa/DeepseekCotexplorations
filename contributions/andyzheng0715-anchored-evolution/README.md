# anchored 预设落地演进与 both-mode 使用纪律

- **上传者 ID**:AndyZHENG0715
- **研究主题**:`andyzheng0715-v4pro-anchored-both` 实验预设的落地演进与补充说明
- **日期**:2026-09-01

## 背景

PR #17 提交的 Auto-B7n 实验预设已落地为日常配置,后续有两次演进与一条使用纪律,
经 xiaobright 主仓库 issue #85 讨论确认,记录于此。原始实验数据仍在
[`../andyzheng0715-v4pro-anchored-both/`](../andyzheng0715-v4pro-anchored-both/),
保持不变。

## 演进记录

1. **改名 `anchored`**:实验期代号 auto-b7n 已改名为 `anchored`,安装为日常预设
   (`~/.dsh/.agent-presets/anchored/`),并回移了 PR #17 的 Copilot review 修复
   (both-mode 防重 guard 改为检查注入常量本身、`stringList` 配置校验报错)。
2. **Creator 变体 `anchored-creator`**:cordis(Creator)预设 + 同样的两相锚定
   (minimal 首轮表面 → 首次工具调用晋升 → both 模式全量 SDK),cordis 长 persona
   晋升后注入。与出厂 cordis 同进程共存的进程级 inspect provider 注册问题,经
   "所有权让渡"方案解决(roster 有出厂 cordis 时先拉起其 standing mount、自身复用
   注册;无出厂 cordis 才兜底自注册),两个挂载顺序均已在真实 boot 环境验证。
3. **升级自愈**:anchored-creator 的行入口为 `tool-cordis-wrapper.mjs`——零静态
   import,顶层先修复指向部署 node_modules 的符号链接再动态加载,DSH 升级换安装
   路径后第一次装载即成功。

## both-mode 使用纪律(与主仓库 issue #85 对齐)

`promotedPresentation: both` 下,**不要用 `restrictTools` 收工具**——它会收窄注入的
SDK(逐工具签名文档丢失,实测约 10KB)。要限制晋升后的 wire,用 wire 裁剪
(`[bash, str_replace_editor, run_code]`),SDK 保持核心自渲染的全量签名(约 35KB,
与官方 PTC 训练同款)。

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | 0.1.1-rc.2 |
| 操作系统 | Ubuntu 26.04 (WSL) |
| API 来源 | opencode go 订阅 |
| 模型 | deepseek-v4-pro |
| harness / preset | 自建 `anchored` / `anchored-creator` |
