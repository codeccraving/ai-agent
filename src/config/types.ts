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
    }
    logging: {
        level: LogLevel
    }
    tools: {
        enabled: string[]
    }
}