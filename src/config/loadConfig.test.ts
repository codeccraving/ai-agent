// src/config/loadConfig.test.ts
import { describe, it, expect } from 'vitest';
import { loadConfig } from './loadConfig.js';

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
                    OLLAMA_MODEL: 'llama3',
                },
            },
            logging: {
                level: 'info',
            },
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
});