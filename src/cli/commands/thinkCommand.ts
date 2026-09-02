export type ThinkCommand =
    | { kind: 'set'; value: boolean }
    | { kind: 'reset' }
    | { kind: 'status' }
    | { kind: 'invalid'; raw: string }

// Returns null only when the line is not a /think command at all.
export function parseThinkCommand(line: string): ThinkCommand | null {
    const lineTrimmed = line.trim().toLowerCase() // value is case-insensitive

    if (lineTrimmed === "") {
        return null
    }

    const valueTrimmed = lineTrimmed.slice(7).trim()?.split(' ')?.[0] // value is everything after "/think"
    const trimmed = `/think${valueTrimmed === '' ? '' : ' ' + valueTrimmed}` // normalized form of the line, with a single space after "/think"

    if (trimmed === "/think") {
        return { kind: 'status' }
    } else if (trimmed === "/think on") {
        return { kind: 'set', value: true }
    } else if (trimmed === "/think off") {
        return { kind: 'set', value: false }
    } else if (trimmed === "/think default" || trimmed === "/think reset") {
        return { kind: 'reset' }
    } else if (lineTrimmed.startsWith("/think ")) {
        return { kind: 'invalid', raw: valueTrimmed as string }
    }

    return null
}