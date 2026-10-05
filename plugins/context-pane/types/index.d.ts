export type FileRef = {
  path: string
  isEdited: boolean
}

export type ServerRef = {
  name: string
  calls: number
}

export type MemoryRef = {
  path: string
  type: string
  tokens: number
}

export type View = {
  files: FileRef[]
  skills: string[]
  servers: ServerRef[]
  memory: MemoryRef[]
}

declare module 'claude-code' {
  interface PluginState {
    'context-pane': { view: View }
  }
}
