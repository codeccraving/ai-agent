import type { ToolCall } from "../providers/types.js";
import type { ToolRegistry } from "../tools/registry.js";

export function classifyToolCalls(
    registry: ToolRegistry,
    toolCalls: ToolCall[]
): { needsConfirmation: boolean[] } {

    const needsConfirmation: boolean[] = [];
    for (const call of toolCalls) {
        const tool = registry.getTool(call.name)
        needsConfirmation.push(tool && tool?.isDestructive !== undefined ? tool.isDestructive(call.arguments) : false)
    }

    return { needsConfirmation };
}