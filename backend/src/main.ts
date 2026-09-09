import { startApi } from "./api/api.js";
import { startWeb } from "./api/web.js";
import { startServer } from "./server/server.js";

async function main(): Promise<void> {
    console.log("Starting Zenvik...");

    await startApi();
    await startWeb();

    startServer();

    console.log("Zenvik is ready!");
}

main().catch((error: unknown) => {
    console.error("Failed to start Zenvik:", error);
    process.exit(1);
});