import { randomUUID } from "node:crypto";
import type { Conversation, Message, User } from "./types.ts";

export class Store {
    private readonly users = new Map<string, User>();
    private readonly conversations = new Map<string, Conversation>();

    constructor() {
        this.seed();
    }

    private seed(): void {
        const general: Conversation = {
            id: randomUUID(),
            name: "General",
            messages: [],
        };

        const development: Conversation = {
            id: randomUUID(),
            name: "Development",
            messages: [],
        };

        this.conversations.set(general.id, general);
        this.conversations.set(development.id, development);
    }

    getOrCreateGuest(): User {
        const id = randomUUID();
        const user: User = {
            id,
            username: `Guest-${id.slice(0, 6)}`,
        };

        this.users.set(id, user);
        return user;
    }

    getConversations(): Conversation[] {
        return [...this.conversations.values()].map(conversation => ({
            ...conversation,
            messages: conversation.messages.map(message => ({
                ...message,
                author: { ...message.author },
            })),
        }));
    }

    getConversation(id: string): Conversation | undefined {
        return this.conversations.get(id);
    }

    createConversation(name: string): Conversation {
        const conversation: Conversation = {
            id: randomUUID(),
            name,
            messages: [],
        };

        this.conversations.set(conversation.id, conversation);
        return conversation;
    }

    addMessage(
        conversationId: string,
        author: User,
        content: string,
    ): Message | undefined {
        const conversation = this.conversations.get(conversationId);

        if (!conversation) {
            return undefined;
        }

        const message: Message = {
            id: randomUUID(),
            conversationId,
            author: { ...author },
            content,
            timestamp: Date.now(),
        };

        conversation.messages.push(message);

        // Keep a runaway development server from consuming memory forever.
        if (conversation.messages.length > 5000) {
            conversation.messages.splice(
                0,
                conversation.messages.length - 5000,
            );
        }

        return message;
    }
}
