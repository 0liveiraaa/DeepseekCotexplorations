// 修复后的 makeTool：生成合规 JSON Schema
// 关键点：字段级 required 一律剥掉，只保留对象级 required 数组
function makeTool(name, description, props, execute) {
  const cleanProperties = {}
  for (const [key, value] of Object.entries(props)) {
    if (value && typeof value === 'object') {
      const { required: _omit, ...rest } = value
      cleanProperties[key] = rest
    } else {
      cleanProperties[key] = value
    }
  }
  return {
    name,
    description,
    parameters: {
      type: 'object',
      properties: cleanProperties,
      required: Object.keys(props).filter((k) => props[k].required),
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v) }] },
    timeoutMs: 90000,
    isConcurrencySafe: () => false,
    presentCall: (args) => ({ card: 'generic', title: name, kind: 'read', rawInput: args }),
    async execute(args, exec) {
      if (exec?.signal?.aborted) throw new Error('已取消')
      return await execute(args ?? {})
    },
  }
}

// 另外：properties 里的取值字段不要写 type: 'json'
// 错误: linkedMaterialIdsByKind: { type: 'json', description: '...' }
// 修复: linkedMaterialIdsByKind: { type: 'object', description: '...' }