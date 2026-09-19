// src/agent/conversation.test.ts
import { describe, it, expect } from 'vitest';
import {
    createConversation,
    toMessages,
    appendUserMessage,
    appendAssistantMessage,
    removeLastMessage,
    appendToolMessage,
    rollbackTo,
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

describe('appendAssistantMessage with toolCalls', () => {
    it('adds an assistant message with a toolCalls field when tool calls are passed', () => {
        const conversation = createConversation('sys');
        const toolCalls = [{ name: 'readFile', arguments: { path: 'a.txt' } }];
        appendAssistantMessage(conversation, '', toolCalls);

        expect(conversation.history).toEqual([
            { role: 'assistant', content: '', toolCalls },
        ]);
    });

    it('omits the toolCalls field entirely when not passed, unchanged from prior behavior', () => {
        const conversation = createConversation('sys');
        appendAssistantMessage(conversation, 'hi there');

        expect(conversation.history).toEqual([
            { role: 'assistant', content: 'hi there' },
        ]);
        expect('toolCalls' in conversation.history[0]!).toBe(false);
    });

    it('omits the toolCalls field when passed an empty array', () => {
        const conversation = createConversation('sys');
        appendAssistantMessage(conversation, 'hi', []);

        expect('toolCalls' in conversation.history[0]!).toBe(false);
    });
});

describe('appendToolMessage', () => {
    it('adds a tool-role message carrying the tool name and result content', () => {
        const conversation = createConversation('sys');
        appendToolMessage(conversation, 'readFile', 'Tool[readFile(...)] -> success\nResult: hello');

        expect(conversation.history).toEqual([
            { role: 'tool', content: 'Tool[readFile(...)] -> success\nResult: hello', toolName: 'readFile' },
        ]);
    });
});

describe('rollbackTo', () => {
    it('truncates history back to the given length, undoing everything after it', () => {
        const conversation = createConversation('sys');
        appendUserMessage(conversation, 'user1');
        appendAssistantMessage(conversation, 'assistant1');
        const marker = conversation.history.length;
        appendUserMessage(conversation, 'user2');
        appendAssistantMessage(conversation, '', [{ name: 'readFile', arguments: {} }]);
        appendToolMessage(conversation, 'readFile', 'result');

        rollbackTo(conversation, marker);

        expect(conversation.history).toEqual([
            { role: 'user', content: 'user1' },
            { role: 'assistant', content: 'assistant1' },
        ]);
    });

    it('is a no-op when length is already at or past the current length', () => {
        const conversation = createConversation('sys');
        appendUserMessage(conversation, 'hello');

        rollbackTo(conversation, 5);

        expect(conversation.history).toEqual([{ role: 'user', content: 'hello' }]);
    });

    it('rolling back to 0 empties the history, matching a full-turn undo', () => {
        const conversation = createConversation('sys');
        appendUserMessage(conversation, 'hello');
        appendAssistantMessage(conversation, 'hi');

        rollbackTo(conversation, 0);

        expect(conversation.history).toEqual([]);
    });
});