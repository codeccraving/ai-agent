import type { ChatMessage, ToolCall } from "../providers/types.js"

export interface Conversation {
    systemPrompt: string
    history: ChatMessage[]   // user/assistant turns only — system prompt is not stored in here
}

export function createConversation(systemPrompt: string): Conversation {
    const conversation: Conversation = {
        systemPrompt,
        history: []
    }
    return conversation
}

// Assembles the full array to send to provider.chat() — system prompt first, then history in order
export function toMessages(conversation: Conversation): ChatMessage[] {
    return [{ role: "system", content: conversation.systemPrompt }, ...conversation.history]
}

export function appendUserMessage(conversation: Conversation, content: string): void {
    conversation.history.push({ role: "user", content })
}

export function appendAssistantMessage(conversation: Conversation, content: string, toolCalls?: ToolCall[]): void {
    const chatMessage: ChatMessage = { role: "assistant", content }
    if (toolCalls !== undefined && toolCalls?.length > 0) {
        chatMessage.toolCalls = toolCalls
    }
    conversation.history.push(chatMessage)
}

export function appendToolMessage(conversation: Conversation, toolName: string, content: string): void {
    conversation.history.push({ role: "tool", toolName, content })
}

// Removes the most recently appended message — used to roll back a user turn
// when the provider call for it fails (see failure handling below)
export function removeLastMessage(conversation: Conversation): void {
    conversation.history.pop()
}

export function rollbackTo(conversation: Conversation, length: number): void {
    if (length >= conversation.history.length) return
    conversation.history.length = length
}