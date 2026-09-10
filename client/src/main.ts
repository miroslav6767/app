import { startClient } from "./client.js";
import { config } from "./core/config.js";
import { installShutdownHandlers } from "./core/runtime.js";

async function main(): Promise<void> {
    console.log("Starting Zenvik client...");

    const server = await startClient();

    installShutdownHandlers(() => {
        return new Promise<void>((resolve, reject) => {
            server.close((error?: Error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    });

    console.log(`Client ready on ${config.host}:${config.port}`);
}

main().catch((error: unknown) => {
    console.error("Failed to start Zenvik client:", error);
    process.exitCode = 1;
});