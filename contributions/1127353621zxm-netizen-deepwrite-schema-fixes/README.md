# dsh 插件工具 JSON Schema 合规性：字段级 required 与 type:"json" 的修复

- **上传者 ID**：1127353621zxm-netizen
- **研究主题**：dsh 插件（deepwrite-dsh）工具参数的 JSON Schema 写法不合规，被 pi-ai / Console Go provider 拒绝的两种模式与修复
- **日期**：2026-08-16

## 结果摘要

dsh 插件自定义工具的参数 schema 在发送给 provider 前会被 pi-ai 适配层校验，两种"看着能跑"的写法会被直接拒绝（400）：

1. **字段级 `required: true` 残留**：
   - 写法：`properties: { book_id: { type: 'string', required: true } }`（`required` 是 JSON Schema 对象级关键字，字段内不合法）。
   - 报错：`Invalid schema for function 'create_draft_sections': true is not of type "array"`。
   - 修复：生成 properties 时剥掉字段内的 `required`，只保留顶层 `required` 数组（见 `patches/makeTool-clean-properties.js`）。

2. **非法类型 `type: 'json'`**：
   - 写法：`linkedMaterialIdsByKind: { type: 'json', ... }`（JSON Schema 没有 `json` 类型）。
   - 报错：`Invalid schema for function 'deepwrite_create_book': "json" is not valid under any of the schemas listed in the 'anyOf' keyword`。
   - 修复：`type: 'json'` → `type: 'object'`（值为 JSON 对象）。

修复后 `create_draft_sections`、`deepwrite_create_book` 等工具调用恢复正常。全插件 schema 类型应只使用 `string` / `object` / `array` 等标准类型。

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | 0.1.0-rc.6（npx @deepseek-ai/dsh） |
| 操作系统 | Windows 11 |
| API 来源 | opencode go 订阅（llm-pi-ai / opencode-go provider → Console Go） |
| 模型 | deepseek-v4-flash |
| harness / preset | 自建（warmupbetter-replay / router-flash）+ 本地插件 deepwrite-dsh |
| 其他 | node 22.23.2；Electron 43 打包桌面应用（与 CLI 同栈） |

## 材料清单

- `patches/makeTool-clean-properties.js`：修复后的 `makeTool`（剥字段级 required，顶层 required 数组照常生成）。
- 修复 2 的 diff 极小（`type: 'json'` → `type: 'object'` 两行），见 README 摘要。

## 备注

- 两个错误分别发生在不同工具上（批量建小节 / 建作品），说明属于**同类问题不同写法**——排查时先校验 properties 里所有非标准关键字和非法 type 枚举。
- 报错里的 "true is not of type 'array'" 不带路径，最初误判为 provider 端问题；实际是 pi-ai 适配层（`@earendil-works/pi-ai`）校验时把字段级 `required: true` 放进了需要数组的位置。