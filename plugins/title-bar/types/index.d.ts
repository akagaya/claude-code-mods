export type Bar = {
  session: string
  folder: string
  branch?: string
  repo?: string
}

declare module 'claude-code' {
  interface PluginState {
    'title-bar': { bar: Bar | null }
  }
}
