import { describe, it, expect, vi } from 'vitest'
import { ToolRegistry } from './registry.js'
import { ToolError, type Tool } from './types.js'

function makeTool(overrides: Partial<Tool> = {}): Tool {
    return {
        name: 'echo',
        description: 'Echoes the given text back',
        parameters: {
            type: 'object',
            required: ['text'],
            properties: { text: { type: 'string' } },
        },
        execute: vi.fn(async (args: Record<string, unknown>) => ({ content: String(args.text) })),
        ...overrides,
    }
}

describe('ToolRegistry.register', () => {
    it('registers a tool successfully', () => {
        const registry = new ToolRegistry()
        registry.register(makeTool())
        expect(registry.has('echo')).toBe(true)
    })

    it('throws ToolError on duplicate registration', () => {
        const registry = new ToolRegistry()
        registry.register(makeTool())
        expect(() => registry.register(makeTool())).toThrow(ToolError)
        expect(() => registry.register(makeTool())).toThrow(/already registered/)
    })

    it('throws ToolError when parameters.type is not "object"', () => {
        const registry = new ToolRegistry()
        const badTool = makeTool({ parameters: { type: 'string' } })
        expect(() => registry.register(badTool)).toThrow(ToolError)
        expect(() => registry.register(badTool)).toThrow(/parameters\.type must be "object"/)
    })

    it('throws ToolError when the tool name is empty', () => {
        const registry = new ToolRegistry()
        expect(() => registry.register(makeTool({ name: '' }))).toThrow(ToolError)
    })
})

describe('ToolRegistry.getTools / getToolDefinitions', () => {
    it('returns every registered tool — registration alone makes it usable', () => {
        const registry = new ToolRegistry()
        const tool = makeTool()
        registry.register(tool)

        expect(registry.getTools()).toEqual([tool])
        expect(registry.getToolDefinitions()).toEqual([
            { name: 'echo', description: tool.description, parameters: tool.parameters },
        ])
    })

    it('returns an empty array when nothing is registered', () => {
        const registry = new ToolRegistry()
        expect(registry.getTools()).toEqual([])
        expect(registry.getToolDefinitions()).toEqual([])
    })
})

describe('ToolRegistry.has', () => {
    it('is true once a tool is registered', () => {
        const registry = new ToolRegistry()
        registry.register(makeTool())
        expect(registry.has('echo')).toBe(true)
    })

    it('is false for a name that was never registered', () => {
        const registry = new ToolRegistry()
        expect(registry.has('nonexistent')).toBe(false)
    })
})

describe('ToolRegistry.execute', () => {
    it('runs the tool and returns its result on valid arguments', async () => {
        const registry = new ToolRegistry()
        registry.register(makeTool())

        const result = await registry.execute({ name: 'echo', arguments: { text: 'hi' } })

        expect(result).toEqual({ content: 'hi' })
    })

    it('returns an isError result for an unknown tool name, without throwing', async () => {
        const registry = new ToolRegistry()

        const result = await registry.execute({ name: 'nonexistent', arguments: {} })

        expect(result.isError).toBe(true)
        expect(result.content).toMatch(/Unknown tool/)
    })

    it('returns an isError result for invalid arguments, without calling execute', async () => {
        const tool = makeTool()
        const registry = new ToolRegistry()
        registry.register(tool)

        const result = await registry.execute({ name: 'echo', arguments: {} })

        expect(result.isError).toBe(true)
        expect(result.content).toMatch(/Invalid arguments/)
        expect(tool.execute).not.toHaveBeenCalled()
    })

    it('catches a thrown error from execute() and wraps it as an isError result', async () => {
        const registry = new ToolRegistry()
        registry.register(makeTool({
            execute: vi.fn(async () => { throw new Error('boom') }),
        }))

        const result = await registry.execute({ name: 'echo', arguments: { text: 'hi' } })

        expect(result.isError).toBe(true)
        expect(result.content).toMatch(/Tool "echo" failed: boom/)
    })

    it('catches a non-Error throw from execute() and still returns an isError result', async () => {
        const registry = new ToolRegistry()
        registry.register(makeTool({
            execute: vi.fn(async () => { throw 'plain string throw' }),
        }))

        const result = await registry.execute({ name: 'echo', arguments: { text: 'hi' } })

        expect(result.isError).toBe(true)
        expect(result.content).toContain('plain string throw')
    })
})