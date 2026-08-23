import type { AppConfig, LogLevel } from "./types.js";

export const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant. Answer the user's questions to the best of your ability."

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {

    const errors: string[] = []

    const confg = {
        llm: {
            provider: env.LLM_PROVIDER as string,
            raw: env
        },
        agent: {
            systemPrompt: env.AGENT_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT
        },
        logging: {
            level: env.LOG_LEVEL as LogLevel
        }
    }

    if (!confg.llm.provider) {
        errors.push("LLM_PROVIDER is required")
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