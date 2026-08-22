import type { AppConfig, LogLevel, Provider } from "./types.js";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {

    const errors: string[] = []

    const confg = {
        llm: {
            provider: env.LLM_PROVIDER as Provider,
            ollama: {
                baseUrl: env.OLLAMA_BASE_URL as string,
                model: env.OLLAMA_MODEL as string
            }
        },
        logging: {
            level: env.LOG_LEVEL as LogLevel
        }
    }

    //Checks
    Provider: switch (confg.llm.provider) {
        case "ollama":

            if (!confg.llm.ollama.model) {
                errors.push("OLLAMA_MODEL is required when LLM_PROVIDER=ollama")
            }

            if (!confg.llm.ollama.baseUrl) {
                confg.llm.ollama.baseUrl = "http://localhost:11434"
            }

            break Provider
        default:
            errors.push(`LLM_PROVIDER must be one of ollama, got ${confg.llm.provider}`)
    }

    LogLevel: switch (confg.logging.level) {
        case "debug":
        case "info":
        case "warn":
        case "error":
            break LogLevel
        default:
            errors.push(`LOG_LEVEL must be one of debug|info|warn|error, got ${confg.logging.level}`)
    }

    if (errors.length != 0) {
        throw new Error(`Config errors:\n- ${errors.join(`\n- `)}\n`)
    }

    return confg

}