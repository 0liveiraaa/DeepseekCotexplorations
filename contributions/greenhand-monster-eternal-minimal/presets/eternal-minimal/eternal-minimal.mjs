/**
 * Eternal Minimal — the model-visible catalog stays EXACTLY the Minimal
 * pair (`bash` + `str_replace_editor`) for the WHOLE session, while the
 * full Standard toolset stays registered and executes FOR REAL behind a
 * bash gateway.
 *
 * This is the engine behind `eternal-minimal`: make the model believe it
 * never left the two-tool Minimal condition. V4 Pro's strongest thinking is
 * observed on the Minimal two-tool condition and degrades as the visible
 * catalog grows, so this preset NEVER
 * grows it: no promotion, no discovery tools, no catalog dump — every
 * request of every turn carries the same two tool definitions the official
 * `minimal` preset carries.
 *
 * Capabilities beyond shell + editor flow through the `dshx` GATEWAY:
 *
 *   dshx list                       # list every gateway-dispatchable tool
 *   dshx <tool> '<json-arguments>'  # execute that REAL tool, verbatim
 *
 * A `tools/pre-execute` listener intercepts bash commands that start with
 * `dshx`, dispatches them through `ctx.tools.execute()` (the full registry
 * pipeline: policy, guards, execution, rendering), and returns the tool's
 * rendered output as the bash result. The denial channel is the only
 * sanctioned pre-dispatch way to substitute a result ("deny materializes an
 * error" whose reason is exactly what the model reads), so gateway results
 * arrive flagged as errors — every payload therefore states plainly that the
 * tool executed and its output follows, and the model treats it as output.
 * The REAL tool really ran: the user sees genuine tool effects (files,
 * searches, subagents) exactly as if it had been called by name.
 *
 * A short capability GUIDE is appended to the system prompt (configurable
 * off with `guide: false` for a byte-pure Minimal persona) so the model
 * knows the gateway exists without any extra visible tool.
 *
 * Robustness:
 *  - Auto-injected context (skill catalog, workspace instructions) is
 *    stripped on EVERY request — the Minimal condition is permanent here,
 *    so there is no promotion boundary to key suppression on.
 *  - The gateway refuses to dispatch the shells / str_replace_editor
 *    themselves ("invoke them directly"), which also makes gateway
 *    recursion impossible: a nested bash dispatch never executes.
 *  - Unknown tools, malformed JSON, and tool failures all come back as
 *    readable deny reasons; nothing throws out of the listener.
 *  - A filter failure degrades to the full catalog with a one-time warning,
 *    so a bug can never brick every request of a session.
 */

/** Cordis plugin name used by loader diagnostics. */
export const name = 'eternal-minimal'

/**
 * The gateway dispatches through `ctx.tools` at event time; declaring the
 * dependency keeps the Guard happy without changing registration order
 * (first row + `prepend: true` still owns the outermost assemble transform).
 */
export const inject = ['tools']

/** Same automatic injections the anchored variants strip while controlled. */
const DEFAULT_SUPPRESSED_SOURCES = ['skill-catalog', 'agent-instructions']

/** Shell candidates (custom-bash registers `bash`; pwsh is Windows standard). */
const SHELLS = ['bash', 'pwsh']

/** The Minimal pair's second member — the only non-shell visible tool. */
const VISIBLE_EDITOR = 'str_replace_editor'

/** Default gateway command word. */
const DEFAULT_GATEWAY_COMMAND = 'dshx'

/** Default output cap for one gateway result (defensive; tools render their own). */
const DEFAULT_MAX_GATEWAY_CHARS = 12000

/** Default capability guide appended to the system prompt. */
const GUIDE_TEXT = [
  'Extended capabilities beyond bash and str_replace_editor are available through the `dshx` gateway — run them as shell commands:',
  '',
  '  dshx list                          # list every gateway tool',
  '  dshx <tool> \'<json-arguments>\'     # execute that real tool',
  '',
  'Examples:',
  '  dshx web_search \'{"query": "zod v4 changelog"}\'',
  '  dshx read_image \'{"path": "screenshot.png"}\'',
  '  dshx todo_write \'{"todos": [{"content": "ship it", "status": "pending"]}]}\'',
  '',
  'The gateway executes the real tool and returns its output as the command result (the result may carry an error flag — read the payload, it states whether the tool succeeded).',
  'Use bash and str_replace_editor directly for files, search, and shell work; use the gateway for everything else (web, images, todos, questions, delegation, jobs, goals).',
].join('\n')

function sourceList(value, field, fallback) {
  if (value === undefined) return new Set(fallback)
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new TypeError(`${name}: ${field} must be an array of non-empty strings`)
  }
  return new Set(value)
}

/** Extract the joined text of a tool result's rendered content blocks. */
function renderResultText(result) {
  const blocks = Array.isArray(result?.content) ? result.content : []
  const text = blocks
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
  if (text.length > 0) return text
  try {
    return JSON.stringify(result?.value ?? result?.error ?? null) ?? '(empty result)'
  } catch {
    return '(empty result)'
  }
}

/** Cap one gateway payload so a huge tool result cannot flood the turn. */
function cap(text, maxChars) {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars)}\n… (gateway output truncated at ${maxChars} chars)`
}

/** Register the eternal two-tool filter and the dshx bash gateway. */
export function apply(ctx, config) {
  const suppressedSources = sourceList(config?.suppressedContextSources, 'suppressedContextSources', DEFAULT_SUPPRESSED_SOURCES)
  const guide = config?.guide !== false
  const gateway = config?.gateway !== false
  const gatewayCommand = typeof config?.gatewayCommand === 'string' && config.gatewayCommand.length > 0
    ? config.gatewayCommand
    : DEFAULT_GATEWAY_COMMAND
  const maxGatewayChars = Number.isInteger(config?.maxGatewayChars) && config.maxGatewayChars > 0
    ? config.maxGatewayChars
    : DEFAULT_MAX_GATEWAY_CHARS

  let warned = false
  const warnOnce = (message) => {
    if (warned) return
    warned = true
    try {
      ctx.logger.warn(message)
    } catch {
      // Logger unavailable — the guard exists only to avoid spamming.
    }
  }

  // The visible catalog is the Minimal pair on EVERY request — think steps,
  // execute steps, post-compaction, subagents, everything.
  ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
    // Downstream errors propagate untouched; only this filter's own logic is guarded.
    const assembled = await next()
    try {
      const available = new Set(assembled.tools.map((tool) => tool.name))
      const shells = SHELLS.filter((toolName) => available.has(toolName))
      if (shells.length === 0 || !available.has(VISIBLE_EDITOR)) {
        warnOnce(
          `${name}: expected one shell and ${VISIBLE_EDITOR} in the assembled catalog; `
          + `shells=${JSON.stringify(shells)} — bootstrap disabled, full catalog exposed`,
        )
        return assembled
      }
      const keep = new Set([...shells, VISIBLE_EDITOR])
      const out = {
        ...assembled,
        tools: assembled.tools.filter((tool) => keep.has(tool.name)),
      }
      if (guide && typeof assembled.system === 'string' && assembled.system.length > 0) {
        out.system = `${assembled.system}\n\n${GUIDE_TEXT}`
      }
      return out
    } catch (error) {
      // A filter bug must never brick a session: degrade to the full catalog.
      warnOnce(`${name}: catalog filter failed, exposing the full catalog: ${String((error && error.message) || error)}`)
      return assembled
    }
  }, { prepend: true })

  // The Minimal condition is permanent, so auto-injected context is stripped
  // on every request (same strip the anchored presets apply while controlled).
  ctx.on('agent/pre-step', async (_payload, next) => {
    const decision = await next()
    if (decision.kind === 'reject') return decision
    if (suppressedSources.size === 0 || !Array.isArray(decision.messages)) return decision
    try {
      const kept = decision.messages.filter((message) => {
        const kind = message?.source?.kind
        return typeof kind !== 'string' || !suppressedSources.has(kind)
      })
      return kept.length === decision.messages.length ? decision : { ...decision, messages: kept }
    } catch (error) {
      warnOnce(`${name}: pre-step context filter failed, keeping injected context: ${String((error && error.message) || error)}`)
      return decision
    }
  }, { prepend: true })

  if (!gateway) return

  // The dshx bash gateway: intercept shell invocations of the gateway word,
  // execute the REAL tool through the registry pipeline, and hand its output
  // back as the command result. The deny channel materializes the payload as
  // the tool result the model reads.
  ctx.on('tools/pre-execute', async (exec, next) => {
    if (!SHELLS.includes(exec?.name)) return next()
    const command = exec.arguments?.command
    if (typeof command !== 'string') return next()
    const trimmed = command.trim()
    if (trimmed !== gatewayCommand && !trimmed.startsWith(`${gatewayCommand} `)) return next()

    const rest = trimmed === gatewayCommand ? '' : trimmed.slice(gatewayCommand.length).trim()

    // `dshx` / `dshx list` / `dshx help` — the capability listing.
    if (rest === '' || rest === 'list' || rest === 'help') {
      try {
        const schemas = ctx.tools.schemas(exec.agent)
        const lines = schemas
          .map((schema) => ({ name: schema.name, desc: (schema.description || '').split('\n')[0].slice(0, 90) }))
          .filter((entry) => !SHELLS.includes(entry.name) && entry.name !== VISIBLE_EDITOR)
          .map((entry) => `- ${entry.name}: ${entry.desc}`)
        return {
          kind: 'deny',
          reason: [
            `${gatewayCommand} gateway: ${lines.length} tools available (execute with \`${gatewayCommand} <tool> '<json-arguments>'\`):`,
            ...lines,
          ].join('\n'),
        }
      } catch (error) {
        return { kind: 'deny', reason: `${gatewayCommand} gateway: catalog listing failed: ${String((error && error.message) || error)}` }
      }
    }

    const match = rest.match(/^([a-z_][a-z0-9_]*)\s*([\s\S]*)$/)
    if (match === null) {
      return { kind: 'deny', reason: `${gatewayCommand} gateway: usage is \`${gatewayCommand} <tool> '<json-arguments>'\` or \`${gatewayCommand} list\`.` }
    }
    const toolName = match[1]
    const jsonArgs = match[2].trim()

    // Never gateway the visible pair: it is both pointless and the recursion
    // guard (a nested shell dispatch must not re-enter this listener).
    if (SHELLS.includes(toolName) || toolName === VISIBLE_EDITOR) {
      return { kind: 'deny', reason: `${gatewayCommand} gateway: ${toolName} is already available — invoke it directly.` }
    }

    let args = {}
    if (jsonArgs !== '') {
      // Strip one pair of surrounding shell quotes — the model single-quotes
      // the JSON object for the shell, and JSON.parse does not accept them.
      let jsonStr = jsonArgs
      if (jsonStr.length >= 2 && ((jsonStr.startsWith("'") && jsonStr.endsWith("'")) || (jsonStr.startsWith('"') && jsonStr.endsWith('"')))) {
        jsonStr = jsonStr.slice(1, -1)
      }
      try {
        args = JSON.parse(jsonStr)
      } catch {
        return {
          kind: 'deny',
          reason: `${gatewayCommand} gateway: the arguments after ${toolName} are not valid JSON. Pass one JSON object, single-quoted for the shell, e.g. ${gatewayCommand} ${toolName} '{"key": "value"}'.`,
        }
      }
      if (args === null || typeof args !== 'object' || Array.isArray(args)) {
        return { kind: 'deny', reason: `${gatewayCommand} gateway: arguments must be one JSON object, e.g. ${gatewayCommand} ${toolName} '{"key": "value"}'.` }
      }
    }

    try {
      const result = await ctx.tools.execute({
        callId: `${gatewayCommand}:${crypto.randomUUID()}`,
        name: toolName,
        arguments: args,
        agent: exec.agent,
        signal: exec.signal,
      })
      const status = result.isError ? 'executed; the tool reported an error' : 'executed successfully'
      return {
        kind: 'deny',
        reason: cap(`${gatewayCommand} gateway: ${toolName} ${status}.\n${renderResultText(result)}`, maxGatewayChars),
      }
    } catch (error) {
      return {
        kind: 'deny',
        reason: `${gatewayCommand} gateway: dispatching ${toolName} failed: ${String((error && error.message) || error)}. Run \`${gatewayCommand} list\` to see available tools.`,
      }
    }
  })
}
