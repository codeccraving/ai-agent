import type { OllamaConfig } from "../config/types.js";
import { fetchWithTimeout } from "./utils.js";
import { DEFAULT_TEMPERATURE, type ChatMessage, type ChatOptions, type ChatResponse, ProviderError, DEFAULT_TIMEOUT_MS } from "./types.js";

export class OllamaProvider {

    readonly name: string

    constructor(private readonly config: OllamaConfig) {
        this.name = "ollama"
    }

    async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {

        try {
            const response = await fetchWithTimeout(`${this.config.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages,
                    stream: false,
                    options: {
                        temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
                        num_predict: options?.maxTokens
                    }
                })
            })

            if (!response.ok) {
                if (response.status === 404) {
                    throw new ProviderError('model_not_found', `Model ${this.config.model} not found on Ollama server`)
                }

                throw new ProviderError(response.status < 500 ? 'invalid_request' : 'unknown', `Ollama server returned status ${response.status}`)
            }

            let data: any
            try {
                data = await response.json()
            } catch (err) {
                throw new ProviderError('invalid_response', 'Ollama server returned an invalid response', err)
            }

            if (!data || typeof data !== 'object' || !('message' in data) || !('content' in data.message)) {
                throw new ProviderError('invalid_response', 'Ollama server returned an invalid response')
            }

            return this.mapOllamaResponse(data)
        } catch (err) {

            if (err instanceof Error && err.name === 'AbortError') {
                throw new ProviderError('timeout', `Ollama request timed out after ${DEFAULT_TIMEOUT_MS}ms`, err)
            }

            if (err instanceof ProviderError) {
                throw err
            }

            throw new ProviderError('network', 'Failed to reach Ollama', err)
        }
    }

    private mapOllamaResponse(data: any): ChatResponse {
        const promptTokens = typeof data?.prompt_eval_count === 'number' ? data.prompt_eval_count : undefined;
        const completionTokens = typeof data?.eval_count === 'number' ? data.eval_count : undefined;
        const totalTokens = promptTokens !== undefined && completionTokens !== undefined
            ? promptTokens + completionTokens
            : undefined;

        return {
            model: data.model,
            content: data?.message?.content ?? "",
            finishReason: data?.done_reason === 'length' ? 'length' : 'stop',
            usage: {
                promptTokens, completionTokens, totalTokens
            }
        }
    }

}
