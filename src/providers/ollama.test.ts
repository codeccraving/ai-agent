import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider } from './ollama.js';
import { ProviderError, DEFAULT_TEMPERATURE } from './types.js';
import { createProvider } from './factory.js';
import type { AppConfig } from '../config/types.js';

function mockResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
    return {
        ok: init.ok ?? true,
        status: init.status ?? 200,
        json: async () => body,
    } as Response
}

function ollamaBody(overrides: Record<string, unknown> = {}) {
    return {
        model: 'llama3',
        message: { role: 'assistant', content: 'hello there' },
        done: true,
        done_reason: 'stop',
        prompt_eval_count: 10,
        eval_count: 5,
        ...overrides,
    }
}

describe('OllamaProvider', () => {
    let fetchMock: ReturnType<typeof vi.fn>
    let provider: OllamaProvider

    beforeEach(() => {
        fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        provider = new OllamaProvider({ OLLAMA_MODEL: 'llama3' })
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('forwards temperature/maxTokens when options are passed', async () => {
        fetchMock.mockResolvedValueOnce(mockResponse(ollamaBody()));
        await provider.chat([{ role: 'user', content: 'hi' }], { temperature: 0.2, maxTokens: 100 })

        const [url, init] = fetchMock.mock.calls[0] as any[]
        expect(url).toBe('http://localhost:11434/api/chat')
        const body = JSON.parse(init.body as string);
        expect(body).toMatchObject({
            model: 'llama3',
            stream: false,
            messages: [{ role: 'user', content: 'hi' }],
            options: { temperature: 0.2, num_predict: 100 },
        })
    })

    it('applies DEFAULT_TEMPERATURE and omits num_predict when options are omitted', async () => {
        fetchMock.mockResolvedValueOnce(mockResponse(ollamaBody()))
        await provider.chat([{ role: 'user', content: 'hi' }])

        const body = JSON.parse((fetchMock.mock.calls[0] as any[])[1].body as string)
        expect(body.options.temperature).toBe(DEFAULT_TEMPERATURE)
        expect(body.options.num_predict).toBeUndefined()
    })

    it('parses a well-formed response into ChatResponse', async () => {
        fetchMock.mockResolvedValueOnce(mockResponse(ollamaBody()));
        const result = await provider.chat([{ role: 'user', content: 'hi' }]);

        expect(result).toEqual({
            content: 'hello there',
            model: 'llama3',
            finishReason: 'stop',
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        });
    });

    it.each([
        [404, 'model_not_found'],
        [400, 'invalid_request'],
        [500, 'unknown'],
    ])('maps HTTP %i to ProviderError code %s', async (status, code) => {
        fetchMock.mockResolvedValueOnce(mockResponse({ error: 'boom' }, { ok: false, status }));
        await expect(provider.chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({ code });
    });

    it('maps a rejected fetch to ProviderError network', async () => {
        fetchMock.mockRejectedValueOnce(new Error('fetch failed'));
        await expect(provider.chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({ code: 'network' });
    });

    it('maps a JSON parse failure to invalid_response', async () => {
        fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } });
        await expect(provider.chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({ code: 'invalid_response' });
    });

    it('maps a missing message.content to invalid_response', async () => {
        fetchMock.mockResolvedValueOnce(mockResponse({ model: 'llama3', done: true }));
        await expect(provider.chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({ code: 'invalid_response' });
    });

    it('maps an AbortError to ProviderError timeout, not network', async () => {
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        fetchMock.mockRejectedValueOnce(abortError);
        await expect(provider.chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({ code: 'timeout' });
    });

    it('applies the OLLAMA_BASE_URL default when omitted', () => {
        expect(provider.baseUrl).toBe("http://localhost:11434")
    })
})

describe('createProvider', () => {
    let baseConfig = { llm: { provider: 'ollama', raw: { OLLAMA_MODEL: 'llama3' } }, agent: { systemPrompt: "sys", maxContextTokens: 1000 }, logging: { level: 'info' } } as AppConfig;

    it('returns an OllamaProvider for "ollama"', () => {
        expect(createProvider(baseConfig)).toBeInstanceOf(OllamaProvider);
    });

    it('throws ProviderError for an unsupported provider value', () => {
        const badConfig = { ...baseConfig, llm: { ...baseConfig.llm, provider: 'bogus' as any } };
        expect(() => createProvider(badConfig)).toThrow(ProviderError);
    });

    it('throws with a message naming the invalid value when LLM_PROVIDER is unknown', () => {
        const badConfig = { ...baseConfig, llm: { ...baseConfig.llm, provider: "foo" } }
        expect(() => createProvider(badConfig)).toThrow(/foo/)
    });

    it('throws when OLLAMA_MODEL is missing, and names it in the message', () => {
        const badConfig = { ...baseConfig, llm: { ...baseConfig.llm, raw: { ...baseConfig.llm.raw, OLLAMA_MODEL: undefined } } }
        expect(() => createProvider(badConfig)).toThrow(/OLLAMA_MODEL/)
    })

});