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
});