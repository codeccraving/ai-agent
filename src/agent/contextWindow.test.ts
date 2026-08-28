import { describe, it, expect } from "vitest"
import { truncateToFit } from "./contextWindow.js"
import { estimateConversationTokens } from "./tokenCount.js"
import { createConversation, appendUserMessage, appendAssistantMessage } from "./conversation.js"

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

    it("drops the oldest complete turn-pair first when over budget", () => {
        const conversation = createConversation("sys")
        appendUserMessage(conversation, "first user message")
        appendAssistantMessage(conversation, "first assistant reply")
        appendUserMessage(conversation, "second user message")
        appendAssistantMessage(conversation, "second assistant reply")
        appendUserMessage(conversation, "newest in-flight message")

        // Budget tight enough to force dropping the oldest pair, generous enough
        // to keep the rest.
        const full = estimateConversationTokens(conversation)
        const afterDroppingOldestPair = (() => {
            const clone = createConversation("sys")
            appendUserMessage(clone, "second user message")
            appendAssistantMessage(clone, "second assistant reply")
            appendUserMessage(clone, "newest in-flight message")
            return estimateConversationTokens(clone)
        })()

        const dropped = truncateToFit(conversation, afterDroppingOldestPair)

        expect(dropped).toBe(1)
        expect(conversation.history.map(m => m.content)).toEqual([
            "second user message",
            "second assistant reply",
            "newest in-flight message",
        ])
        expect(full).toBeGreaterThan(afterDroppingOldestPair) // sanity check on the fixture
    })

    it("drops multiple oldest pairs in one call if needed", () => {
        const conversation = createConversation("sys")
        appendUserMessage(conversation, "turn one user")
        appendAssistantMessage(conversation, "turn one assistant")
        appendUserMessage(conversation, "turn two user")
        appendAssistantMessage(conversation, "turn two assistant")
        appendUserMessage(conversation, "newest in-flight message")

        // Budget so tight only the newest message survives.
        const tightBudget = estimateConversationTokens({
            systemPrompt: "sys",
            history: [{ role: "user", content: "newest in-flight message" }],
        })

        const dropped = truncateToFit(conversation, tightBudget)

        expect(dropped).toBe(2)
        expect(conversation.history).toHaveLength(1)
        expect(conversation.history[0]?.content).toBe("newest in-flight message")
    })

    it("never drops the newest in-flight message, even if it alone exceeds the budget", () => {
        const conversation = createConversation("sys")
        appendUserMessage(conversation, "a".repeat(10_000))

        const dropped = truncateToFit(conversation, 1) // impossibly small budget

        expect(dropped).toBe(0)
        expect(conversation.history).toHaveLength(1)
        // Caller is expected to check estimateConversationTokens() itself afterward
        // to detect this still-over-budget case if it wants to warn/log.
        expect(estimateConversationTokens(conversation)).toBeGreaterThan(1)
    })

    it("returns 0 and leaves an empty conversation untouched", () => {
        const conversation = createConversation("sys")
        const dropped = truncateToFit(conversation, 5)
        expect(dropped).toBe(0)
        expect(conversation.history).toHaveLength(0)
    })
})