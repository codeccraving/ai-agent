import type { AppConfig, LogLevel } from "./types.js";

export const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant. Answer the user's questions to the best of your ability."
export const DEFAULT_MAX_CONTEXT_TOKENS = 8000

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {

    const errors: string[] = []
    let maxContextTokens

    if (env.AGENT_MAX_CONTEXT_TOKENS === "" || env.AGENT_MAX_CONTEXT_TOKENS === undefined) {
        maxContextTokens = DEFAULT_MAX_CONTEXT_TOKENS
    } else {
        maxContextTokens = parseInt(env.AGENT_MAX_CONTEXT_TOKENS as string)
    }


    const confg: AppConfig = {
        llm: {
            provider: env.LLM_PROVIDER as string,
            raw: env
        },
        agent: {
            systemPrompt: env.AGENT_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
            maxContextTokens
        },
        logging: {
            level: env.LOG_LEVEL as LogLevel
        },
        tools: {
            enabled: []
        }
    }

    const enabledTools = env.AGENT_ENABLED_TOOLS
    if (enabledTools !== undefined) {
        confg.tools.enabled = enabledTools.split(",").map(v => v.trim())
    }

    if (!confg.llm.provider) {
        errors.push("LLM_PROVIDER is required")
    }

    if (Number.isNaN(confg.agent.maxContextTokens) || confg.agent.maxContextTokens <= 0) {
        errors.push("AGENT_MAX_CONTEXT_TOKENS must be a numeric value and greater than 0")
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