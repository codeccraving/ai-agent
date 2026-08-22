import type { OllamaConfig } from "../config/types.js";
import { fetchWithTimeout, generateChatResponse } from "./utils.js";
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

                switch (response.status) {
                    case 400:
                        throw new ProviderError('invalid_request', `Ollama server returned status ${response.status}`)
                    case 404:
                        throw new ProviderError('model_not_found', `Model ${this.config.model} not found on Ollama server`)
                    case 500:
                        throw new ProviderError('unknown', `Ollama server returned status ${response.status}`)
                    default:
                        throw new ProviderError('invalid_response', `Ollama server returned status ${response.status}`)
                }

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

            return generateChatResponse('ollama', data) as ChatResponse
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

}
