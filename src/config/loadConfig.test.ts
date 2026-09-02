// src/config/loadConfig.test.ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_SYSTEM_PROMPT, loadConfig, DEFAULT_MAX_CONTEXT_TOKENS } from './loadConfig.js';

// Baseline valid env — each test overrides only what it's testing
function buildEnv(overrides: Record<string, string | undefined> = {}) {
    return {
        LLM_PROVIDER: 'ollama',
        LOG_LEVEL: 'info',
        OLLAMA_MODEL: 'llama3',
        ...overrides,
    };
}

describe('loadConfig', () => {

    it('returns a correctly typed AppConfig when env is valid', () => {
        const config = loadConfig(buildEnv());

        expect(config).toEqual({
            llm: {
                provider: 'ollama',
                raw: {
                    LLM_PROVIDER: 'ollama',
                    LOG_LEVEL: 'info',
                    OLLAMA_MODEL: 'llama3'
                },
            },
            agent: {
                systemPrompt: DEFAULT_SYSTEM_PROMPT,
                maxContextTokens: DEFAULT_MAX_CONTEXT_TOKENS,
                thinkDefault: undefined
            },
            logging: {
                level: 'info',
            },
            tools: {
                enabled: []
            }
        })
    })

    it('throws once and lists both problems when LLM_PROVIDER is missing AND LOG_LEVEL is invalid', () => {
        let thrownError: Error | undefined
        try {
            loadConfig(buildEnv({ LLM_PROVIDER: undefined, LOG_LEVEL: "verbose" }))
        } catch (e) {
            thrownError = e as Error
        }
        expect(thrownError).toBeDefined()
        expect(thrownError!.message).toContain("LLM_PROVIDER")
        expect(thrownError!.message).toContain("LOG_LEVEL")
    })

    it('uses AGENT_SYSTEM_PROMPT when it is set', () => {
        const config = loadConfig(buildEnv({ AGENT_SYSTEM_PROMPT: 'You are a pirate.' }))

        expect(config.agent.systemPrompt).toBe('You are a pirate.')
    })

    it('falls back to DEFAULT_SYSTEM_PROMPT when AGENT_SYSTEM_PROMPT is unset', () => {
        const config = loadConfig(buildEnv({ AGENT_SYSTEM_PROMPT: undefined }))

        expect(config.agent.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT)
    })

    it('uses AGENT_MAX_CONTEXT_TOKENS when it is set', () => {
        const config = loadConfig(buildEnv({ AGENT_MAX_CONTEXT_TOKENS: '4000' }))

        expect(config.agent.maxContextTokens).toBe(4000)
    })

    it('falls back to DEFAULT_MAX_CONTEXT_TOKENS when AGENT_MAX_CONTEXT_TOKENS is unset', () => {
        const config = loadConfig(buildEnv({ AGENT_MAX_CONTEXT_TOKENS: undefined }))

        expect(config.agent.maxContextTokens).toBe(DEFAULT_MAX_CONTEXT_TOKENS)
    })

    it('rejects a non-numeric AGENT_MAX_CONTEXT_TOKENS', () => {
        let thrownError: Error | undefined
        try {
            loadConfig(buildEnv({ AGENT_MAX_CONTEXT_TOKENS: 'abc' }))
        } catch (e) {
            thrownError = e as Error
        }
        expect(thrownError).toBeDefined()
        expect(thrownError!.message).toContain("AGENT_MAX_CONTEXT_TOKENS")
    })

    it('rejects a zero AGENT_MAX_CONTEXT_TOKENS', () => {
        let thrownError: Error | undefined
        try {
            loadConfig(buildEnv({ AGENT_MAX_CONTEXT_TOKENS: '0' }))
        } catch (e) {
            thrownError = e as Error
        }
        expect(thrownError).toBeDefined()
        expect(thrownError!.message).toContain("AGENT_MAX_CONTEXT_TOKENS")
    })

    it('rejects a negative AGENT_MAX_CONTEXT_TOKENS', () => {
        let thrownError: Error | undefined
        try {
            loadConfig(buildEnv({ AGENT_MAX_CONTEXT_TOKENS: '-500' }))
        } catch (e) {
            thrownError = e as Error
        }
        expect(thrownError).toBeDefined()
        expect(thrownError!.message).toContain("AGENT_MAX_CONTEXT_TOKENS")
    })

    it('throws once and lists both problems when LOG_LEVEL is invalid AND AGENT_MAX_CONTEXT_TOKENS is invalid', () => {
        let thrownError: Error | undefined
        try {
            loadConfig(buildEnv({ LOG_LEVEL: 'verbose', AGENT_MAX_CONTEXT_TOKENS: '-1' }))
        } catch (e) {
            thrownError = e as Error
        }
        expect(thrownError).toBeDefined()
        expect(thrownError!.message).toContain("LOG_LEVEL")
        expect(thrownError!.message).toContain("AGENT_MAX_CONTEXT_TOKENS")
    })

    it('parses a comma-separated AGENT_ENABLED_TOOLS into config.tools.enabled', () => {
        const config = loadConfig(buildEnv({ AGENT_ENABLED_TOOLS: 'calculator,file_read' }))

        expect(config.tools.enabled).toEqual(['calculator', 'file_read'])
    })

    it('trims whitespace around each tool name in AGENT_ENABLED_TOOLS', () => {
        const config = loadConfig(buildEnv({ AGENT_ENABLED_TOOLS: ' calculator , file_read ' }))

        expect(config.tools.enabled).toEqual(['calculator', 'file_read'])
    })

    it('parses a single tool name in AGENT_ENABLED_TOOLS', () => {
        const config = loadConfig(buildEnv({ AGENT_ENABLED_TOOLS: 'calculator' }))

        expect(config.tools.enabled).toEqual(['calculator'])
    })

    it('parses AGENT_ENABLED_TOOLS into a trimmed, non-empty list', () => {
        const config = loadConfig(buildEnv({ AGENT_ENABLED_TOOLS: ' calculator, file_read ,,shell_exec' }))

        expect(config.tools.enabled).toEqual(['calculator', 'file_read', 'shell_exec'])
    })

    it('defaults tools.enabled to an empty array when AGENT_ENABLED_TOOLS is unset', () => {
        const config = loadConfig(buildEnv({ AGENT_ENABLED_TOOLS: undefined }))

        expect(config.tools.enabled).toEqual([])
    })

    it('throws once and lists both problems when LLM_PROVIDER is missing AND LOG_LEVEL is invalid', () => {
        let thrownError: Error | undefined
        try {
            loadConfig(buildEnv({ LLM_PROVIDER: undefined, LOG_LEVEL: "verbose" }))
        } catch (e) {
            thrownError = e as Error
        }
        expect(thrownError).toBeDefined()
        expect(thrownError!.message).toContain("LLM_PROVIDER")
        expect(thrownError!.message).toContain("LOG_LEVEL")
    })

    it('uses AGENT_SYSTEM_PROMPT when it is set', () => {
        const config = loadConfig(buildEnv({ AGENT_SYSTEM_PROMPT: 'You are a pirate.' }))

        expect(config.agent.systemPrompt).toBe('You are a pirate.')
    })

    it('falls back to DEFAULT_SYSTEM_PROMPT when AGENT_SYSTEM_PROMPT is unset', () => {
        const config = loadConfig(buildEnv({ AGENT_SYSTEM_PROMPT: undefined }))

        expect(config.agent.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT)
    })

    it('uses AGENT_MAX_CONTEXT_TOKENS when it is set', () => {
        const config = loadConfig(buildEnv({ AGENT_MAX_CONTEXT_TOKENS: '4000' }))

        expect(config.agent.maxContextTokens).toBe(4000)
    })

    it('falls back to DEFAULT_MAX_CONTEXT_TOKENS when AGENT_MAX_CONTEXT_TOKENS is unset', () => {
        const config = loadConfig(buildEnv({ AGENT_MAX_CONTEXT_TOKENS: undefined }))

        expect(config.agent.maxContextTokens).toBe(DEFAULT_MAX_CONTEXT_TOKENS)
    })

    it('rejects a non-numeric AGENT_MAX_CONTEXT_TOKENS', () => {
        let thrownError: Error | undefined
        try {
            loadConfig(buildEnv({ AGENT_MAX_CONTEXT_TOKENS: 'abc' }))
        } catch (e) {
            thrownError = e as Error
        }
        expect(thrownError).toBeDefined()
        expect(thrownError!.message).toContain("AGENT_MAX_CONTEXT_TOKENS")
    })

    it('rejects a zero AGENT_MAX_CONTEXT_TOKENS', () => {
        let thrownError: Error | undefined
        try {
            loadConfig(buildEnv({ AGENT_MAX_CONTEXT_TOKENS: '0' }))
        } catch (e) {
            thrownError = e as Error
        }
        expect(thrownError).toBeDefined()
        expect(thrownError!.message).toContain("AGENT_MAX_CONTEXT_TOKENS")
    })

    it('rejects a negative AGENT_MAX_CONTEXT_TOKENS', () => {
        let thrownError: Error | undefined
        try {
            loadConfig(buildEnv({ AGENT_MAX_CONTEXT_TOKENS: '-500' }))
        } catch (e) {
            thrownError = e as Error
        }
        expect(thrownError).toBeDefined()
        expect(thrownError!.message).toContain("AGENT_MAX_CONTEXT_TOKENS")
    })

    it('throws once and lists both problems when LOG_LEVEL is invalid AND AGENT_MAX_CONTEXT_TOKENS is invalid', () => {
        let thrownError: Error | undefined
        try {
            loadConfig(buildEnv({ LOG_LEVEL: 'verbose', AGENT_MAX_CONTEXT_TOKENS: '-1' }))
        } catch (e) {
            thrownError = e as Error
        }
        expect(thrownError).toBeDefined()
        expect(thrownError!.message).toContain("LOG_LEVEL")
        expect(thrownError!.message).toContain("AGENT_MAX_CONTEXT_TOKENS")
    })

    it('leaves agent.thinkDefault absent (not merely undefined-valued) when AGENT_THINK_MODE is unset', () => {
        const config = loadConfig(buildEnv({ AGENT_THINK_MODE: undefined }))

        expect('thinkDefault' in config.agent).toBe(false)
    })

    it.each([
        ['true', true],
        ['false', false],
        ['TRUE', true],
        ['False', false],
        ['  true  ', true],
    ] as const)('parses AGENT_THINK_MODE=%s as thinkDefault=%s', (raw, expected) => {
        const config = loadConfig(buildEnv({ AGENT_THINK_MODE: raw }))

        expect(config.agent.thinkDefault).toBe(expected)
    })

    it('rejects an AGENT_THINK_MODE value that is neither "true" nor "false"', () => {
        let thrownError: Error | undefined
        try {
            loadConfig(buildEnv({ AGENT_THINK_MODE: 'yes' }))
        } catch (e) {
            thrownError = e as Error
        }
        expect(thrownError).toBeDefined()
        expect(thrownError!.message).toContain("AGENT_THINK_MODE")
    })
});