import { describe, it, expect } from "vitest"
import { truncateToFit } from "./contextWindow.js"
import { estimateConversationTokens } from "./tokenCount.js"
import { createConversation, appendUserMessage, appendAssistantMessage, appendToolMessage } from "./conversation.js"

describe("truncateToFit", () => {
    it("does nothing when the conversation is already within budget", () => {
        const conversation = createConversation("sys")
        appendUserMessage(conversation, "hi")
        appendAssistantMessage(conversation, "hello")

        const before = estimateConversationTokens(conversation)
        const dropped = truncateToFit(conversation, before + 100)

        expect(dropped).toBe(0)
        expect(conversation.history).toHaveLength(2)
    })

    it("drops a plain two-message turn exactly like before (no regression)", () => {
        const conversation = createConversation("sys")
        appendUserMessage(conversation, "first user message")
        appendAssistantMessage(conversation, "first assistant reply")
        appendUserMessage(conversation, "second user message")
        appendAssistantMessage(conversation, "second assistant reply")
        appendUserMessage(conversation, "newest in-flight message")

        const afterDroppingOldestTurn = (() => {
            const clone = createConversation("sys")
            appendUserMessage(clone, "second user message")
            appendAssistantMessage(clone, "second assistant reply")
            appendUserMessage(clone, "newest in-flight message")
            return estimateConversationTokens(clone)
        })()

        const dropped = truncateToFit(conversation, afterDroppingOldestTurn)

        expect(dropped).toBe(1)
        expect(conversation.history.map(m => m.content)).toEqual([
            "second user message",
            "second assistant reply",
            "newest in-flight message",
        ])
    })

    it("drops a whole multi-step ReAct turn as one unit, not by fixed pairs", () => {
        const conversation = createConversation("sys")
        // Oldest turn: a 3-step tool exchange (7 messages)
        appendUserMessage(conversation, "old turn: do a multi-step task")
        appendAssistantMessage(conversation, "", [{ name: "readFile", arguments: { path: "a.txt" } }])
        appendToolMessage(conversation, "readFile", "Tool[readFile] -> success")
        appendAssistantMessage(conversation, "", [{ name: "runTests", arguments: {} }])
        appendToolMessage(conversation, "runTests", "Tool[runTests] -> success")
        appendAssistantMessage(conversation, "final answer for old turn")
        // Newest turn: plain
        appendUserMessage(conversation, "newest in-flight message")

        const afterDroppingOldestTurn = (() => {
            const clone = createConversation("sys")
            appendUserMessage(clone, "newest in-flight message")
            return estimateConversationTokens(clone)
        })()

        const dropped = truncateToFit(conversation, afterDroppingOldestTurn)

        expect(dropped).toBe(1)
        expect(conversation.history).toEqual([
            { role: "user", content: "newest in-flight message" },
        ])
    })

    it("never drops the newest turn, even if it alone exceeds the budget", () => {
        const conversation = createConversation("sys")
        appendUserMessage(conversation, "a".repeat(10_000))

        const dropped = truncateToFit(conversation, 1)

        expect(dropped).toBe(0)
        expect(conversation.history).toHaveLength(1)
        expect(estimateConversationTokens(conversation)).toBeGreaterThan(1)
    })

    it("returns 0 and leaves an empty conversation untouched", () => {
        const conversation = createConversation("sys")
        const dropped = truncateToFit(conversation, 5)
        expect(dropped).toBe(0)
        expect(conversation.history).toHaveLength(0)
    })
})