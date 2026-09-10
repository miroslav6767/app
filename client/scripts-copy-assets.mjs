import { cp, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const project = join(dirname(fileURLToPath(import.meta.url)));
const source = join(project, "src", "web");
const destination = join(project, "dist", "web");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });

const backendUrl =
    process.env.ZENVIK_BACKEND_URL ??
    "http://127.0.0.1:3001";

const websocketUrl =
    process.env.ZENVIK_WEBSOCKET_URL ??
    backendUrl.replace(/^http/, "ws");

const configFile = `window.__ZENVIK_CONFIG__ = ${JSON.stringify({
    backendUrl,
    websocketUrl,
})};\n`;

await writeFile(
    join(destination, "config.js"),
    configFile,
    "utf8",
);

console.log(`Web assets copied to ${destination}`);
console.log(`Backend: ${backendUrl}`);
console.log(`WebSocket: ${websocketUrl}`);
