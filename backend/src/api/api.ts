import { createServer, IncomingMessage, ServerResponse } from "node:http";

const PORT = 3000;

function handleRequest(
    req: IncomingMessage,
    res: ServerResponse
): void {
    res.setHeader("Content-Type", "application/json");

    if (req.url === "/api/status" && req.method === "GET") {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: "online",
            app: "Zenvik"
        }));
        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({
        error: "Not found"
    }));
}

export function startApi(): Promise<void> {
    return new Promise((resolve) => {
        const server = createServer(handleRequest);

        server.listen(PORT, () => {
            console.log(`API running on http://localhost:${PORT}`);
            resolve();
        });
    });
}