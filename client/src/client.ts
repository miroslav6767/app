import { config } from "./core/config";
import { getPlatformInfo } from "./core/platform";
import { openUrl, clientUrl } from "./core/runtime";
import { startWebServer } from "./web/web";

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
