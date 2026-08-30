import { loadConfig } from "../config/loadConfig.js";
import type { AppConfig } from "../config/types.js";
import * as readline from 'node:readline';
import { createProvider } from "../providers/factory.js";
import { appendAssistantMessage, appendUserMessage, createConversation, removeLastMessage, toMessages, type Conversation } from "../agent/conversation.js";
import type { ChatProvider } from "../providers/types.js";
import { truncateToFit } from "../agent/contextWindow.js";
import { ToolRegistry } from "../tools/registry.js";
import { calculatorTool } from "../tools/lib/calculator/index.js";
import { registerEnabledTools } from "../tools/registerEnabledTools.js";
import { buildToolFollowupMessages } from "../agent/toolExchange.js";

export class AgentREPL {

    private readonly rl: readline.Interface
    private config: AppConfig
    private provider: ChatProvider
    private conversation: Conversation
    private toolRegistry: ToolRegistry

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

        //Tools Registry
        this.toolRegistry = new ToolRegistry
        registerEnabledTools(
            this.toolRegistry,
            [
                calculatorTool
            ], //Tools catalog. All tools must be present in this catalog array
            this.config.tools.enabled)

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

        const droppedPairs = truncateToFit(this.conversation, this.config.agent.maxContextTokens) //Truncate the conversation to fit within the max context tokens
        if (droppedPairs > 0) {
            console.log(`Dropped ${droppedPairs} old turn${droppedPairs > 1 ? 's' : ''} to fit within max context tokens.`)
        }

        this.rl.pause() //Pause the prompt while waiting for the provider response

        //Call the provider's chat method with the conversation messages, handle the response, and re-prompt
        this.provider.chat(toMessages(this.conversation), { tools: this.toolRegistry.getToolDefinitions() }).then(async (response) => {

            if (response.finishReason === "tool_calls" && response.toolCalls?.length) {
                const toolCallResults = await Promise.all(response.toolCalls?.map(call => this.toolRegistry.execute(call)))
                const followUpMessages = buildToolFollowupMessages(toMessages(this.conversation), response.content, response.toolCalls, toolCallResults)
                const final = await this.provider.chat(followUpMessages, { tools: this.toolRegistry.getToolDefinitions() })
                appendAssistantMessage(this.conversation, final.content)
                console.log(final.content)
                return
            }

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