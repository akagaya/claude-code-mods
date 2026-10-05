export type Gauge = {
  label: string
  percent?: number
  detail?: string
}

export type Engine = {
  model?: string
  effort?: string
}

declare module 'claude-code' {
  interface PluginState {
    'token-limit': { gauges: Gauge[]; engine: Engine }
  }
}
