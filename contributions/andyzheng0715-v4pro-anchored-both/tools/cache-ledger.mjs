// 缓存账本:扫描 JSONL 的 request/header 事件,输出每次 header 的 tools 列表与字段级 diff。
// 用法: node cache-ledger.mjs <session.jsonl> [...]
import { createReadStream } from 'node:fs'
import readline from 'node:readline'

for (const file of process.argv.slice(2)) {
  const rl = readline.createInterface({ input: createReadStream(file) })
  let prevTools = null, prevSystem = null, prevReason = null, n = 0
  console.log(`\n=== ${file} ===`)
  for await (const line of rl) {
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type !== 'request/header') continue
    n += 1
    const tools = (e.data?.header?.tools ?? []).map(t => t.name ?? t).join(',')
    const systemLen = typeof e.data?.header?.system === 'string' ? e.data.header.system.length : '?'
    const toolsChanged = prevTools !== null && prevTools !== tools
    const sysChanged = prevSystem !== null && prevSystem !== systemLen
    const flag = toolsChanged ? `  << TOOLS-CHANGED (${prevTools} -> ${tools})` : ''
    const flag2 = sysChanged ? `  << SYSTEM-CHANGED (${prevSystem} -> ${systemLen})` : ''
    console.log(`#${n} reason=${e.data?.reason} tools=[${tools}] systemLen=${systemLen}${flag}${flag2}`)
    prevTools = tools; prevSystem = systemLen; prevReason = e.data?.reason
  }
  if (n === 0) console.log('(no request/header events)')
}
