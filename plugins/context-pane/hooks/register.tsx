import { atom, read, update } from 'claude-code'
import type { EngineInterface as Engine, Register } from 'claude-code'

import type { FileRef, MemoryRef, ServerRef, View } from '../types'

const PANE = 'context'
const TITLE = 'Context'
const COMMAND = 'context-pane'
const PANE_COLUMNS = 44
const MAX_FILES = 200
const MCP_NAME = /^mcp__(.+?)__/

const EMPTY: View = { files: [], skills: [], servers: [], memory: [] }

const view = atom({ plugin: 'context-pane', key: 'view' } as const, EMPTY)

let cwd = ''

const compact = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    : n >= 1000
      ? `${Math.round(n / 1000)}k`
      : `${n}`

const slashed = (path: string): string => path.replace(/\\/g, '/')

// Inside the working folder a path is shown from it; outside, whole.
export const shownPath = (path: string, root: string): string => {
  const full = slashed(path)
  const base = slashed(root).replace(/\/$/, '')

  return base !== '' && full.toLowerCase().startsWith(`${base.toLowerCase()}/`)
    ? full.slice(base.length + 1)
    : full
}

// The newest first; a file once edited stays marked as edited.
export const withFile = (files: readonly FileRef[], path: string, isEdited: boolean): FileRef[] => {
  const key = slashed(path).toLowerCase()
  const known = files.find(file => slashed(file.path).toLowerCase() === key)
  const rest = files.filter(file => file !== known)

  return [{ path, isEdited: isEdited || known?.isEdited === true }, ...rest].slice(0, MAX_FILES)
}

export const withServer = (servers: readonly ServerRef[], name: string): ServerRef[] => {
  const known = servers.find(server => server.name === name)

  return known === undefined
    ? [...servers, { name, calls: 1 }]
    : servers.map(server => (server === known ? { name, calls: known.calls + 1 } : server))
}

const loadMemory = async ($: Engine): Promise<void> => {
  try {
    // `summary` estimates locally: no token-count request is sent.
    const { context } = await $.session.usage({ breakdown: 'summary' })
    const memory: MemoryRef[] = (context.breakdown?.memoryFiles ?? []).map(file => ({
      path: file.path,
      type: file.type,
      tokens: file.tokens,
    }))

    await update($, view, shown => ({ ...shown, memory }))
  } catch {
    // The pane keeps what it last read.
  }
}

const open = ($: Engine) => $.ui.open({ id: PANE, title: TITLE, columns: PANE_COLUMNS })

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)

    cwd = e.cwd
    await $.command.register({
      name: COMMAND,
      description: 'Show what the context holds in a side pane',
    })
    await loadMemory($)
    void open($)

    return started
  })

  on('command.run', { command: COMMAND }, async $ => {
    await open($)

    return { text: 'Context pane opened.' }
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    // A subagent's calls fill its own context, not this conversation's.
    if (e.agentId !== undefined || ran.deny !== undefined || ran.isError === true) return ran

    if (e.tool === 'Read') {
      const path = e.file_path
      await update($, view, shown => ({ ...shown, files: withFile(shown.files, path, false) }))
    } else if (e.tool === 'Edit' || e.tool === 'Write') {
      const path = e.file_path
      await update($, view, shown => ({ ...shown, files: withFile(shown.files, path, true) }))
    } else if (e.tool === 'NotebookEdit') {
      const path = e.notebook_path
      await update($, view, shown => ({ ...shown, files: withFile(shown.files, path, true) }))
    } else {
      const server = MCP_NAME.exec(String(e.tool))?.[1]

      if (server !== undefined) {
        await update($, view, shown => ({ ...shown, servers: withServer(shown.servers, server) }))
      }
    }

    return ran
  })

  on('skill.prompt', async ($, e, next) => {
    const prompted = await next(e)

    await update($, view, shown =>
      shown.skills.includes(e.skill) ? shown : { ...shown, skills: [...shown.skills, e.skill] },
    )

    return prompted
  })

  on('turn.complete', async ($, e, next) => {
    const completed = await next(e)
    // A CLAUDE.md of a folder first entered this turn is in the context from now on.
    await loadMemory($)

    return completed
  })

  on('session.compact', async ($, e, next) => {
    const compacted = await next(e)

    // The summary replaces what the files and skills put in the window.
    if (e.agentId === undefined && e.trigger !== 'precompute' && 'messages' in compacted) {
      await update($, view, shown => ({ ...shown, files: [], skills: [], servers: [] }))
      await loadMemory($)
    }

    return compacted
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await update($, view, shown => ({ ...EMPTY, memory: shown.memory }))
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const { files, skills, servers, memory } = await read($, view)

    const heading = (label: string, count: number) => (
      <Text>
        <Text bold>{label}</Text>
        <Text dimColor> {count}</Text>
      </Text>
    )
    const none = <Text dimColor>  none</Text>

    return (
      <Box flexDirection="column">
        {heading('Files', files.length)}
        {files.length === 0 && none}
        {files.map(file => (
          <Text key={file.path} wrap="truncate-start">
            <Text color={file.isEdited ? 'warning' : undefined} dimColor={!file.isEdited}>
              {file.isEdited ? 'E ' : 'R '}
            </Text>
            {shownPath(file.path, cwd)}
          </Text>
        ))}

        <Text> </Text>
        {heading('Skills', skills.length)}
        {skills.length === 0 && none}
        {skills.map(skill => (
          <Text key={skill} wrap="truncate">
            {'  '}
            {skill}
          </Text>
        ))}

        <Text> </Text>
        {heading('MCP servers', servers.length)}
        {servers.length === 0 && none}
        {servers.map(server => (
          <Text key={server.name} wrap="truncate">
            {'  '}
            {server.name}
            <Text dimColor> ×{server.calls}</Text>
          </Text>
        ))}

        <Text> </Text>
        {heading('Memory', memory.length)}
        {memory.length === 0 && none}
        {memory.map(file => (
          <Text key={file.path} wrap="truncate-start">
            <Text dimColor>{file.type} </Text>
            {shownPath(file.path, cwd)}
            <Text dimColor> {compact(file.tokens)}</Text>
          </Text>
        ))}
      </Box>
    )
  })
}
