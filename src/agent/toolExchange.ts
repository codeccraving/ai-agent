import type { ChatMessage, ToolCall } from "../providers/types.js";
import type { ToolResult } from "../tools/types.js";

export function buildToolFollowupMessages(
    baseMessages: ChatMessage[],
    assistantContent: string,
    toolCalls: ToolCall[],
    toolResults: ToolResult[],
): ChatMessage[] {

    if (toolCalls.length !== toolResults.length) {
        throw new Error("Tools length mismatch with results")
    }

    const messages: ChatMessage[] = [
        ...baseMessages,
        { role: "assistant", content: assistantContent, toolCalls },
    ]

    for (const [i, tool] of toolCalls.entries()) {
        messages.push({ role: "tool", content: toolResults[i]?.content as string, toolName: tool.name })
    }

    return messages

}