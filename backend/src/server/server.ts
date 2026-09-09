import {
    createServer,
    type IncomingMessage,
    type ServerResponse
} from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "127.0.0.1";

type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse
) => void | Promise<void>;

function sendJSON(
    res: ServerResponse,
    statusCode: number,
    data: unknown
): void {
    const body = JSON.stringify(data);

    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    });

    res.end(body);
}

function getPath(req: IncomingMessage): string {
    return new URL(
        req.url ?? "/",
        `http://${req.headers.host ?? `${HOST}:${PORT}`}`
    ).pathname;
}

const routes: Record<string, RouteHandler> = {
    "/": (_req, res) => {
        sendJSON(res, 200, {
            name: "Zenvik",
            message: "Zenvik server is running",
            status: "ok"
        });
    },

    "/health": (_req, res) => {
        sendJSON(res, 200, {
            status: "healthy",
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    },

    "/api": (_req, res) => {
        sendJSON(res, 200, {
            name: "Zenvik API",
            version: "1.0.0",
            status: "online"
        });
    }
};

const server = createServer(async (req, res) => {
    const requestId = randomUUID();
    const start = performance.now();
    const method = req.method ?? "GET";
    const path = getPath(req);

    res.setHeader("X-Request-ID", requestId);

    try {
        console.log(`[${requestId}] ${method} ${path}`);

        if (method !== "GET") {
            sendJSON(res, 405, {
                error: "Method Not Allowed",
                requestId
            });

            return;
        }

        const handler = routes[path];

        if (!handler) {
            sendJSON(res, 404, {
                error: "Route Not Found",
                path,
                requestId
            });

            return;
        }

        await handler(req, res);
    } catch (error) {
        console.error(`[${requestId}]`, error);

        if (!res.headersSent) {
            sendJSON(res, 500, {
                error: "Internal Server Error",
                requestId
            });
        }
    } finally {
        const duration = (performance.now() - start).toFixed(2);

        console.log(
            `[${requestId}] ${res.statusCode} ${duration}ms`
        );
    }
});

server.on("error", (error) => {
    console.error("Zenvik server error:", error);
});

export function startServer(): void {
    server.listen(PORT, HOST, () => {
        console.log(`
╔════════════════════════════════════╗
║          ZENVIK SERVER             ║
╠════════════════════════════════════╣
║ Status : ONLINE                    ║
║ Host   : ${HOST.padEnd(23)}║
║ Port   : ${String(PORT).padEnd(23)}║
╚════════════════════════════════════╝
        `);
    });
}

function shutdown(signal: string): void {
    console.log(`\n${signal} received. Shutting down Zenvik...`);

    server.close((error) => {
        if (error) {
            console.error("Shutdown error:", error);
            process.exit(1);
        }

        console.log("Zenvik server stopped.");
        process.exit(0);
    });
}
startServer();

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));