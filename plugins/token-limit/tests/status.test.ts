import { expect, test } from 'claude-code/testing'

import { shortModel } from '../hooks/register'

const FOOTER = {
  plugin: 'token-limit',
  surface: 'terminal',
  component: 'SessionMode',
  props: { modes: ['focus'] },
} as const

test('a measurement draws context and rate limits in the footer', async ($, on) => {
  on('session.measure', (_$, e) => ({ changed: e.changed }))

  await $.session.measure({
    context: { tokens: 84_000, window: 200_000, percent: 42 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 85.5, resetsAt: '2026-10-03T14:30:00Z' },
      { kind: 'seven_day', percentUsed: 60 },
    ],
    changed: ['context', 'rateLimits'],
  })

  const ui = await $.ui.mount(FOOTER)

  expect((await ui.find({ type: 'Box' }))?.text).toMatch(
    /^ctx ██░░ 42% 84k\/200k │ 5h ███░ 85\.5% ~\d\d:\d\d │ 7d ██░░ 60% │ focus$/,
  )
  expect((await ui.find({ type: 'Text', text: /^█+░* 42%$/ }))?.props.color).toBe('success')
  expect((await ui.find({ type: 'Text', text: /^█+░* 60%$/ }))?.props.color).toBe('warning')
  expect((await ui.find({ type: 'Text', text: /^█+░* 85\.5%$/ }))?.props.color).toBe('error')
  await ui.unmount()
})

test('before the first response only the window is shown', async ($, on) => {
  on('session.measure', (_$, e) => ({ changed: e.changed }))

  await $.session.measure({
    context: { window: 1_000_000 },
    rateLimits: [],
    changed: ['context'],
  })

  const ui = await $.ui.mount(FOOTER)

  expect((await ui.find({ type: 'Box' }))?.text).toBe('ctx -/1M │ focus')
  await ui.unmount()
})

test('with nothing measured, as right after a /clear, the footer reads the session live', async ($, on) => {
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [{ kind: 'seven_day', percentUsed: 60 }] },
  }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))

  const ui = await $.ui.mount(FOOTER)

  expect((await ui.find({ type: 'Box' }))?.text).toBe('opus-5.5 -/200k │ 7d ██░░ 60% │ focus')
  await ui.unmount()
})

test('the main loop\'s request names the model and effort on the context gauge', async ($, on) => {
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('turn.step', async function* (_$, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: null, usage: null }
  })

  await $.session.measure({ context: { window: 200_000 }, rateLimits: [], changed: ['context'] })

  const step = { turnId: 't1', index: 0, messageCount: 1 }

  for await (const _ of $.turn.step({ ...step, model: 'claude-opus-5-5', effort: 'medium' })) {
    // Read to its end: the hook runs as the stream is drawn.
  }

  // A subagent's request is not the session's.
  for await (const _ of $.turn.step({ ...step, model: 'claude-haiku-4-5-20251001', effort: 'low', agentId: 'a1' })) {
    // As above.
  }

  const ui = await $.ui.mount(FOOTER)

  expect((await ui.find({ type: 'Box' }))?.text).toBe('opus-5.5 med -/200k │ focus')
  await ui.unmount()
})

test('a model id is shortened and an alias is kept', () => {
  expect(shortModel('claude-opus-5-5')).toBe('opus-5.5')
  expect(shortModel('claude-haiku-4-5-20251001')).toBe('haiku-4.5')
  expect(shortModel('claude-opus-5-5[1m]')).toBe('opus-5.5')
  expect(shortModel('opus')).toBe('opus')
})
