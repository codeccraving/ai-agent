import { describe, it, expect } from 'vitest'
import { parseThinkCommand } from './thinkCommand.js'

describe('parseThinkCommand', () => {
    it('returns null for ordinary chat input', () => {
        expect(parseThinkCommand('what is 47 times 89?')).toBeNull()
    })

    it('returns null for a line that merely contains "/think" as a substring, not as the command', () => {
        expect(parseThinkCommand('what does /thinking mode mean?')).toBeNull()
    })

    it('parses "/think" alone as a status query', () => {
        expect(parseThinkCommand('/think')).toEqual({ kind: 'status' })
    })

    it('parses "/think on" as an explicit enable', () => {
        expect(parseThinkCommand('/think on')).toEqual({ kind: 'set', value: true })
    })

    it('parses "/think off" as an explicit disable', () => {
        expect(parseThinkCommand('/think off')).toEqual({ kind: 'set', value: false })
    })

    it('parses "/think default" as clearing the session override', () => {
        expect(parseThinkCommand('/think default')).toEqual({ kind: 'reset' })
    })

    it('parses "/think reset" as an alias for "/think default"', () => {
        expect(parseThinkCommand('/think reset')).toEqual({ kind: 'reset' })
    })

    it('returns invalid with the raw argument for an unrecognized argument', () => {
        expect(parseThinkCommand('/think blah blah')).toEqual({ kind: 'invalid', raw: 'blah blah' })
    })

    it('is case-insensitive on both the command and the argument', () => {
        expect(parseThinkCommand('/THINK ON')).toEqual({ kind: 'set', value: true })
        expect(parseThinkCommand('/Think Off')).toEqual({ kind: 'set', value: false })
    })

    it('tolerates surrounding and repeated whitespace', () => {
        expect(parseThinkCommand('   /think    on   ')).toEqual({ kind: 'set', value: true })
    })

    it('ignores extra trailing arguments beyond the first', () => {
        expect(parseThinkCommand('/think on please')).toEqual({ kind: 'set', value: true })
    })

    it('returns null for an empty line', () => {
        expect(parseThinkCommand('')).toBeNull()
    })

    it('returns null for whitespace-only input', () => {
        expect(parseThinkCommand('   ')).toBeNull()
    })
})