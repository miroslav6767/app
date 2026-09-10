export interface User {
    id: string;
    username: string;
    avatarUrl?: string;
}

export interface Message {
    id: string;
    conversationId: string;
    author: User;
    content: string;
    timestamp: number;
}

export interface Conversation {
    id: string;
    name: string;
    messages: Message[];
}

export interface ServerEnvelope {
    type: string;
    [key: string]: unknown;
}

export interface ClientConnection {
    id: string;
    user: User;
    selectedConversationId: string | null;
}
