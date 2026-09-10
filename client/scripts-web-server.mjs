import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const project = dirname(fileURLToPath(import.meta.url));
const root = join(project, "dist", "web");

const port = Number(process.env.ZENVIK_WEB_PORT ?? 3000);
const host = process.env.ZENVIK_WEB_HOST ?? "127.0.0.1";

const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
};

const server = createServer(async (request, response) => {
    try {
        const requestPath =
            new URL(request.url ?? "/", `http://${host}`).pathname;

        const cleanPath = normalize(requestPath)
            .replace(/^[/\\]+/, "")
            .replace(/^(\.\.[/\\])+/, "");

        let filePath = join(root, cleanPath);

        if (requestPath === "/" || requestPath === "") {
            filePath = join(root, "index.html");
        }

        let body;

        try {
            body = await readFile(filePath);
        } catch {
            filePath = join(root, "index.html");
            body = await readFile(filePath);
        }

        response.writeHead(200, {
            "Content-Type":
                types[extname(filePath)] ??
                "application/octet-stream",
            "Cache-Control": "no-cache",
        });

        response.end(body);
    } catch (error) {
        console.error(error);

        response.writeHead(500, {
            "Content-Type": "text/plain; charset=utf-8",
        });

        response.end(
            "Zenvik web client failed to load.",
        );
    }
});

server.listen(port, host, () => {
    console.log(
        `Zenvik web client: http://${host}:${port}`,
    );
    console.log("Press Ctrl+C to stop.");
});
