import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "./config.js";

const execFileAsync = promisify(execFile);

export async function openUrl(url: string): Promise<void> {
    if (process.platform === "win32") {
        await execFileAsync("cmd", ["/c", "start", "", url]);
        return;
    }

    if (process.platform === "darwin") {
        await execFileAsync("open", [url]);
        return;
    }

    await execFileAsync("xdg-open", [url]);
}

export function installShutdownHandlers(cleanup: () => Promise<void> | void): void {
    let shuttingDown = false;

    const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`\n${signal} received. Stopping Zenvik client...`);
        try {
            await cleanup();
        } finally {
            process.exit(0);
        }
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

export function clientUrl(): string {
    return `http://${config.host}:${config.port}`;
}
