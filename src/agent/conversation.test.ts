// src/agent/conversation.test.ts
import { describe, it, expect } from 'vitest';
import {
    createConversation,
    toMessages,
    appendUserMessage,
    appendAssistantMessage,
    removeLastMessage,
} from './conversation.js';

describe('createConversation', () => {
    it('creates a conversation with the given system prompt and empty history', () => {
        const conversation = createConversation('You are a helpful assistant.');

        expect(conversation).toEqual({
            systemPrompt: 'You are a helpful assistant.',
            history: [],
        });
    });
});

describe('toMessages', () => {
    it('returns just the system message when history is empty', () => {
        const conversation = createConversation('You are a helpful assistant.');

        expect(toMessages(conversation)).toEqual([
            { role: 'system', content: 'You are a helpful assistant.' },
        ]);
    });

    it('returns the system message followed by history in insertion order', () => {
        const conversation = createConversation('sys');
        appendUserMessage(conversation, 'user1');
        appendAssistantMessage(conversation, 'assistant1');
        appendUserMessage(conversation, 'user2');
        appendAssistantMessage(conversation, 'assistant2');

        expect(toMessages(conversation)).toEqual([
            { role: 'system', content: 'sys' },
            { role: 'user', content: 'user1' },
            { role: 'assistant', content: 'assistant1' },
            { role: 'user', content: 'user2' },
            { role: 'assistant', content: 'assistant2' },
        ]);
    });
});

describe('appendUserMessage', () => {
    it('adds a user-role message to history', () => {
        const conversation = createConversation('sys');
        appendUserMessage(conversation, 'hello');

        expect(conversation.history).toEqual([
            { role: 'user', content: 'hello' },
        ]);
    });

    it('mutates the conversation object in place rather than returning a copy', () => {
        const conversation = createConversation('sys');
        const sameRef = conversation;
        appendUserMessage(conversation, 'hello');

        expect(sameRef.history).toEqual([
            { role: 'user', content: 'hello' },
        ]);
    });
});

describe('appendAssistantMessage', () => {
    it('adds an assistant-role message to history', () => {
        const conversation = createConversation('sys');
        appendAssistantMessage(conversation, 'hi there');

        expect(conversation.history).toEqual([
            { role: 'assistant', content: 'hi there' },
        ]);
    });
});

describe('removeLastMessage', () => {
    it('undoes a single appended user message, matching the repl.ts rollback path', () => {
        const conversation = createConversation('sys');
        appendUserMessage(conversation, 'this call is about to fail');
        removeLastMessage(conversation);

        expect(toMessages(conversation)).toEqual([
            { role: 'system', content: 'sys' },
        ]);
    });

    it('removes only the most recently appended message, not the whole history', () => {
        const conversation = createConversation('sys');
        appendUserMessage(conversation, 'user1');
        appendAssistantMessage(conversation, 'assistant1');
        appendUserMessage(conversation, 'user2');
        removeLastMessage(conversation);

        expect(toMessages(conversation)).toEqual([
            { role: 'system', content: 'sys' },
            { role: 'user', content: 'user1' },
            { role: 'assistant', content: 'assistant1' },
        ]);
    });

    it('is a no-op on an empty history rather than throwing', () => {
        const conversation = createConversation('sys');

        expect(() => removeLastMessage(conversation)).not.toThrow();
        expect(conversation.history).toEqual([]);
    });
});