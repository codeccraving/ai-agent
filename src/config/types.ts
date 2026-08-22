export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface OllamaConfig {
    baseUrl: string
    model: string
}

export interface AppConfig {
    llm: {
        provider: string
        ollama: OllamaConfig
    }
    logging: {
        level: LogLevel
    }
}