declare global {
    interface Window {
        __ZENVIK_CONFIG__?: {
            backendUrl: string;
            websocketUrl: string;
        };
    }

    interface Window {
        zenvik: {
            platform(): Promise<{
                platform: string;
                arch: string;
                electron: string;
                node: string;
            }>;
            getConfig(): Promise<{
                backendUrl: string;
                websocketUrl: string;
            }>;
        };
    }
}

export {};
