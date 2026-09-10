export interface ZenvikUser {
    id: string;
    username: string;
    avatarUrl?: string;
}

export interface ZenvikMessage {
    id: string;
    conversationId: string;
    author: ZenvikUser;
    content: string;
    timestamp: number;
}

export interface Conversation {
    id: string;
    name: string;
    messages: ZenvikMessage[];
    unread?: number;
}

export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

export interface ZenvikSettings {
    theme: "dark" | "light";
    enterToSend: boolean;
    notifications: boolean;
}

export interface ZenvikClientState {
    connection: ConnectionState;
    user: ZenvikUser | null;
    activeConversation: string | null;
    conversations: Conversation[];
    settings: ZenvikSettings;
    error: string | null;
}

type StateListener = (state: Readonly<ZenvikClientState>) => void;

type ServerEnvelope = {
    type: string;
    [key: string]: unknown;
};

const defaultSettings: ZenvikSettings = {
    theme: "dark",
    enterToSend: true,
    notifications: true
};

class ZenvikClient {
    private readonly listeners = new Set<StateListener>();
    private socket: WebSocket | null = null;
    private reconnectTimer: number | null = null;
    private reconnectAttempts = 0;
    private manuallyDisconnected = false;

    private state: ZenvikClientState = {
        connection: "disconnected",
        user: null,
        activeConversation: null,
        conversations: [],
        settings: this.loadSettings(),
        error: null
    };

    public getState(): Readonly<ZenvikClientState> {
        return this.state;
    }

    public subscribe(listener: StateListener): () => void {
        this.listeners.add(listener);
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    public async start(): Promise<void> {
        this.manuallyDisconnected = false;
        await this.connect();
    }

    public async connect(): Promise<void> {
        if (this.socket?.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        if (this.socket?.readyState === WebSocket.CONNECTING) {
            return new Promise((resolve, reject) => {
                const check = () => {
                    if (this.state.connection === "connected") resolve();
                    else if (this.state.connection === "error") reject(new Error(this.state.error ?? "Connection failed"));
                    else window.setTimeout(check, 50);
                };
                check();
            });
        }

        this.manuallyDisconnected = false;
        this.setState({ connection: "connecting", error: null });

        const url = (await window.zenvik.getConfig()).websocketUrl;
        return new Promise((resolve, reject) => {
            const socket = new WebSocket(url);
            this.socket = socket;
            let settled = false;

            socket.addEventListener("open", () => {
                this.reconnectAttempts = 0;
                this.setState({ connection: "connected", error: null });
                this.send({ type: "auth:identify" });
                this.send({ type: "conversation:list" });
                if (!settled) {
                    settled = true;
                    resolve();
                }
            });

            socket.addEventListener("message", event => {
                if (typeof event.data === "string") this.handleServerMessage(event.data);
            });

            socket.addEventListener("error", () => {
                this.setState({ connection: "error", error: "Unable to connect to the Zenvik server." });
                if (!settled) {
                    settled = true;
                    reject(new Error("Unable to connect to the Zenvik server."));
                }
            });

            socket.addEventListener("close", () => {
                if (this.socket === socket) this.socket = null;
                this.setState({ connection: "disconnected" });
                if (!this.manuallyDisconnected) this.scheduleReconnect();
            });
        });
    }

    public disconnect(): void {
        this.manuallyDisconnected = true;
        if (this.reconnectTimer !== null) {
            window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.socket?.close();
        this.socket = null;
        this.setState({ connection: "disconnected" });
    }

    public selectConversation(id: string): void {
        const conversation = this.state.conversations.find(item => item.id === id);
        if (!conversation) return;

        this.setState({
            activeConversation: id,
            conversations: this.state.conversations.map(item =>
                item.id === id ? { ...item, unread: 0 } : item
            )
        });

        this.send({ type: "conversation:select", conversationId: id });
    }

    public sendMessage(content: string): boolean {
        const value = content.trim();
        const conversationId = this.state.activeConversation;
        if (!value || !conversationId) return false;
        if (!this.isConnected()) {
            this.setState({ error: "You are not connected to the server." });
            return false;
        }

        return this.send({
            type: "message:send",
            conversationId,
            content: value
        });
    }

    public createConversation(name: string): boolean {
        const value = name.trim();
        if (!value || !this.isConnected()) return false;
        return this.send({ type: "conversation:create", name: value });
    }

    public updateSettings(update: Partial<ZenvikSettings>): void {
        const settings = { ...this.state.settings, ...update };
        localStorage.setItem("zenvik.settings", JSON.stringify(settings));
        this.setState({ settings });
        document.documentElement.dataset.theme = settings.theme;
    }

    public async checkBackend(): Promise<boolean> {
        try {
            const { backendUrl } = await window.zenvik.getConfig();
            const response = await fetch(`${backendUrl}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }

    private isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    private send(message: ServerEnvelope): boolean {
        if (!this.isConnected()) return false;
        this.socket!.send(JSON.stringify(message));
        return true;
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer !== null || this.manuallyDisconnected) return;
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
        this.reconnectAttempts++;
        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            void this.connect().catch(() => undefined);
        }, delay);
    }

    private handleServerMessage(raw: string): void {
        let message: ServerEnvelope;
        try {
            message = JSON.parse(raw) as ServerEnvelope;
        } catch {
            this.setState({ error: "The server sent invalid data." });
            return;
        }

        switch (message.type) {
            case "auth:user":
            case "auth:success":
                if (this.isUser(message.user)) this.setState({ user: message.user });
                break;
            case "conversation:list":
                this.replaceConversations(message.conversations);
                break;
            case "conversation:created":
                if (this.isConversation(message.conversation)) {
                    this.setState({
                        conversations: [...this.state.conversations, message.conversation],
                        activeConversation: message.conversation.id
                    });
                }
                break;
            case "message:new":
                if (this.isMessage(message.message)) this.addMessage(message.message);
                break;
            case "error":
                this.setState({ error: typeof message.message === "string" ? message.message : "Server error." });
                break;
            case "pong":
                break;
            default:
                console.debug("Unhandled Zenvik event:", message.type);
        }
    }

    private replaceConversations(value: unknown): void {
        if (!Array.isArray(value)) return;
        const conversations = value.filter(this.isConversation);
        this.setState({
            conversations,
            activeConversation: this.state.activeConversation && conversations.some(item => item.id === this.state.activeConversation)
                ? this.state.activeConversation
                : conversations[0]?.id ?? null
        });
    }

    private addMessage(message: ZenvikMessage): void {
        const exists = this.state.conversations.some(conversation =>
            conversation.messages.some(item => item.id === message.id)
        );
        if (exists) return;

        this.setState({
            conversations: this.state.conversations.map(conversation => {
                if (conversation.id !== message.conversationId) return conversation;
                const isActive = conversation.id === this.state.activeConversation;
                return {
                    ...conversation,
                    messages: [...conversation.messages, message],
                    unread: isActive ? 0 : (conversation.unread ?? 0) + 1
                };
            })
        });
    }

    private setState(update: Partial<ZenvikClientState>): void {
        this.state = { ...this.state, ...update };
        for (const listener of this.listeners) listener(this.state);
    }

    private loadSettings(): ZenvikSettings {
        try {
            const stored = localStorage.getItem("zenvik.settings");
            if (!stored) return defaultSettings;
            return { ...defaultSettings, ...(JSON.parse(stored) as Partial<ZenvikSettings>) };
        } catch {
            return defaultSettings;
        }
    }

    private isUser(value: unknown): value is ZenvikUser {
        if (!value || typeof value !== "object") return false;
        const item = value as Record<string, unknown>;
        return typeof item.id === "string" && typeof item.username === "string";
    }

    private isMessage = (value: unknown): value is ZenvikMessage => {
        if (!value || typeof value !== "object") return false;
        const item = value as Record<string, unknown>;
        return typeof item.id === "string" && typeof item.conversationId === "string" && typeof item.content === "string" && this.isUser(item.author);
    };

    private isConversation = (value: unknown): value is Conversation => {
        if (!value || typeof value !== "object") return false;
        const item = value as Record<string, unknown>;
        return typeof item.id === "string" && typeof item.name === "string" && Array.isArray(item.messages);
    };
}

export const client = new ZenvikClient();
