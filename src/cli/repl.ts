import { loadConfig } from "../config/loadConfig.js";
import type { AppConfig } from "../config/types.js";
import * as readline from 'node:readline';
import { createProvider } from "../providers/factory.js";
import { appendAssistantMessage, appendUserMessage, createConversation, removeLastMessage, toMessages, type Conversation } from "../agent/conversation.js";
import type { ChatProvider } from "../providers/types.js";

export class AgentREPL {

    private readonly rl: readline.Interface
    private config: AppConfig
    private provider: ChatProvider
    private conversation: Conversation

    constructor() {
        try {
            this.config = loadConfig()
            this.provider = createProvider(this.config)
            this.conversation = createConversation(this.config.agent.systemPrompt)
        } catch (e) {
            console.error((e as Error).message)
            process.exit(1) // Failed
        }

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: "> "
        })

        //Events
        this.rl.on("SIGINT", this.exit.bind(this)) //Ctrl+C (SIGINT): readline interfaces emit their own 'SIGINT'
        this.rl.on("line", this.onLineInputFn.bind(this))

        //Startup messages
        console.log(`Agent scaffolding ready (provider: ${this.config.llm.provider})`)
        this.rl.prompt() //Initial prompt starts
    }

    private exit() {
        this.rl.close()
        console.log("Goodbye!")
        process.exit(0) // Success
    }

    private onLineInputFn(input: string) {
        let message = input.trim()

        //If empty after trimming, ignore it — re-prompt without sending anything
        if (message.length === 0) {
            this.rl.prompt()
            return
        }

        //Typed exit: check the trimmed line inside your 'line' handler, call rl.close()
        if (message === "exit") {
            this.exit()
            return
        }

        //Append the user message to the conversation history
        appendUserMessage(this.conversation, message)
        this.rl.pause() //Pause the prompt while waiting for the provider response
    
        //Call the provider's chat method with the conversation messages, handle the response, and re-prompt
        this.provider.chat(toMessages(this.conversation)).then((response) => {
            appendAssistantMessage(this.conversation, response.content) //Append the assistant's response to the conversation history
            console.log(response.content) //Print the assistant's response to the console
        }).catch(e => {
            removeLastMessage(this.conversation) //Roll back the user message that failed to get a response
            console.error("Error:", e.message)
        }).finally(() => {
            this.rl.resume() //Resume the prompt after the provider call is done (success or failure)
            this.rl.prompt() //Re-prompt after the provider call is done (success or failure)
        })
    }

}