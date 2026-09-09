import { startClient } from "./client";
import { config } from "./core/config";
import { installShutdownHandlers } from "./core/runtime";

async function main(): Promise<void> {
    console.log("Starting Zenvik client...");
    const server = await startClient();

    installShutdownHandlers(() => {
        return new Promise<void>((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    });

    console.log(`Client ready on ${config.host}:${config.port}`);
}

main().catch((error: unknown) => {
    console.error("Failed to start Zenvik client:", error);
    process.exitCode = 1;
});
