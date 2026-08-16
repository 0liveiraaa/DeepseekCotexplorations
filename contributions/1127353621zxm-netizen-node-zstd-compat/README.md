# node 版本与 DSH zstd 会话存储的兼容性

- **上传者 ID**：1127353621zxm-netizen
- **研究主题**：dsh rc.6 依赖 `node:zlib` 的 zstd API，某些 node 版本缺该 API 导致 dsh 启动即崩溃
- **日期**：2026-08-16

## 结果摘要

- dsh rc.6 的会话持久化模块 `@deepseek-ai/dsh-session-persistence-jsonl` 顶层 `import { createZstdDecompress, zstdCompress, ... } from "node:zlib"`。
- **node 22.14.0**（Windows 官方安装包 `C:\Program Files\nodejs`）启动 dsh 报：
  `SyntaxError: The requested module 'node:zlib' does not provide an export named 'createZstdDecompress'`，整个 `dsh web` 无法启动。
- **node 22.23.2**（zstd API 已 backport）启动正常。
- 排查要点：同一台机器上 `where node` 可能列出多个 node（程序专用 node 与系统 node 并存），`npx`/`.cmd` 派生的子进程拿到的 node 与交互 shell 里 `node --version` 看到的可能不同——启动 dsh 的是哪一个，决定了会不会崩。
- 检测脚本见 `scripts/check-node-zstd.mjs`：能直接报出当前 node 是否支持 dsh 需要的 zstd API。

## 实验环境

| 项 | 值 |
|---|---|
| dsh 版本 | 0.1.0-rc.6（npx @deepseek-ai/dsh） |
| 操作系统 | Windows 11 |
| API 来源 | opencode go 订阅（llm-pi-ai / opencode-go provider） |
| 模型 | deepseek-v4-pro / deepseek-v4-flash |
| harness / preset | 自建（warmupbetter-replay + router-flash） |
| 其他 | 故障 node 22.14.0 vs 正常 node 22.23.2 |

## 材料清单

- `scripts/check-node-zstd.mjs`：检测当前 node 是否提供 `node:zlib` 的 zstd API（`createZstdDecompress` / `zstdCompress` / `zstdDecompress`），打印 node 版本与结论。

## 备注

- 触发场景：把 dsh 打包成独立桌面应用（Electron）并在应用内置 node 直跑 dsh 时，发现系统 PATH 的 node（22.14.0）与内置 node（22.23.2）行为不同；这也是 zstd 会话存储（见同账号另一贡献 `dsh-session-import-export`）的间接证据。