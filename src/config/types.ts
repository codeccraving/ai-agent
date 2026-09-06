export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface AppConfig {
    llm: {
        provider: string
        raw: NodeJS.ProcessEnv
    }
    agent: {
        systemPrompt: string
        maxContextTokens: number
        thinkDefault?: boolean
        projectRoot: string
        toolTimeoutMs: number
    }
    logging: {
        level: LogLevel
    }
    tools: {
        enabled: string[]
    }
}