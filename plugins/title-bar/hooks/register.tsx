import { atom, read, update } from 'claude-code'
import type { EngineInterface as Engine, Register } from 'claude-code'

import type { Bar } from '../types'

const POLL_MS = 5000
const BRANCH_MARK = '⎇'
const TITLE_ENV = 'CLAUDE_TITLE_BAR'
const SEPARATOR = ' │ '
const SEPARATOR_GAP = ' '
const SESSION_CELLS = 32

const bar = atom({ plugin: 'title-bar', key: 'bar' } as const, null)

let folder = ''
let sessionId = ''
let transcriptPath: string | undefined
let hookTitle: string | undefined
let session: string | undefined
let shown: string | undefined

export const textOf = ({ session, folder, branch }: Bar): string =>
  branch === undefined
    ? `${session} - ${folder}`
    : `${session} - ${folder} ${BRANCH_MARK} ${branch}`

const clip = (text: string): string =>
  text.length > SESSION_CELLS ? `${text.slice(0, SESSION_CELLS - 1)}…` : text

// A name the person gave (/rename) outranks the one the engine generated.
export const titlesIn = (transcript: string): { custom?: string; ai?: string } => {
  const found: { custom?: string; ai?: string } = {}

  for (const line of transcript.split('\n')) {
    if (!line.includes('-title"')) continue

    try {
      const row = JSON.parse(line)

      if (row.type === 'custom-title' && typeof row.customTitle === 'string') {
        found.custom = row.customTitle
      } else if (row.type === 'ai-title' && typeof row.aiTitle === 'string') {
        found.ai = row.aiTitle
      }
    } catch {
      // A row still being written: the next refresh reads it whole.
    }
  }

  return found
}

const git = async ($: Engine, ...args: string[]): Promise<string | undefined> => {
  try {
    const { exitCode, stdout } = await $.process.run(['git', ...args], { timeoutMs: 3000 })

    return exitCode === 0 ? stdout.trim() : undefined
  } catch {
    return undefined
  }
}

const branchOf = async ($: Engine): Promise<string | undefined> => {
  const branch = await git($, 'branch', '--show-current')

  if (branch === undefined) return undefined
  if (branch !== '') return branch

  // Detached HEAD: no branch name, so show the commit instead.
  const commit = await git($, 'rev-parse', '--short', 'HEAD')

  return commit === undefined || commit === '' ? undefined : `@${commit}`
}

const sessionOf = async ($: Engine): Promise<string> => {
  let titles: { custom?: string; ai?: string } = {}

  try {
    // Rejects past 4 MiB: a long session keeps the name it last read.
    if (transcriptPath !== undefined) titles = titlesIn(await $.fs.read(transcriptPath))
  } catch {
    if (session !== undefined) return session
  }

  return titles.custom ?? hookTitle ?? titles.ai ?? sessionId.slice(0, 8)
}

// The engine has no call for the window title, so a child process sets it.
const setWindowTitle = async ($: Engine, text: string): Promise<void> => {
  const init = { env: { [TITLE_ENV]: text }, timeoutMs: 15_000 }

  try {
    if ((await $.env.get('OS')) === 'Windows_NT') {
      const script = `${$.plugin.root}/scripts/set-title.ps1`

      await $.process.run(
        ['powershell.exe', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script],
        init,
      )
    } else {
      await $.process.run(['sh', '-c', `printf '\\033]0;%s\\007' "$${TITLE_ENV}" > /dev/tty`], init)
    }
  } catch {
    // The band still shows it.
  }
}

const refresh = async ($: Engine, hasNewTitle: boolean): Promise<void> => {
  const branch = await branchOf($)

  if (hasNewTitle || session === undefined) session = await sessionOf($)

  const next: Bar = { session, folder, branch }
  const text = textOf(next)

  if (text === shown) return

  shown = text
  await update($, bar, () => next)
  void setWindowTitle($, text)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? ''
    const config = (await $.env.get('CLAUDE_CONFIG_DIR')) ?? `${home}/.claude`

    folder = e.cwd.split(/[\\/]/).filter(Boolean).pop() ?? e.cwd
    sessionId = await $.session.id()
    transcriptPath ??= `${config}/projects/${e.cwd.replace(/[^a-zA-Z0-9]/g, '-')}/${sessionId}.jsonl`

    // The engine's own title (the topic, a spinner while working) would overwrite this one.
    await $.env.set('CLAUDE_CODE_DISABLE_TERMINAL_TITLE', '1').catch(() => undefined)
    await refresh($, true)
    // A checkout made outside the session (another terminal, an IDE) raises no event here.
    $.clock.every(POLL_MS, () => void refresh($, false))

    return started
  })

  on('classic.UserPromptSubmit', async ($, e, next) => {
    transcriptPath = e.transcript_path || transcriptPath
    hookTitle = e.session_title ?? hookTitle
    await refresh($, true)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const completed = await next(e)
    await refresh($, true)

    return completed
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    await refresh($, false)

    return ran
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const title = await read($, bar)

    if (title === null) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const rule = <Text dimColor>{SEPARATOR}</Text>

    return (
      <Box>
        <Text wrap="truncate">
          <Text bold>{clip(title.session)}</Text>
          {rule}
          <Text color="cyan">{title.folder}</Text>
          {title.branch === undefined ? null : (
            <Text color="success">
              {SEPARATOR_GAP}
              {BRANCH_MARK} {title.branch}
            </Text>
          )}
          {e.props.hint === '' ? null : rule}
          <Text dimColor>{e.props.hint}</Text>
        </Text>
      </Box>
    )
  })
}
