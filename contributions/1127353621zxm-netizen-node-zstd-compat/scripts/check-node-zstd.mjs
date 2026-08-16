// node zstd 兼容性检测：dsh rc.6 需要 node:zlib 的 zstd API
// 用法: node check-node-zstd.mjs
// 期望: node >= 22.13（zstd backport）；22.14.0 实测缺 createZstdDecompress 导致 dsh 启动崩溃
try {
  const zlib = await import('node:zlib')
  const need = ['createZstdDecompress', 'createZstdCompress', 'zstdCompress', 'zstdDecompress']
  const missing = need.filter((name) => typeof zlib[name] !== 'function')
  if (missing.length === 0) {
    console.log(`OK  node ${process.version}: 提供全部 zstd API，可运行 dsh rc.6 会话存储`)
    const buf = zlib.zstdCompressSync(Buffer.from('dsh zstd compat check'))
    const back = zlib.zstdDecompressSync(buf).toString('utf8')
    console.log(`    往返验证: "${back}"`)
  } else {
    console.error(`FAIL node ${process.version}: 缺少 ${missing.join(', ')}，dsh 启动会报 SyntaxError`)
    process.exit(1)
  }
} catch (error) {
  console.error(`FAIL node ${process.version}: 无法导入 node:zlib zstd API ->`, error.message)
  process.exit(1)
}