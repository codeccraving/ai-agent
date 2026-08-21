import { loadConfig } from "../config/loadConfig.js";
import type { AppConfig } from "../config/types.js";
import * as readline from 'node:readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> "
})

//Exit
function exit() {
    rl.close()
    console.log("Goodbye!")
    process.exit(0) // Success
}

//SIGINT Event
//Ctrl+C (SIGINT): readline interfaces emit their own 'SIGINT'
rl.on("SIGINT", exit)

// rl.question(query, callback) - M2

function onLineInputFn(input: string) {
    let message = input.trim()

    //Typed exit: check the trimmed line inside your 'line' handler, call rl.close()
    if (message === "exit") {
        exit()
    }

    console.log(`[stub] ${message}`)
    rl.prompt()
}

rl.on("line", onLineInputFn)

export function startRepl() {

    let config: AppConfig
    try {
        config = loadConfig()
    } catch (e) {
        console.error((e as Error).message)
        process.exit(1) // Failed
    }

    //Startup messages
    console.log(`Agent scaffolding ready (provider: ${config.llm.provider})`)

    rl.prompt() //Initial prompt starts
}