import { loadConfig } from "../config/loadConfig.js";
import type { AppConfig } from "../config/types.js";
import * as readline from 'node:readline';
import { createProvider } from "../providers/factory.js";
import { appendAssistantMessage, appendUserMessage, createConversation, removeLastMessage, toMessages, type Conversation } from "../agent/conversation.js";
import type { ChatOptions, ChatProvider, ToolCall } from "../providers/types.js";
import { truncateToFit } from "../agent/contextWindow.js";
import { ToolRegistry } from "../tools/registry.js";
import { calculatorTool } from "../tools/lib/calculator/index.js";
import { registerEnabledTools } from "../tools/registerEnabledTools.js";
import { buildToolFollowupMessages } from "../agent/toolExchange.js";
import { parseThinkCommand, type ThinkCommand } from "./commands/thinkCommand.js";
import { classifyToolCalls } from "../agent/confirmGate.js";
import type { ToolResult } from "../tools/types.js";
import { createReadFileTool } from "../tools/lib/readFile/index.js";
import { createWriteFileTool } from "../tools/lib/writeFile/index.js";
import { createGitTool } from "../tools/lib/git/index.js";
import { createRunShellCommandTool } from "../tools/lib/runShellCommand/index.js";
import { createRunTestsTool } from "../tools/lib/runTests/index.js";

export class AgentREPL {

    private readonly rl: readline.Interface
    private config: AppConfig
    private provider: ChatProvider
    private conversation: Conversation
    private toolRegistry: ToolRegistry
    private thinkOverride: boolean | undefined
    private awaitingApproval: boolean = false

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
                calculatorTool,
                createReadFileTool(this.config.agent.projectRoot),
                createWriteFileTool(this.config.agent.projectRoot),
                createGitTool(this.config.agent.projectRoot),
                createRunShellCommandTool(this.config.agent.projectRoot, this.config.agent.toolTimeoutMs),
                createRunTestsTool(this.config.agent.projectRoot, this.config.agent.toolTimeoutMs),
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

    private handleThinkCommand(command: ThinkCommand): void {
        if (command.kind === "set") {
            this.thinkOverride = command.value
            console.log(`Think mode set to ${this.thinkOverride}`)
        } else if (command.kind === "reset") {
            this.thinkOverride = undefined
            console.log(`Think mode reset to default (${this.config.agent.thinkDefault})`)
        } else if (command.kind === "status") {
            const effectiveThinkMode = this.thinkOverride !== undefined ? this.thinkOverride : this.config.agent.thinkDefault
            console.log(`Think mode is currently ${effectiveThinkMode}`)
        } else if (command.kind === "invalid") {
            console.log(`Invalid /think command: ${command.raw}. Valid commands are: /think on, /think off, /think reset, /think status`)
        }
    }

    private async promptApproval(message: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.rl.question(message, (answer) => {
                const normalized = answer.trim().toLowerCase()
                if (normalized === "y" || normalized === "yes") {
                    resolve(true)
                } else if (normalized === "n" || normalized === "no") {
                    resolve(false)
                } else {
                    console.log("Invalid answer. Please enter 'y' or 'n'.")
                    resolve(this.promptApproval(message)) //Re-prompt until valid answer
                }
            })
        })
    }

    private async handleToolCalls(toolCalls: ToolCall[]): Promise<string> {

        //Classify the tool calls to determine which ones need confirmation
        const toolCallResults: (ToolResult | { isError: true; content: string })[] = Array(toolCalls.length).fill(false)
        const { needsConfirmation } = classifyToolCalls(this.toolRegistry, toolCalls)
        const auto: Record<number, ToolCall> = {}
        const gated: Record<number, ToolCall> = {}

        //Separate the tool calls into those that can be executed automatically and those that need user confirmation
        for (let i = 0; i < toolCalls.length; i++) {
            if (!needsConfirmation[i]) {
                auto[i] = toolCalls[i] as ToolCall
            } else {
                gated[i] = toolCalls[i] as ToolCall
            }
        }

        // Execute the tool calls that don't need confirmation automatically
        if (Object.keys(auto).length > 0) {
            const results = await Promise.all(Object.values(auto).map(call => this.toolRegistry.execute(call)))
            for (let i = 0; i < results.length; i++) {
                toolCallResults[Number(Object.keys(auto)[i])] = results[i] as ToolResult
            }
        }

        // Prompt the user for confirmation on the tool calls that need it
        if (Object.keys(gated).length > 0) {

            for (let [i, toolCall] of Object.values(gated).entries()) {
                //show the tool name and its args in a human-readable way (e.g. for writeFile, the path and maybe a byte count, not a raw dump of file contents), then wait for yes/no.
                this.awaitingApproval = true //Set a flag to indicate that we're awaiting user approval
                this.rl.pause() //Pause the prompt while waiting for user approval
                const approved = await this.promptApproval(`Tool call "${toolCall.name}" with arguments ${JSON.stringify(toolCall.arguments)} is potentially destructive. Do you want to proceed? (y/n): `)
                const toolContent = `${toolCall.name}(${toolCall?.arguments ? JSON.stringify(toolCall.arguments) : ''})`
                if (approved) {
                    const result = await this.toolRegistry.execute(toolCall)
                    toolCallResults[Number(Object.keys(gated)[i])] = result
                } else {
                    toolCallResults[Number(Object.keys(gated)[i])] = { isError: true, content: `${toolContent} -> declined by user` }
                }
                this.awaitingApproval = false //Clear the flag
                this.rl.resume() //Resume the prompt after user approval is done
            }
        }

        return toolCallResults.map(result => result.content).join("\n")
    }

    private onLineInputFn(input: string) {

        //If we're currently awaiting user approval for a tool call, ignore any new input until the approval process is complete
        if (this.awaitingApproval) {
            return
        }

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

        //Check if the input is a /think command and handle it if so
        const thinkCommand = parseThinkCommand(message)
        if (thinkCommand != null) {
            this.handleThinkCommand(thinkCommand)
            this.rl.prompt()
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
        const chatOptions: ChatOptions = { tools: this.toolRegistry.getToolDefinitions() }
        const think = this.thinkOverride ?? this.config.agent.thinkDefault

        if (think != undefined) {
            chatOptions.think = think
        }

        this.provider.chat(toMessages(this.conversation), chatOptions).then(async (response) => {

            let content: string = response.content
            if (response.finishReason === "tool_calls" && response.toolCalls?.length) {
                content = await this.handleToolCalls(response.toolCalls)
            }

            appendAssistantMessage(this.conversation, content) //Append the assistant's response to the conversation history
            console.log(this.conversation.history)
            console.log(content) //Print the assistant's response to the console
        }).catch(e => {
            removeLastMessage(this.conversation) //Roll back the user message that failed to get a response
            console.error("Error:", e.message)
        }).finally(() => {
            this.rl.resume() //Resume the prompt after the provider call is done (success or failure)
            this.rl.prompt() //Re-prompt after the provider call is done (success or failure)
        })
    }

}