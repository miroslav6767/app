import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../core/config.js";
import { renderApp } from "../UI/ui.js";

const root = join(fileURLToPath(import.meta.url), "../../web");

function send(res: ServerResponse, status: number, type: string, body: string): void {
    res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(body);
}

async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const path = new URL(req.url ?? "/", `http://${config.host}:${config.port}`).pathname;

    if (req.method !== "GET") {
        send(res, 405, "text/plain; charset=utf-8", "Method Not Allowed");
        return;
    }

    if (path === "/") {
        send(res, 200, "text/html; charset=utf-8", `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zenvik</title><link rel="stylesheet" href="/style.css"></head><body>${renderApp()}<script src="/main.js"></script></body></html>`);
        return;
    }

    if (path === "/client/platform") {
        send(res, 200, "application/json; charset=utf-8", JSON.stringify({ ok: true, platform: process.platform, arch: process.arch, node: process.version }));
        return;
    }

    if (path === "/client/backend-health") {
        try {
            const response = await fetch(`${config.backendUrl}/health`);
            const data = await response.json();
            send(res, 200, "application/json; charset=utf-8", JSON.stringify({ ok: response.ok, backend: data }));
        } catch (error) {
            send(res, 200, "application/json; charset=utf-8", JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
        }
        return;
    }

    if (path === "/main.js" || path === "/style.css") {
        const file = join(root, path.slice(1));
        try {
            const body = await readFile(file, "utf8");
            send(res, 200, path.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/css; charset=utf-8", body);
        } catch {
            send(res, 404, "text/plain; charset=utf-8", "Not Found");
        }
        return;
    }

    send(res, 404, "text/plain; charset=utf-8", "Not Found");
}

export function startWebServer(): Promise<ReturnType<typeof createServer>> {
    const server = createServer((req, res) => void handler(req, res));
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(config.port, config.host, () => {
            server.off("error", reject);
            console.log(`Zenvik client running at http://${config.host}:${config.port}`);
            resolve(server);
        });
    });
}

const server = createServer(
    (req: IncomingMessage, res: ServerResponse) => void handler(req, res)
);


