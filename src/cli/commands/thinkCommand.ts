export type ThinkCommand =
    | { kind: 'set'; value: boolean }
    | { kind: 'reset' }
    | { kind: 'status' }
    | { kind: 'invalid'; raw: string }

// Returns null only when the line is not a /think command at all.
export function parseThinkCommand(line: string): ThinkCommand | null {
    let [command, ...args] = line.split(' ')?.filter(arg => arg.trim().length > 0) // filter out empty strings from multiple spaces
    let firstArg = args?.[0] ? args[0].trim() : undefined

    command = command?.trim() // trim whitespace from the command itself

    if (command === "") {
        return null
    }

    if (command?.toLowerCase() === "/think") {

        firstArg = firstArg?.toLowerCase()

        if (!firstArg || firstArg === "status") {
            return { kind: 'status' }
        }

        if (firstArg === "on") {
            return { kind: 'set', value: true }
        }

        if (firstArg === "off") {
            return { kind: 'set', value: false }
        }

        if (firstArg === "default" || firstArg === "reset") {
            return { kind: 'reset' }
        }
        
        return { kind: 'invalid', raw: args.join(' ') } // return the raw argument string for invalid commands
    }

    return null
}