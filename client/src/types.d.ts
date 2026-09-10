declare global {
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
