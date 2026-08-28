import type { Conversation } from "./conversation.js";
import { estimateConversationTokens } from "./tokenCount.js";

// What it does, step by step:

// Look at the conversation's estimated token count.
// If it's over maxTokens, delete the oldest user+assistant pair (both messages together, never just one).
// Repeat until either the count fits, or only one message is left.

// Two things it will never delete:

// The system prompt. It's not even in history — M2 stores it separately — so it's not touched.
// The newest message. This is always the user's message that was just typed, sent to this function right before the provider call. Even if that one message alone is bigger than maxTokens, it stays. Deleting it would mean silently ignoring what the user just said, which is a worse failure than sending an oversized request and letting the provider reject it.

// The function returns how many pairs it dropped, purely so repl.ts can log a line like "dropped 2 old turns" if it wants to — contextWindow.ts doesn't do any logging itself. It also doesn't return whether the result is still over budget (the one-huge-message case above); if you need to know that, just call estimateConversationTokens(conversation) > maxTokens yourself after.
export function truncateToFit(conversation: Conversation, maxTokens: number): number {

    let droppedPairs = 0
    while (conversation.history.length > 1 && estimateConversationTokens(conversation) > maxTokens) {
        // Remove the oldest user+assistant pair (two messages)
        conversation.history.splice(0, 2)
        droppedPairs++
    }

    if(droppedPairs > 0) {
        console.log(`Dropped ${droppedPairs} old turn${droppedPairs > 1 ? 's' : ''} to fit within max context tokens.`)
    }

    return droppedPairs

}