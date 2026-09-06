import { describe, it, expect } from "vitest";
import { ToolRegistry } from "../tools/registry.js";
import type { Tool } from "../tools/types.js";
import { classifyToolCalls } from "./confirmGate.js";

const safeTool: Tool = {
    name: "safeTool",
    description: "always safe",
    parameters: { type: "object" },
    async execute() { return { content: "ok" }; },
};

const alwaysDestructiveTool: Tool = {
    name: "alwaysDestructive",
    description: "always destructive",
    parameters: { type: "object" },
    isDestructive() { return true; },
    async execute() { return { content: "ok" }; },
};

const conditionallyDestructiveTool: Tool = {
    name: "conditional",
    description: "destructive unless dryRun",
    parameters: { type: "object" },
    isDestructive(args) { return args.dryRun !== true; },
    async execute() { return { content: "ok" }; },
};

function buildRegistry(): ToolRegistry {
    const registry = new ToolRegistry();
    registry.register(safeTool);
    registry.register(alwaysDestructiveTool);
    registry.register(conditionallyDestructiveTool);
    return registry;
}

describe("classifyToolCalls", () => {
    it("does not flag a tool with no isDestructive method", () => {
        const registry = buildRegistry();
        const result = classifyToolCalls(registry, [{ name: "safeTool", arguments: {} }]);
        expect(result.needsConfirmation).toEqual([false]);
    });

    it("flags a tool whose isDestructive always returns true", () => {
        const registry = buildRegistry();
        const result = classifyToolCalls(registry, [{ name: "alwaysDestructive", arguments: {} }]);
        expect(result.needsConfirmation).toEqual([true]);
    });

    it("evaluates isDestructive against the actual call arguments", () => {
        const registry = buildRegistry();
        const result = classifyToolCalls(registry, [
            { name: "conditional", arguments: { dryRun: true } },
            { name: "conditional", arguments: { dryRun: false } },
            { name: "conditional", arguments: {} },
        ]);
        expect(result.needsConfirmation).toEqual([false, true, true]);
    });

    it("does not flag an unregistered tool (registry.execute reports that as a normal error later)", () => {
        const registry = buildRegistry();
        const result = classifyToolCalls(registry, [{ name: "doesNotExist", arguments: {} }]);
        expect(result.needsConfirmation).toEqual([false]);
    });

    it("preserves index alignment across a mixed batch", () => {
        const registry = buildRegistry();
        const result = classifyToolCalls(registry, [
            { name: "safeTool", arguments: {} },
            { name: "alwaysDestructive", arguments: {} },
            { name: "conditional", arguments: { dryRun: true } },
        ]);
        expect(result.needsConfirmation).toEqual([false, true, false]);
    });

    it("returns an empty array for an empty batch", () => {
        const registry = buildRegistry();
        const result = classifyToolCalls(registry, []);
        expect(result.needsConfirmation).toEqual([]);
    });
});