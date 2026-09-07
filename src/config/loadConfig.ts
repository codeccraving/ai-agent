import { resolve } from "node:path";
import type { AppConfig, LogLevel } from "./types.js";

export const DEFAULT_SYSTEM_PROMPT = "You are an AI coding agent with access to tools for reading and writing files, running shell commands, git operations, and tests. Evaluate every new user request independently — if it requires an action (creating a file, running a command, checking git status, etc.), call the appropriate tool for THIS request, even if a similar action was already completed earlier in the conversation. Never describe an action as done, or claim success, without actually calling the tool that performs it."
export const DEFAULT_MAX_CONTEXT_TOKENS = 8000
export const DEFAULT_TOOL_TIMEOUT_MS = 30_000

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {

    const errors: string[] = []
    let maxContextTokens: number | undefined
    let thinkDefault: boolean | undefined
    let toolTimeoutMs: number | undefined

    if (env.AGENT_MAX_CONTEXT_TOKENS === "" || env.AGENT_MAX_CONTEXT_TOKENS === undefined) {
        maxContextTokens = DEFAULT_MAX_CONTEXT_TOKENS
    } else {
        maxContextTokens = parseInt(env.AGENT_MAX_CONTEXT_TOKENS as string)
    }

    if (env.AGENT_TOOL_TIMEOUT_MS === "" || env.AGENT_TOOL_TIMEOUT_MS === undefined) {
        toolTimeoutMs = DEFAULT_TOOL_TIMEOUT_MS
    } else {
        toolTimeoutMs = parseInt(env.AGENT_TOOL_TIMEOUT_MS as string)
    }

    if (env.AGENT_THINK_MODE !== "" && env.AGENT_THINK_MODE !== undefined) {
        const thinkMode = env.AGENT_THINK_MODE?.toLowerCase()?.trim()
        if (thinkMode === "true") {
            thinkDefault = true
        } else if (thinkMode === "false") {
            thinkDefault = false
        } else {
            errors.push(`AGENT_THINK_MODE must be one of true|false, got ${env.AGENT_THINK_MODE}`)
        }
    }

    const confg: AppConfig = {
        llm: {
            provider: env.LLM_PROVIDER as string,
            raw: env
        },
        agent: {
            systemPrompt: env.AGENT_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
            maxContextTokens,
            projectRoot: resolve(env.AGENT_PROJECT_ROOT === "" || env.AGENT_PROJECT_ROOT === undefined ? process.cwd() : env.AGENT_PROJECT_ROOT),
            toolTimeoutMs
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
        confg.tools.enabled = enabledTools.split(",").filter(v => v.length > 0).map(v => v.trim())
    }

    if (!confg.llm.provider) {
        errors.push("LLM_PROVIDER is required")
    }

    if (thinkDefault !== undefined) {
        confg.agent.thinkDefault = thinkDefault
    }

    if (Number.isNaN(confg.agent.maxContextTokens) || confg.agent.maxContextTokens <= 0) {
        errors.push("AGENT_MAX_CONTEXT_TOKENS must be a numeric value and greater than 0")
    }

    if (Number.isNaN(confg.agent.toolTimeoutMs) || confg.agent.toolTimeoutMs <= 0) {
        errors.push("AGENT_TOOL_TIMEOUT_MS must be a numeric value and greater than 0")
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