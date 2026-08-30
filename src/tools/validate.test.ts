import { describe, it, expect } from 'vitest'
import { validateArgs } from './validate.js'
import type { JSONSchema } from '../providers/types.js'

const schema: JSONSchema = {
    type: 'object',
    required: ['city', 'days'],
    properties: {
        city: { type: 'string' },
        days: { type: 'integer' },
        detailed: { type: 'boolean' },
    },
}

describe('validateArgs', () => {
    it('passes when all required arguments are present and correctly typed', () => {
        const result = validateArgs(schema, { city: 'Amritsar', days: 3 })
        expect(result).toEqual({ valid: true, errors: [] })
    })

    it('reports a missing required argument', () => {
        const result = validateArgs(schema, { city: 'Amritsar' })
        expect(result.valid).toBe(false)
        expect(result.errors).toEqual(['Missing required argument: "days"'])
    })

    it('reports multiple missing required arguments', () => {
        const result = validateArgs(schema, {})
        expect(result.valid).toBe(false)
        expect(result.errors).toEqual([
            'Missing required argument: "city"',
            'Missing required argument: "days"',
        ])
    })

    it('reports a type mismatch on a present property', () => {
        const result = validateArgs(schema, { city: 'Amritsar', days: 'three' })
        expect(result.valid).toBe(false)
        expect(result.errors).toEqual(['Argument "days" must be an integer'])
    })

    it('rejects a non-integer number for an integer-typed property', () => {
        const result = validateArgs(schema, { city: 'Amritsar', days: 3.5 })
        expect(result.valid).toBe(false)
        expect(result.errors).toEqual(['Argument "days" must be an integer'])
    })

    it('does not flag a missing optional property', () => {
        const result = validateArgs(schema, { city: 'Amritsar', days: 3 })
        expect(result.valid).toBe(true)
    })

    it('type-checks an optional property when it is present', () => {
        const result = validateArgs(schema, { city: 'Amritsar', days: 3, detailed: 'yes' })
        expect(result.valid).toBe(false)
        expect(result.errors).toEqual(['Argument "detailed" must be a boolean'])
    })

    it('ignores extra arguments not declared in the schema', () => {
        const result = validateArgs(schema, { city: 'Amritsar', days: 3, extra: 'ignored' })
        expect(result.valid).toBe(true)
    })

    it('accumulates both missing and type-mismatch errors together', () => {
        const result = validateArgs(schema, { days: 'three' })
        expect(result.valid).toBe(false)
        expect(result.errors).toEqual([
            'Missing required argument: "city"',
            'Argument "days" must be an integer',
        ])
    })

    it('treats a schema with no required/properties as always valid', () => {
        const result = validateArgs({ type: 'object' }, { anything: 'goes' })
        expect(result.valid).toBe(true)
    })

    it.each([
        ['string', { v: 'hi' }, true],
        ['string', { v: 5 }, false],
        ['number', { v: 5.5 }, true],
        ['number', { v: 'nope' }, false],
        ['boolean', { v: true }, true],
        ['boolean', { v: 'true' }, false],
        ['array', { v: [1, 2] }, true],
        ['array', { v: { 0: 1 } }, false],
        ['object', { v: { a: 1 } }, true],
        ['object', { v: [1, 2] }, false],
        ['object', { v: null }, false],
    ] as const)('checks type "%s" for value %j -> valid=%s', (type, args, expected) => {
        const result = validateArgs({ type: 'object', required: ['v'], properties: { v: { type } } }, args)
        expect(result.valid).toBe(expected)
    })
})