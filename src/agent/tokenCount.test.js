import { describe, it, expect } from "vitest"
import { estimateTokens, estimateMessageTokens, estimateConversationTokens } from "./tokenCount.js"
import { createConversation, appendUserMessage, appendAssistantMessage } from "./conversation.js"

describe("estimateTokens", () => {
    it("returns 0 for an empty string", () => {
        expect(estimateTokens("")).toBe(0)
    })

    it("rounds up to the nearest token for partial chars-per-token remainders", () => {
        // 5 chars / 4 chars-per-token = 1.25 -> rounds up to 2
        expect(estimateTokens("abcde")).toBe(2)
    })

    it("scales roughly linearly with text length", () => {
        const short = estimateTokens("a".repeat(40))
        const long = estimateTokens("a".repeat(400))
        expect(long).toBeGreaterThan(short)
        expect(long).toBeCloseTo(short * 10, -1)
    })
})

describe("estimateMessageTokens", () => {
    it("adds fixed overhead on top of the content estimate", () => {
        const contentOnly = estimateTokens("hello world")
        const messageTotal = estimateMessageTokens({ role: "user", content: "hello world" })
        expect(messageTotal).toBeGreaterThan(contentOnly)
    })

    it("still returns the overhead for an empty-content message", () => {
        const messageTotal = estimateMessageTokens({ role: "assistant", content: "" })
        expect(messageTotal).toBeGreaterThan(0)
    })
})

describe("estimateConversationTokens", () => {
    it("counts the system prompt even with empty history", () => {
        const conversation = createConversation("You are a helpful assistant.")
        const expected = estimateMessageTokens({ role: "system", content: conversation.systemPrompt })
        expect(estimateConversationTokens(conversation)).toBe(expected)
    })

    it("sums system prompt plus every history message", () => {
        const conversation = createConversation("sys")
        appendUserMessage(conversation, "hello")
        appendAssistantMessage(conversation, "hi there")

        const expected =
            estimateMessageTokens({ role: "system", content: "sys" }) +
            estimateMessageTokens({ role: "user", content: "hello" }) +
            estimateMessageTokens({ role: "assistant", content: "hi there" })

        expect(estimateConversationTokens(conversation)).toBe(expected)
    })

    it("increases as more turns are appended", () => {
        const conversation = createConversation("sys")
        const before = estimateConversationTokens(conversation)
        appendUserMessage(conversation, "a reasonably long message to push the count up")
        const after = estimateConversationTokens(conversation)
        expect(after).toBeGreaterThan(before)
    })
})