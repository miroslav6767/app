import { config } from "./core/config.js";
import { getPlatformInfo } from "./core/platform.js";
import { openUrl, clientUrl } from "./core/runtime.js";
import { startWebServer } from "./web/web.js";

export async function startClient(): Promise<ReturnType<typeof startWebServer> extends Promise<infer T> ? T : never> {
    const server = await startWebServer();
    const platform = getPlatformInfo();

    console.log(`Platform: ${platform.platform} ${platform.arch}`);
    console.log(`Backend: ${config.backendUrl}`);

    if (config.openBrowser) {
        try {
            await openUrl(clientUrl());
        } catch (error) {
            console.warn("Could not open the browser automatically:", error);
            console.log(`Open ${clientUrl()} manually.`);
        }
    }

    return server;
}
