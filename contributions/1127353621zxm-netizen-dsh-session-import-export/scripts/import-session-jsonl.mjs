// DSH 会话导入转换脚本：明文 session.jsonl -> dsh 内部 session.jsonl.zstd（zstd 多帧）
// 用法: node import-session-jsonl.mjs <导出的 session.jsonl> <目标 session.jsonl.zstd 路径>
// 依赖: node >= 22.13 (node:zlib 提供 zstd API)
import { zstdCompressSync } from 'node:zlib'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const [, , src, dst] = process.argv
if (!src || !dst) {
  console.error('用法: node import-session-jsonl.mjs <导出的 session.jsonl> <目标 session.jsonl.zstd>')
  process.exit(1)
}

const lines = readFileSync(src, 'utf8')
  .split('\n')
  .filter((line) => line.trim().length > 0)

if (lines.length === 0) {
  console.error('源文件为空')
  process.exit(1)
}

// 第 1 行必须是 session header，单独作为第一个 zstd 帧（解压后恰好一行 + 末尾换行）
const header = lines[0] + '\n'
// 其余事件行作为第二个帧（JSONL 文本，可多行）
const events = lines.slice(1).join('\n') + '\n'

const file = Buffer.concat([
  zstdCompressSync(Buffer.from(header)),
  zstdCompressSync(Buffer.from(events)),
])

mkdirSync(dirname(dst), { recursive: true })
writeFileSync(dst, file)
console.log(`已转换: ${lines.length} 行 (header 1 行 + 事件 ${lines.length - 1} 行) -> ${dst}`)