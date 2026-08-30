import { describe, it, expect } from 'vitest'
import { calculatorTool } from './index.js'
import { validateArgs } from '../../validate.js'

describe('calculatorTool', () => {
    it.each([
        ['add', 2, 3, '5'],
        ['subtract', 5, 3, '2'],
        ['multiply', 4, 3, '12'],
        ['divide', 9, 3, '3'],
    ] as const)('%s(%d, %d) -> %s', async (operation, a, b, expected) => {
        const result = await calculatorTool.execute({ operation, a, b })
        expect(result).toEqual({ content: expected })
    })

    it('returns an isError result for division by zero', async () => {
        const result = await calculatorTool.execute({ operation: 'divide', a: 1, b: 0 })
        expect(result).toEqual({ content: 'Division by zero', isError: true })
    })

    it('returns an isError result for an unrecognized operation', async () => {
        const result = await calculatorTool.execute({ operation: 'modulo', a: 5, b: 2 })
        expect(result.isError).toBe(true)
    })

    it('exposes a schema that accepts well-formed arguments', () => {
        const result = validateArgs(calculatorTool.parameters, { operation: 'add', a: 1, b: 2 })
        expect(result.valid).toBe(true)
    })

    it('exposes a schema that rejects missing arguments', () => {
        const result = validateArgs(calculatorTool.parameters, { operation: 'add' })
        expect(result.valid).toBe(false)
    })
})