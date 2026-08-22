export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
    role: ChatRole
    content: string
}

export interface ChatOptions {
    temperature?: number
    maxTokens?: number
}

export type FinishReason = 'stop' | 'length' | 'error'

export interface ChatResponse {
    content: string
    model: string
    finishReason: FinishReason
    usage?: {
        promptTokens?: number
        completionTokens?: number
        totalTokens?: number
    }
}

export interface ChatProvider {
    readonly name: string
    chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>
}

export type ProviderErrorCode =
    | 'network'
    | 'timeout'
    | 'invalid_request'
    | 'model_not_found'
    | 'invalid_response'
    | 'unknown'

export class ProviderError extends Error {
    constructor(
        public readonly code: ProviderErrorCode,
        message: string,
        public readonly cause?: unknown,
    ) {
        super(message)
        this.name = 'ProviderError'
    }
}

export const DEFAULT_TEMPERATURE = 0.7
export const DEFAULT_TIMEOUT_MS = 60_000