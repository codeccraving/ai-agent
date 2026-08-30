import type { ToolRegistry } from "./registry.js";
import type { RegisterEnabledToolsResult, Tool } from "./types.js";

export function registerEnabledTools(
    registry: ToolRegistry,
    catalog: Tool[],
    enabledNames: string[],
): RegisterEnabledToolsResult {

    const result: RegisterEnabledToolsResult = {
        registered: [],
        skipped: []
    }
    const enabledToolNamesSet = new Set(enabledNames)

    for (const tool of catalog) {
        if (enabledToolNamesSet.has(tool.name)) {
            registry.register(tool)
            result.registered.push(tool.name)
        } else {
            result.skipped.push(tool.name)
        }
    }

    return result

}