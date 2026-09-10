import { randomUUID } from "node:crypto";
import type { ServerWebSocket } from "bun";
import { Store } from "./store.ts";
import type { ClientConnection, ServerEnvelope, User } from "./types.ts";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3001);
const WEB_ORIGIN = process.env.WEB_ORIGIN || "*";

const store = new Store();
const connections = new Map<string, ClientConnection>();

type SocketData = {
    connectionId: string;
};

function json(
    data: unknown,
    status = 200,
    extraHeaders: Record<string, string> = {},
): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": WEB_ORIGIN,
            "Access-Control-Allow-Headers": "Content-Type",
            ...extraHeaders,
        },
    });
}

function getConnection(
    socket: ServerWebSocket<SocketData>,
): ClientConnection | undefined {
    return connections.get(socket.data.connectionId);
}

function send(
    socket: ServerWebSocket<SocketData>,
    message: ServerEnvelope,
): void {
    socket.send(JSON.stringify(message));
}

function broadcast(message: ServerEnvelope): void {
    const payload = JSON.stringify(message);

    for (const socket of serverWebSockets()) {
        socket.send(payload);
    }
}

function serverWebSockets(): ServerWebSocket<SocketData>[] {
    return [...activeSockets];
}

const activeSockets = new Set<ServerWebSocket<SocketData>>();

function sendError(
    socket: ServerWebSocket<SocketData>,
    message: string,
): void {
    send(socket, {
        type: "error",
        message,
    });
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
    return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function handleMessage(
    socket: ServerWebSocket<SocketData>,
    raw: string,
): void {
    let message: ServerEnvelope;

    try {
        const parsed: unknown = JSON.parse(raw);

        if (!parsed || typeof parsed !== "object") {
            throw new Error("Message must be an object.");
        }

        message = parsed as ServerEnvelope;
    } catch {
        sendError(socket, "Invalid JSON message.");
        return;
    }

    const connection = getConnection(socket);

    if (!connection) {
        sendError(socket, "Connection is not initialized.");
        return;
    }

    switch (message.type) {
        case "auth:identify": {
            send(socket, {
                type: "auth:user",
                user: connection.user,
            });
            return;
        }

        case "conversation:list": {
            send(socket, {
                type: "conversation:list",
                conversations: store.getConversations(),
            });
            return;
        }

        case "conversation:select": {
            if (!isNonEmptyString(message.conversationId, 100)) {
                sendError(socket, "Invalid conversation ID.");
                return;
            }

            const conversation = store.getConversation(
                message.conversationId,
            );

            if (!conversation) {
                sendError(socket, "Conversation not found.");
                return;
            }

            connection.selectedConversationId = conversation.id;

            send(socket, {
                type: "conversation:selected",
                conversationId: conversation.id,
            });

            return;
        }

        case "conversation:create": {
            if (!isNonEmptyString(message.name, 80)) {
                sendError(socket, "Conversation name must be 1-80 characters.");
                return;
            }

            const conversation = store.createConversation(
                message.name.trim(),
            );

            broadcast({
                type: "conversation:created",
                conversation,
            });

            return;
        }

        case "message:send": {
            if (!isNonEmptyString(message.conversationId, 100)) {
                sendError(socket, "Invalid conversation ID.");
                return;
            }

            if (!isNonEmptyString(message.content, 4000)) {
                sendError(socket, "Message must be 1-4000 characters.");
                return;
            }

            const conversation = store.getConversation(
                message.conversationId,
            );

            if (!conversation) {
                sendError(socket, "Conversation not found.");
                return;
            }

            const created = store.addMessage(
                conversation.id,
                connection.user,
                message.content.trim(),
            );

            if (!created) {
                sendError(socket, "Unable to create message.");
                return;
            }

            // Every connected client receives the message.
            broadcast({
                type: "message:new",
                message: created,
            });

            return;
        }

        case "ping": {
            send(socket, {
                type: "pong",
                timestamp: Date.now(),
            });
            return;
        }

        default:
            sendError(
                socket,
                `Unknown message type: ${message.type}`,
            );
    }
}

async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": WEB_ORIGIN,
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }

    if (url.pathname === "/") {
        return json({
            name: "Zenvik",
            status: "online",
            version: "1.1.0",
            websocket: `ws://${HOST}:${PORT}`,
        });
    }

    if (url.pathname === "/health") {
        return json({
            status: "healthy",
            uptime: process.uptime(),
            connections: activeSockets.size,
            conversations: store.getConversations().length,
            timestamp: new Date().toISOString(),
        });
    }

    if (url.pathname === "/api") {
        return json({
            name: "Zenvik API",
            version: "1.1.0",
            status: "online",
        });
    }

    if (url.pathname === "/api/config") {
        const protocol =
            url.protocol === "https:" ? "wss:" : "ws:";

        return json({
            backendUrl: url.origin,
            websocketUrl: `${protocol}//${url.host}`,
        });
    }

    if (url.pathname === "/api/conversations") {
        return json({
            conversations: store.getConversations(),
        });
    }

    return json({
        error: "Not Found",
        path: url.pathname,
    }, 404);
}

const server = Bun.serve<SocketData>({
    hostname: HOST,
    port: PORT,

    fetch(request, server) {
        const upgrade = request.headers.get("upgrade");

        if (upgrade?.toLowerCase() === "websocket") {
            const connectionId = randomUUID();

            const upgraded = server.upgrade(request, {
                data: {
                    connectionId,
                },
            });

            if (upgraded) {
                return undefined;
            }

            return new Response("WebSocket upgrade failed.", {
                status: 500,
            });
        }

        return handleRequest(request);
    },

    websocket: {
        open(socket) {
            const user = store.getOrCreateGuest();

            connections.set(socket.data.connectionId, {
                id: socket.data.connectionId,
                user,
                selectedConversationId: null,
            });

            activeSockets.add(socket);

            console.log(
                `[ws] connected ${socket.data.connectionId} as ${user.username}`,
            );
        },

        message(socket, message) {
            if (typeof message !== "string") {
                sendError(socket, "Only text WebSocket messages are supported.");
                return;
            }

            handleMessage(socket, message);
        },

        close(socket) {
            const connection = connections.get(
                socket.data.connectionId,
            );

            console.log(
                `[ws] disconnected ${socket.data.connectionId}` +
                (connection ? ` (${connection.user.username})` : ""),
            );

            connections.delete(socket.data.connectionId);
            activeSockets.delete(socket);
        },
    },
});

console.log(`
╔══════════════════════════════════════════╗
║              ZENVIK SERVER               ║
╠══════════════════════════════════════════╣
║ HTTP      http://${HOST}:${PORT}
║ WebSocket ws://${HOST}:${PORT}
║ Status    ONLINE                         ║
╚══════════════════════════════════════════╝
`);
