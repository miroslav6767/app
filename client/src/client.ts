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

export type ConnectionState =
    | "connecting"
    | "connected"
    | "disconnected"
    | "error";

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

type StateListener = (
    state: Readonly<ZenvikClientState>,
) => void;

type ServerEnvelope = {
    type: string;
    [key: string]: unknown;
};

interface RuntimeConfig {
    backendUrl: string;
    websocketUrl: string;
}

const DEFAULT_SETTINGS: ZenvikSettings = {
    theme: "dark",
    enterToSend: true,
    notifications: true,
};

async function getRuntimeConfig(): Promise<RuntimeConfig> {
    // Electron preload configuration
    if (window.zenvik?.getConfig) {
        return window.zenvik.getConfig();
    }

    // Web configuration
    if (window.__ZENVIK_CONFIG__) {
        return window.__ZENVIK_CONFIG__;
    }

    // Local development fallback
    const protocol =
        window.location.protocol === "https:"
            ? "https:"
            : "http:";

    const websocketProtocol =
        protocol === "https:"
            ? "wss:"
            : "ws:";

    const host =
        window.location.hostname || "127.0.0.1";

    return {
        backendUrl: `${protocol}//${host}:3001`,
        websocketUrl: `${websocketProtocol}//${host}:3001`,
    };
}

class ZenvikClient {
    private readonly listeners =
        new Set<StateListener>();

    private socket: WebSocket | null = null;

    private reconnectTimer: number | null = null;

    private reconnectAttempts = 0;

    private manuallyDisconnected = false;

    private connecting = false;

    private state: ZenvikClientState = {
        connection: "disconnected",
        user: null,
        activeConversation: null,
        conversations: [],
        settings: this.loadSettings(),
        error: null,
    };

    public getState(): Readonly<ZenvikClientState> {
        return this.state;
    }

    public subscribe(
        listener: StateListener,
    ): () => void {
        this.listeners.add(listener);

        // Immediately provide current state.
        listener(this.state);

        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Starts the client without blocking the application.
     *
     * The UI can continue loading even if the server
     * is completely offline.
     */
    public start(): void {
        this.manuallyDisconnected = false;

        // IMPORTANT:
        // Do NOT await this.
        void this.connect().catch(() => {
            // Connection errors are handled internally.
            // The application must continue running.
        });
    }

    /**
     * Attempts a connection.
     *
     * This function can be awaited by code that specifically
     * wants to know when the connection succeeds, but start()
     * intentionally does not wait for it.
     */
    public async connect(): Promise<void> {
        if (
            this.socket?.readyState === WebSocket.OPEN ||
            this.connecting
        ) {
            return;
        }

        this.manuallyDisconnected = false;
        this.clearReconnectTimer();

        this.connecting = true;

        this.setState({
            connection: "connecting",
            error: null,
        });

        try {
            await this.openSocket();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to connect to the Zenvik server.";

            this.setState({
                connection: "disconnected",
                error: message,
            });

            // Keep trying in the background.
            if (!this.manuallyDisconnected) {
                this.scheduleReconnect();
            }

            throw error;
        } finally {
            this.connecting = false;
        }
    }

    public disconnect(): void {
        this.manuallyDisconnected = true;
        this.reconnectAttempts = 0;

        this.clearReconnectTimer();

        const socket = this.socket;

        this.socket = null;

        if (socket) {
            socket.close();
        }

        this.setState({
            connection: "disconnected",
            error: null,
        });
    }

    public selectConversation(id: string): void {
        const conversation =
            this.state.conversations.find(
                item => item.id === id,
            );

        if (!conversation) {
            return;
        }

        this.setState({
            activeConversation: id,

            conversations:
                this.state.conversations.map(item =>
                    item.id === id
                        ? {
                              ...item,
                              unread: 0,
                          }
                        : item,
                ),
        });

        this.send({
            type: "conversation:select",
            conversationId: id,
        });
    }

    public sendMessage(content: string): boolean {
        const value = content.trim();

        const conversationId =
            this.state.activeConversation;

        if (!value || !conversationId) {
            return false;
        }

        if (!this.isConnected()) {
            this.setState({
                error:
                    "You are not connected to the server.",
            });

            return false;
        }

        return this.send({
            type: "message:send",
            conversationId,
            content: value,
        });
    }

    public createConversation(
        name: string,
    ): boolean {
        const value = name.trim();

        if (!value) {
            return false;
        }

        if (!this.isConnected()) {
            this.setState({
                error:
                    "Connect to the server before creating a conversation.",
            });

            return false;
        }

        return this.send({
            type: "conversation:create",
            name: value,
        });
    }

    public updateSettings(
        update: Partial<ZenvikSettings>,
    ): void {
        const settings: ZenvikSettings = {
            ...this.state.settings,
            ...update,
        };

        localStorage.setItem(
            "zenvik.settings",
            JSON.stringify(settings),
        );

        this.setState({
            settings,
        });
    }

    public async checkBackend(): Promise<boolean> {
        try {
            const { backendUrl } =
                await getRuntimeConfig();

            const response = await fetch(
                `${backendUrl}/health`,
                {
                    method: "GET",
                },
            );

            return response.ok;
        } catch {
            return false;
        }
    }

    public async getConfig(): Promise<RuntimeConfig> {
        return getRuntimeConfig();
    }

    private async openSocket(): Promise<void> {
        const { websocketUrl } =
            await getRuntimeConfig();

        await new Promise<void>(
            (resolve, reject) => {
                let settled = false;

                const socket =
                    new WebSocket(websocketUrl);

                this.socket = socket;

                const fail = (
                    error: Error,
                ) => {
                    if (settled) {
                        return;
                    }

                    settled = true;
                    reject(error);
                };

                socket.addEventListener(
                    "open",
                    () => {
                        this.reconnectAttempts = 0;

                        this.setState({
                            connection: "connected",
                            error: null,
                        });

                        // Identify the client.
                        this.send({
                            type: "auth:identify",
                        });

                        // Request conversations.
                        this.send({
                            type: "conversation:list",
                        });

                        if (!settled) {
                            settled = true;
                            resolve();
                        }
                    },
                );

                socket.addEventListener(
                    "message",
                    event => {
                        if (
                            typeof event.data ===
                            "string"
                        ) {
                            this.handleServerMessage(
                                event.data,
                            );
                        }
                    },
                );

                socket.addEventListener(
                    "error",
                    () => {
                        const error = new Error(
                            "Unable to connect to the Zenvik server.",
                        );

                        this.setState({
                            connection: "disconnected",
                            error: error.message,
                        });

                        fail(error);
                    },
                );

                socket.addEventListener(
                    "close",
                    () => {
                        if (
                            this.socket === socket
                        ) {
                            this.socket = null;
                        }

                        this.setState({
                            connection:
                                "disconnected",
                        });

                        if (!settled) {
                            fail(
                                new Error(
                                    "The Zenvik server closed the connection.",
                                ),
                            );
                        }

                        if (
                            !this.manuallyDisconnected
                        ) {
                            this.scheduleReconnect();
                        }
                    },
                );
            },
        );
    }

    private isConnected(): boolean {
        return (
            this.socket?.readyState ===
            WebSocket.OPEN
        );
    }

    private send(
        message: ServerEnvelope,
    ): boolean {
        if (!this.isConnected()) {
            return false;
        }

        this.socket!.send(
            JSON.stringify(message),
        );

        return true;
    }

    private scheduleReconnect(): void {
        if (
            this.reconnectTimer !== null ||
            this.manuallyDisconnected ||
            this.connecting
        ) {
            return;
        }

        // Exponential backoff.
        // 1s -> 2s -> 4s -> 8s -> 15s max
        const delay = Math.min(
            1000 *
                2 ** this.reconnectAttempts,
            15000,
        );

        this.reconnectAttempts++;

        this.reconnectTimer =
            window.setTimeout(() => {
                this.reconnectTimer = null;

                void this.connect().catch(() => {
                    // connect() schedules the next retry.
                });
            }, delay);
    }

    private clearReconnectTimer(): void {
        if (
            this.reconnectTimer === null
        ) {
            return;
        }

        window.clearTimeout(
            this.reconnectTimer,
        );

        this.reconnectTimer = null;
    }

    private handleServerMessage(
        raw: string,
    ): void {
        let message: ServerEnvelope;

        try {
            message =
                JSON.parse(
                    raw,
                ) as ServerEnvelope;
        } catch {
            this.setState({
                error:
                    "The server sent invalid data.",
            });

            return;
        }

        switch (message.type) {
            case "auth:user":
            case "auth:success":
                if (
                    this.isUser(
                        message.user,
                    )
                ) {
                    this.setState({
                        user: message.user,
                        error: null,
                    });
                }

                break;

            case "conversation:list":
                this.replaceConversations(
                    message.conversations,
                );

                break;

            case "conversation:created": {
                const conversation =
                    message.conversation;

                if (
                    this.isConversation(
                        conversation,
                    )
                ) {
                    const exists =
                        this.state.conversations.some(
                            item =>
                                item.id ===
                                conversation.id,
                        );

                    this.setState({
                        conversations:
                            exists
                                ? this.state
                                      .conversations
                                : [
                                      ...this
                                          .state
                                          .conversations,
                                      conversation,
                                  ],

                        activeConversation:
                            conversation.id,
                    });
                }

                break;
            }

            case "message:new":
                if (
                    this.isMessage(
                        message.message,
                    )
                ) {
                    this.addMessage(
                        message.message,
                    );
                }

                break;

            case "error":
                this.setState({
                    error:
                        typeof message.message ===
                        "string"
                            ? message.message
                            : "The server returned an error.",
                });

                break;

            case "pong":
                break;

            default:
                console.debug(
                    "Unhandled Zenvik event:",
                    message.type,
                );
        }
    }

    private replaceConversations(
        value: unknown,
    ): void {
        if (!Array.isArray(value)) {
            return;
        }

        const conversations =
            value.filter(
                this.isConversation,
            );

        const currentActive =
            this.state.activeConversation;

        const activeConversation =
            currentActive &&
            conversations.some(
                item =>
                    item.id === currentActive,
            )
                ? currentActive
                : conversations[0]?.id ??
                  null;

        this.setState({
            conversations,
            activeConversation,
            error: null,
        });
    }

    private addMessage(
        message: ZenvikMessage,
    ): void {
        const conversation =
            this.state.conversations.find(
                item =>
                    item.id ===
                    message.conversationId,
            );

        if (!conversation) {
            return;
        }

        const alreadyExists =
            conversation.messages.some(
                item =>
                    item.id === message.id,
            );

        if (alreadyExists) {
            return;
        }

        const isActive =
            conversation.id ===
            this.state.activeConversation;

        this.setState({
            conversations:
                this.state.conversations.map(
                    item => {
                        if (
                            item.id !==
                            message.conversationId
                        ) {
                            return item;
                        }

                        return {
                            ...item,

                            messages: [
                                ...item.messages,
                                message,
                            ],

                            unread: isActive
                                ? 0
                                : (item.unread ??
                                      0) + 1,
                        };
                    },
                ),
        });
    }

    private setState(
        update: Partial<ZenvikClientState>,
    ): void {
        this.state = {
            ...this.state,
            ...update,
        };

        for (const listener of this.listeners) {
            listener(this.state);
        }
    }

    private loadSettings(): ZenvikSettings {
        try {
            const stored =
                localStorage.getItem(
                    "zenvik.settings",
                );

            if (!stored) {
                return {
                    ...DEFAULT_SETTINGS,
                };
            }

            const parsed =
                JSON.parse(
                    stored,
                ) as Partial<ZenvikSettings>;

            return {
                ...DEFAULT_SETTINGS,
                ...parsed,
            };
        } catch {
            return {
                ...DEFAULT_SETTINGS,
            };
        }
    }

    private isUser(
        value: unknown,
    ): value is ZenvikUser {
        if (
            !value ||
            typeof value !== "object"
        ) {
            return false;
        }

        const item =
            value as Record<string, unknown>;

        return (
            typeof item.id === "string" &&
            typeof item.username ===
                "string"
        );
    }

    private isMessage = (
        value: unknown,
    ): value is ZenvikMessage => {
        if (
            !value ||
            typeof value !== "object"
        ) {
            return false;
        }

        const item =
            value as Record<string, unknown>;

        return (
            typeof item.id === "string" &&
            typeof item.conversationId ===
                "string" &&
            typeof item.content ===
                "string" &&
            typeof item.timestamp ===
                "number" &&
            this.isUser(item.author)
        );
    };

    private isConversation = (
        value: unknown,
    ): value is Conversation => {
        if (
            !value ||
            typeof value !== "object"
        ) {
            return false;
        }

        const item =
            value as Record<string, unknown>;

        return (
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            Array.isArray(
                item.messages,
            ) &&
            item.messages.every(
                this.isMessage,
            )
        );
    };
}

export const client = new ZenvikClient();