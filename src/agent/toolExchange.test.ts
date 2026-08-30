import { describe, it, expect } from 'vitest'
import { buildToolFollowupMessages } from './toolExchange.js'
import type { ChatMessage, ToolCall } from '../providers/types.js'

describe('buildToolFollowupMessages', () => {
    it('appends the assistant tool-call message followed by matching tool-result messages, in order', () => {
        const base: ChatMessage[] = [
            { role: 'system', content: 'sys' },
            { role: 'user', content: 'what is 47 * 89?' },
        ]
        const toolCalls: ToolCall[] = [{ name: 'calculator', arguments: { operation: 'multiply', a: 47, b: 89 } }]

        const result = buildToolFollowupMessages(base, '', toolCalls, [{ content: '4183' }])

        expect(result).toEqual([
            { role: 'system', content: 'sys' },
            { role: 'user', content: 'what is 47 * 89?' },
            { role: 'assistant', content: '', toolCalls },
            { role: 'tool', content: '4183', toolName: 'calculator' },
        ])
    })

    it('handles multiple parallel tool calls, matching results by position', () => {
        const base: ChatMessage[] = [{ role: 'user', content: 'weather in NY and London?' }]
        const toolCalls: ToolCall[] = [
            { name: 'get_temperature', arguments: { city: 'New York' } },
            { name: 'get_temperature', arguments: { city: 'London' } },
        ]

        const result = buildToolFollowupMessages(base, '', toolCalls, [
            { content: '22°C' },
            { content: '15°C' },
        ])

        expect(result.slice(1)).toEqual([
            { role: 'assistant', content: '', toolCalls },
            { role: 'tool', content: '22°C', toolName: 'get_temperature' },
            { role: 'tool', content: '15°C', toolName: 'get_temperature' },
        ])
    })

    it('carries an isError tool result through as plain content, unchanged', () => {
        const base: ChatMessage[] = [{ role: 'user', content: 'divide 1 by 0' }]
        const toolCalls: ToolCall[] = [{ name: 'calculator', arguments: { operation: 'divide', a: 1, b: 0 } }]

        const result = buildToolFollowupMessages(base, '', toolCalls, [
            { content: 'Division by zero', isError: true },
        ])

        expect(result[result.length - 1]).toEqual({
            role: 'tool',
            content: 'Division by zero',
            toolName: 'calculator',
        })
    })

    it('does not mutate the baseMessages array it was given', () => {
        const base: ChatMessage[] = [{ role: 'user', content: 'hi' }]
        const originalLength = base.length

        buildToolFollowupMessages(base, '', [{ name: 'x', arguments: {} }], [{ content: 'y' }])

        expect(base).toHaveLength(originalLength)
    })

    it('throws when toolCalls and toolResults lengths do not match', () => {
        expect(() =>
            buildToolFollowupMessages([], '', [{ name: 'a', arguments: {} }], [])
        ).toThrow(/length mismatch/)
    })
})