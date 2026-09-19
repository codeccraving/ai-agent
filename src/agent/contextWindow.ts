import type { Conversation } from "./conversation.js";
import { estimateConversationTokens } from "./tokenCount.js";

export function truncateToFit(conversation: Conversation, maxTokens: number): number {

    let droppedTurns = 0
    let turnsIndexes: number[] = []

    for (const [i, message] of conversation.history.entries()) {
        if (message.role === "user") {
            turnsIndexes.push(i)
        }
    }

    while (turnsIndexes.length > 1 && estimateConversationTokens(conversation) > maxTokens) {
        conversation.history.splice(0, (turnsIndexes[1] as number) - (turnsIndexes[0] as number))
        droppedTurns++
        turnsIndexes.splice(0, 1)
    }

    return droppedTurns
}