import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Engine, Gauge } from '../types'

const LABELS: Record<string, string> = {
  five_hour: '5h',
  seven_day: '7d',
  spend_limit: 'spend',
}

const EFFORTS: Record<string, string> = {
  medium: 'med',
}

const SEPARATOR = ' │ '
const BAR_CELLS = 4

const gauges = atom({ plugin: 'token-limit', key: 'gauges' } as const, [])
const engine = atom({ plugin: 'token-limit', key: 'engine' } as const, {})

// claude-haiku-4-5-20251001 → haiku-4.5; an alias (opus) is left as it is.
export const shortModel = (id: string): string =>
  id
    .replace(/\[.*\]$/, '')
    .replace(/^claude-/, '')
    .replace(/-\d{8}$/, '')
    .replace(/-(\d+)-(\d+)$/, '-$1.$2')

export const labelOf = ({ model, effort }: Engine): string | undefined =>
  model === undefined ? undefined : effort === undefined ? model : `${model} ${effort}`

const compact = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    : n >= 1000
      ? `${Math.round(n / 1000)}k`
      : `${n}`

const clock = (iso: string): string | undefined => {
  const at = new Date(iso)

  if (Number.isNaN(at.getTime())) return undefined

  const hours = `${at.getHours()}`.padStart(2, '0')
  const minutes = `${at.getMinutes()}`.padStart(2, '0')

  return `${hours}:${minutes}`
}

const contextGauge = (context: SessionContextUsage): Gauge => {
  const window = compact(context.window)

  if (context.tokens === undefined) return { label: 'ctx', detail: `-/${window}` }

  return {
    label: 'ctx',
    percent: context.percent ?? Math.round((context.tokens / context.window) * 100),
    detail: `${compact(context.tokens)}/${window}`,
  }
}

const limitGauge = (limit: SessionRateLimit): Gauge => {
  const resets = limit.resetsAt === undefined ? undefined : clock(limit.resetsAt)
  // The weekly window resets days away: a bare HH:MM would mislead.
  const hasNearReset = resets !== undefined && limit.kind === 'five_hour'

  return {
    label: LABELS[limit.kind] ?? limit.kind,
    percent: limit.percentUsed,
    detail: hasNearReset ? `~${resets}` : undefined,
  }
}

export const toGauges = (
  context: SessionContextUsage,
  rateLimits: readonly SessionRateLimit[],
): Gauge[] => [contextGauge(context), ...rateLimits.map(limitGauge)]

export const colorOf = (percent: number): string =>
  percent >= 80 ? 'error' : percent >= 50 ? 'warning' : 'success'

const bar = (percent: number): { filled: string; empty: string } => {
  const cells = Math.min(BAR_CELLS, Math.max(0, Math.round((percent / 100) * BAR_CELLS)))

  return { filled: '█'.repeat(cells), empty: '░'.repeat(BAR_CELLS - cells) }
}

const liveGauges = async ($: EngineInterface): Promise<Gauge[]> => {
  const { context, rateLimits } = await $.session.usage()

  return toGauges(context, rateLimits)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const live = await liveGauges($)
    const model = shortModel(await $.session.model())
    await update($, gauges, () => live)
    await update($, engine, known => ({ ...known, model }))

    return started
  })

  on('session.measure', async ($, e, next) => {
    await update($, gauges, () => toGauges(e.context, e.rateLimits))

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    // A subagent's request names its own model and effort, not the session's.
    if (e.agentId === undefined) {
      const effort = e.effort === undefined ? undefined : (EFFORTS[e.effort] ?? `${e.effort}`)
      await update($, engine, () => ({ model: shortModel(e.model), effort }))
    }

    return yield* next(e)
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const measured = await read($, gauges)
    // A /clear empties both values and raises no session.start: read them live until the next measurement.
    const isCleared = measured.length === 0
    const shown = isCleared ? await liveGauges($) : measured
    const known = isCleared ? { model: shortModel(await $.session.model()) } : await read($, engine)
    // The context window is the model's, so its gauge carries the model's name.
    const contextLabel = labelOf(known)

    return (
      <Box>
        {shown.map((gauge, index) => {
          const { filled, empty } = bar(gauge.percent ?? 0)
          const label = index === 0 ? (contextLabel ?? gauge.label) : gauge.label

          return (
            <Text key={gauge.label} wrap="truncate">
              {index > 0 ? <Text dimColor>{SEPARATOR}</Text> : null}
              <Text bold>{label} </Text>
              {gauge.percent === undefined ? null : (
                <Text color={colorOf(gauge.percent)}>
                  {filled}
                  <Text dimColor>{empty}</Text> {gauge.percent}%
                </Text>
              )}
              {gauge.detail === undefined ? null : (
                <Text dimColor>{gauge.percent === undefined ? gauge.detail : ` ${gauge.detail}`}</Text>
              )}
            </Text>
          )
        })}
        {e.props.modes.length === 0 ? null : (
          <Text dimColor>{`${SEPARATOR}${e.props.modes.join(' & ')}`}</Text>
        )}
      </Box>
    )
  })
}
