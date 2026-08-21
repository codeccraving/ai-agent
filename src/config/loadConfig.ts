import type { AppConfig, LogLevels, Providers } from "./types.js";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {

    const errors: string[] = []

    const confg = {
        llm: {
            provider: env.LLM_PROVIDER as Providers,
            ollama: {
                baseUrl: env.OLLAMA_BASE_URL as string,
                model: env.OLLAMA_MODEL as string
            }
        },
        logging: {
            level: env.LOG_LEVEL as LogLevels
        }
    }

    //Checks
    if (!confg.llm.provider) {
        errors.push("LLM_PROVIDER is required")
    }

    Providers: if (confg.llm.provider) {
        switch (confg.llm.provider) {
            case "ollama":
                break Providers
            default:
                errors.push(`LLM_PROVIDER must be one of ollama, got ${confg.llm.provider}`)
        }
    }
    
    if (confg.llm.provider === "ollama") {

        if (!confg.llm.ollama.model) {
            errors.push("OLLAMA_MODEL is required when LLM_PROVIDER=ollama")
        }

        if (!confg.llm.ollama.baseUrl) {
            confg.llm.ollama.baseUrl = "http://localhost:11434"
        }
    }

    if (!confg.logging.level) {
        errors.push(`LOG_LEVEL must be one of debug|info|warn|error, got undefined`)
    }

    if (errors.length != 0) {
        throw new Error(`Config errors:\n- ${errors.join(`\n- `)}\n`)
    }

    return confg

}