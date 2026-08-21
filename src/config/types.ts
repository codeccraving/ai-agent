export type Providers = 'ollama'
export type LogLevels = 'debug' | 'info' | 'warn' | 'error'
export interface AppConfig {
    llm: {
        provider: Providers
        ollama: {
            baseUrl: string
            model: string
        }
    }
    logging: {
        level: LogLevels
    }
}