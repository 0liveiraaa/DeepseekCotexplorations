// 多帧 zstd 会话日志解压器:扫描帧魔数,逐帧 zstdDecompressSync。
import { readFileSync, writeFileSync } from 'node:fs'
import { zstdDecompressSync } from 'node:zlib'
const [inFile, outFile] = process.argv.slice(2)
const buf = readFileSync(inFile)
const MAGIC = [0x28, 0xB5, 0x2F, 0xFD]
const starts = []
for (let i = 0; i + 4 <= buf.length; i++) {
  if (buf[i] === MAGIC[0] && buf[i+1] === MAGIC[1] && buf[i+2] === MAGIC[2] && buf[i+3] === MAGIC[3]) starts.push(i)
}
const parts = []
for (let j = 0; j < starts.length; j++) {
  const s = starts[j], e = j + 1 < starts.length ? starts[j+1] : buf.length
  try { parts.push(zstdDecompressSync(buf.subarray(s, e))) } catch (err) { /* 压缩数据内偶发假魔数,跳过 */ }
}
writeFileSync(outFile, Buffer.concat(parts))
console.log(`frames=${starts.length} decoded=${parts.length} bytes=${Buffer.concat(parts).length}`)
