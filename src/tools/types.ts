import type { JSONSchema } from "../providers/types.js"

export interface ToolResult {
    content: string
    isError?: boolean
}

// The custom tool registration contract. Built-in and user-defined tools
// register through the same path — there's no separate mechanism for either.
export interface Tool {
    readonly name: string
    readonly description: string
    readonly parameters: JSONSchema  // parameters.type must be "object"
    execute(args: Record<string, unknown>): Promise<ToolResult>
}

export type ToolErrorCode = 'duplicate_tool' | 'invalid_tool'

export class ToolError extends Error {
    constructor(
        public readonly code: ToolErrorCode,
        message: string,
        public readonly cause?: unknown,
    ) {
        super(message)
        this.name = 'ToolError'
    }
}

export interface RegisterEnabledToolsResult {
    registered: string[]
    skipped: string[]
}