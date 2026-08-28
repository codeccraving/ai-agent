import type { ChatMessage } from "../providers/types.js";
import type { Conversation } from "./conversation.js";

export function estimateTokens(text: string): number {
    return text.length == 0 ? 0 : Math.ceil(text.length / 4) //Roughly 4 characters per token
}

export function estimateMessageTokens(message: ChatMessage): number { //content estimate plus a small fixed overhead constant (role/delimiter formatting most chat APIs add) — 4 is a reasonable starting constant, not load-bearing precision.
    return estimateTokens(message.content) + 4
}

export function estimateConversationTokens(conversation: Conversation): number{
    let totalTokens = estimateTokens(conversation.systemPrompt) + 4 //System prompt estimate plus overhead
    for (const message of conversation.history) {
        totalTokens += estimateMessageTokens(message)
    }
    return totalTokens
}