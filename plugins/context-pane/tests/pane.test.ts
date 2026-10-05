import { expect, test } from 'claude-code/testing'
import type { On, SessionContextBreakdown } from 'claude-code'

const CWD = 'D:\\Git\\ConsoleProfiles'
const START = { cwd: CWD, surface: 'terminal', isInteractive: true } as const

const PANE = {
  plugin: 'context-pane',
  surface: 'terminal',
  component: 'Pane',
  requestId: 'context',
  props: {
    title: 'Context',
    isFocused: false,
    bodyColumns: 44,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

const BREAKDOWN: SessionContextBreakdown = {
  categories: [],
  totalTokens: 84_000,
  maxTokens: 200_000,
  rawMaxTokens: 200_000,
  autocompactSource: 'auto',
  percentage: 42,
  gridRows: [],
  model: 'opus',
  memoryFiles: [{ path: `${CWD}\\Claude\\CLAUDE.md`, type: 'Project', tokens: 1200 }],
  mcpTools: [],
  agents: [],
  isAutoCompactEnabled: true,
  apiUsage: null,
}

type World = { opened: string[]; failing: boolean }

const world = (on: On): World => {
  const state: World = { opened: [], failing: false }

  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.open', (_$, e) => {
    state.opened.push(e.id)

    return { value: { isPlaced: true } }
  })
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { window: 200_000, tokens: 84_000, percent: 42, breakdown: BREAKDOWN },
      rateLimits: [],
    },
  }))
  on('tool.call', () =>
    state.failing ? { isError: true, result: 'File does not exist.' } : { result: {} },
  )

  return state
}

test('the pane opens at the start and lists the memory files', async ($, on) => {
  const state = world(on)

  await $.session.start(START)

  const ui = await $.ui.mount(PANE)
  const text = (await ui.find({ type: 'Box' }))?.text

  expect(state.opened).toEqual(['context'])
  expect(text).not.toContain('Window')
  expect(text).toContain('Files 0')
  expect(text).toContain('Project Claude/CLAUDE.md 1k')
  await ui.unmount()
})

test('files read and edited, and the MCP servers called, are listed', async ($, on) => {
  world(on)

  await $.session.start(START)
  await $.tool.call({ tool: 'Read', file_path: `${CWD}\\sync.sh` })
  await $.tool.call({ tool: 'Read', file_path: `${CWD}\\Claude\\sync.ps1` })
  await $.tool.call({ tool: 'Edit', file_path: `${CWD}\\sync.sh`, old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'mcp__docs__read', id: '1' })
  await $.tool.call({ tool: 'mcp__docs__read', id: '2' })

  const ui = await $.ui.mount(PANE)
  const text = (await ui.find({ type: 'Box' }))?.text

  expect(text).toContain('Files 2')
  expect(text).toMatch(/E sync\.sh[\s\S]*R Claude\/sync\.ps1/)
  expect(text).toContain('docs ×2')
  await ui.unmount()
})

test('a read that failed is left out', async ($, on) => {
  const state = world(on)

  await $.session.start(START)
  state.failing = true
  await $.tool.call({ tool: 'Read', file_path: `${CWD}\\missing.txt` })

  const ui = await $.ui.mount(PANE)

  expect((await ui.find({ type: 'Box' }))?.text).toContain('Files 0')
  await ui.unmount()
})
