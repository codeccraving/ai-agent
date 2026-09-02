export type ChatRole = 'system' | 'user' | 'assistant' | 'tool'

export interface JSONSchema {
    type?: 'string' | 'integer' | 'boolean' | 'number' | 'object' | 'array'
    properties?: Record<string, JSONSchema>
    required?: string[]
    items?: JSONSchema
    enum?: unknown[]
    description?: string
    [key: string]: unknown
}

export interface ToolDefinition {
    name: string
    description: string
    parameters: JSONSchema
}

export interface ToolCall {
    name: string
    arguments: Record<string, unknown>
}

export interface ChatMessage {
    role: ChatRole
    content: string
    toolCalls?: ToolCall[]   // present on assistant messages that requested tool calls
    toolName?: string        // present on tool-role messages: which tool this result came from
}

export interface ChatOptions {
    temperature?: number
    maxTokens?: number
    tools?: ToolDefinition[]
    think?: boolean
}

export type FinishReason = 'stop' | 'length' | 'error' | 'tool_calls'

export interface ChatResponse {
    content: string
    model: string
    finishReason: FinishReason
    usage?: {
        promptTokens?: number
        completionTokens?: number
        totalTokens?: number
    }
    toolCalls?: ToolCall[]
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