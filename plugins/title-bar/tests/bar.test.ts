import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: 'D:\\Git\\ConsoleProfiles', surface: 'terminal', isInteractive: true } as const

const FOOTER = {
  plugin: 'title-bar',
  surface: 'terminal',
  component: 'PromptHint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
} as const

const TRANSCRIPT = [
  '{"type":"ai-title","aiTitle":"generated name","sessionId":"83ecb1a5"}',
  '{"type":"user","message":{"content":"hi"}}',
].join('\n')

type World = { branch: string; transcript: string; titles: string[] }

const world = (on: On, transcript = TRANSCRIPT): World => {
  const state: World = { branch: 'main', transcript, titles: [] }

  mock.env(on, { OS: 'Windows_NT', USERPROFILE: 'C:\\Users\\me' })
  on('env.set', () => ({ value: undefined }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: '83ecb1a5-3ded-4719-be25-39129a275589' }))
  on('fs.read', () => ({ value: state.transcript }))
  on('process.run', (_$, e) => {
    if (e.argv[0] !== 'git') state.titles.push(e.init?.env?.CLAUDE_TITLE_BAR ?? '')

    return {
      value: {
        exitCode: 0,
        stdout: e.argv[0] === 'git' ? `${state.branch}\n` : '',
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    }
  })

  return state
}

test('the footer and the window title show session, folder and branch', async ($, on) => {
  mock.clock(on)
  const state = world(on)

  await $.session.start(START)

  const ui = await $.ui.mount(FOOTER)

  expect((await ui.find({ type: 'Box' }))?.text).toBe('generated name │ ConsoleProfiles ⎇ main │ ? for shortcuts')
  expect(state.titles).toEqual(['generated name - ConsoleProfiles ⎇ main'])
  await ui.unmount()
})

test('a name the person gave outranks the generated one', async ($, on) => {
  mock.clock(on)
  world(on, `${TRANSCRIPT}\n{"type":"custom-title","customTitle":"my session"}`)

  await $.session.start(START)

  const ui = await $.ui.mount(FOOTER)

  expect((await ui.find({ type: 'Box' }))?.text).toBe('my session │ ConsoleProfiles ⎇ main │ ? for shortcuts')
  await ui.unmount()
})

test('a branch switched outside the session is picked up by the poll', async ($, on) => {
  const clock = mock.clock(on)
  const state = world(on)

  await $.session.start(START)
  state.branch = 'feature/x'
  await clock.advance(5000)

  expect(state.titles).toEqual([
    'generated name - ConsoleProfiles ⎇ main',
    'generated name - ConsoleProfiles ⎇ feature/x',
  ])
})
