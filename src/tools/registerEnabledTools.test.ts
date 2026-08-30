import { describe, it, expect, vi } from 'vitest'
import { ToolRegistry } from './registry.js'
import { registerEnabledTools } from './registerEnabledTools.js'
import type { Tool } from './types.js'

function makeTool(name: string): Tool {
    return {
        name,
        description: `The ${name} tool`,
        parameters: { type: 'object', properties: {} },
        execute: vi.fn(async () => ({ content: 'ok' })),
    }
}

describe('registerEnabledTools', () => {
    it('registers only the catalog tools named in enabledNames', () => {
        const registry = new ToolRegistry()
        const catalog = [makeTool('calculator'), makeTool('file_read'), makeTool('shell_exec')]

        registerEnabledTools(registry, catalog, ['calculator'])

        expect(registry.has('calculator')).toBe(true)
        expect(registry.has('file_read')).toBe(false)
        expect(registry.has('shell_exec')).toBe(false)
    })

    it('registers nothing when enabledNames is empty — the safe default', () => {
        const registry = new ToolRegistry()
        const catalog = [makeTool('calculator'), makeTool('file_read')]

        registerEnabledTools(registry, catalog, [])

        expect(registry.getTools()).toEqual([])
    })

    it('registers every catalog tool when all are named in enabledNames', () => {
        const registry = new ToolRegistry()
        const catalog = [makeTool('calculator'), makeTool('file_read')]

        registerEnabledTools(registry, catalog, ['calculator', 'file_read'])

        expect(registry.getTools()).toHaveLength(2)
    })

    it('ignores an enabled name that matches nothing in the catalog', () => {
        const registry = new ToolRegistry()
        const catalog = [makeTool('calculator')]

        registerEnabledTools(registry, catalog, ['calculator', 'nonexistent_tool'])

        expect(registry.getTools()).toHaveLength(1)
        expect(registry.has('nonexistent_tool')).toBe(false)
    })

    it('returns the registered and skipped names in catalog order', () => {
        const registry = new ToolRegistry()
        const catalog = [makeTool('calculator'), makeTool('file_read'), makeTool('shell_exec')]

        const result = registerEnabledTools(registry, catalog, ['shell_exec'])

        expect(result).toEqual({
            registered: ['shell_exec'],
            skipped: ['calculator', 'file_read'],
        })
    })
})