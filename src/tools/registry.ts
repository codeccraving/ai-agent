import type { ToolCall, ToolDefinition } from "../providers/types.js";
import { ToolError, type Tool, type ToolResult } from "./types.js";
import { validateArgs } from "./validate.js";

export class ToolRegistry {

    private readonly toolsMap: Map<string, Tool> = new Map
    private readonly toolDefinitions: Map<string, ToolDefinition> = new Map

    register(tool: Tool): void {

        if ((!tool.name || tool.name === "") || tool.parameters?.type !== "object") {
            throw new ToolError("invalid_tool", `parameters.type must be "object": "${tool.name}"`)
        }

        if (this.has(tool.name)) {
            throw new ToolError("duplicate_tool", `A tool with name "${tool.name}" already registered`)
        }

        this.toolsMap.set(tool.name, tool)
        this.toolDefinitions.set(tool.name, {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        })
    }

    getTools(): Tool[] {
        return Array.from(this.toolsMap.values())
    }

    getToolDefinitions(): ToolDefinition[] {
        return Array.from(this.toolDefinitions.values())
    }

    has(name: string): boolean {
        return this.toolsMap.has(name)
    }

    execute(call: ToolCall): Promise<ToolResult> {
        return new Promise(async resolve => {
            if (!this.has(call.name)) {
                resolve({ content: `Unknown tool name: ${call.name}`, isError: true })
                return
            }

            const tool = this.toolsMap.get(call.name)

            if (tool?.parameters != undefined) {
                const argsValidationResult = validateArgs(tool.parameters, call.arguments)

                if (!argsValidationResult.valid) {
                    resolve({ content: "Invalid arguments", isError: true })
                    return
                }
            }

            try {
                const result = await tool?.execute(call.arguments) as ToolResult
                
                if (result.isError) {
                    result.content = `Tool "${call.name}" failed: ${result.content}`
                }

                return resolve(result)
            } catch (err: any) {
                if (err instanceof Error) {
                    resolve({ isError: true, content: `Tool "${call.name}" failed: ${err.message}` })
                } else {
                    resolve({ isError: true, content: `Tool "${call.name}" failed: ${err}` })
                }
            }
        })
    }
}