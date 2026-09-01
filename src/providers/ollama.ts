import { fetchWithTimeout } from "./utils.js";
import { DEFAULT_TEMPERATURE, type ChatMessage, type ChatOptions, type ChatResponse, ProviderError, DEFAULT_TIMEOUT_MS, type FinishReason, type ToolCall } from "./types.js";

export class OllamaProvider {

    readonly name: string
    readonly baseUrl: string
    readonly model: string

    constructor(private readonly config: NodeJS.ProcessEnv) {
        this.name = "ollama"
        this.baseUrl = config.OLLAMA_BASE_URL ?? "http://localhost:11434"
        this.model = config.OLLAMA_MODEL as string

        if (!this.model) {
            throw new ProviderError('invalid_request', 'Please set OLLAMA_MODEL to a valid model name.')
        }
    }

    async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
        try {

            const body: any = {
                model: this.model,
                messages,
                stream: false,
                think: false,
                options: {
                    temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
                    num_predict: options?.maxTokens
                }
            }

            if (options?.tools?.length) {
                body["tools"] = options.tools.map(tool => ({
                    type: "function",
                    function: tool
                }))
            }

            const response = await fetchWithTimeout(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })

            if (!response.ok) {
                if (response.status === 404) {
                    throw new ProviderError('model_not_found', `Model ${this.model} not found on Ollama server`)
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

            if (err instanceof ProviderError) {
                throw err
            }

            if (err instanceof Error && err.name === 'AbortError') {
                throw new ProviderError('timeout', `Ollama request timed out after ${DEFAULT_TIMEOUT_MS}ms`, err)
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

        let finishReason: FinishReason = data?.done_reason === 'length' ? 'length' : 'stop'
        const toolCalls: ToolCall[] = []

        if (data?.message?.tool_calls?.length > 0) {
            finishReason = "tool_calls"

            for (const toolCall of data?.message?.tool_calls) {
                toolCalls.push({
                    name: toolCall?.function?.name,
                    arguments: toolCall?.function?.arguments
                })
            }
        }

        const response: ChatResponse = {
            model: data.model,
            content: data?.message?.content ?? "",
            finishReason,
            usage: {
                promptTokens, completionTokens, totalTokens
            }
        }

        if (finishReason === "tool_calls") {
            response["toolCalls"] = toolCalls
        }

        return response
    }

}
