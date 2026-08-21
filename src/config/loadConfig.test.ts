// src/config/loadConfig.test.ts
import { describe, it, expect } from 'vitest';
import { loadConfig } from './loadConfig.js';

// Baseline valid env — each test overrides only what it's testing
function buildEnv(overrides: Record<string, string | undefined> = {}) {
    return {
        LLM_PROVIDER: 'ollama',
        OLLAMA_BASE_URL: 'http://localhost:11434',
        OLLAMA_MODEL: 'llama3.1',
        LOG_LEVEL: 'info',
        ...overrides,
    };
}

describe('loadConfig', () => {

    it('returns a correctly typed AppConfig when env is valid', () => {
        const config = loadConfig(buildEnv());

        expect(config).toEqual({
            llm: {
                provider: 'ollama',
                ollama: {
                    baseUrl: 'http://localhost:11434',
                    model: 'llama3.1',
                },
            },
            logging: {
                level: 'info',
            },
        })
    })

    it('throws when OLLAMA_MODEL is missing, and names it in the message', () => {
        expect(() => loadConfig(buildEnv({ OLLAMA_MODEL: undefined }))).toThrow(/OLLAMA_MODEL/)
    })

    it('throws once and lists both problems when LLM_PROVIDER is missing AND LOG_LEVEL is invalid', () => {
        let thrownError: Error | undefined
        try {
            loadConfig(buildEnv({ LLM_PROVIDER: undefined, LOG_LEVEL: undefined }))
        } catch (e) {
            thrownError = e as Error
        }
        expect(thrownError).toBeDefined()
        expect(thrownError!.message).toContain("LLM_PROVIDER")
        expect(thrownError!.message).toContain("LOG_LEVEL")
    })


    it('applies the OLLAMA_BASE_URL default when omitted', () => {
        const confg = loadConfig(buildEnv({ OLLAMA_BASE_URL: undefined }))
        expect(confg.llm.ollama.baseUrl).toBe("http://localhost:11434")
    })

    it('throws with a message naming the invalid value when LLM_PROVIDER is unknown', () => {
        let thrownError: Error | undefined
        try {
            loadConfig(buildEnv({ LLM_PROVIDER: 'foo' }))
        } catch (e) {
            thrownError = e as Error
        }
        expect(thrownError).toBeDefined()
        expect(thrownError!.message).toContain("foo")
    });
});