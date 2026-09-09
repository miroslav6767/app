export interface ClientConfig {
    host: string;
    port: number;
    backendUrl: string;
    openBrowser: boolean;
}

export const config: ClientConfig = {
    host: process.env.ZENVIK_CLIENT_HOST ?? "127.0.0.1",
    port: Number(process.env.ZENVIK_CLIENT_PORT) || 3002,
    backendUrl: process.env.ZENVIK_BACKEND_URL ?? "http://127.0.0.1:3001",
    openBrowser: process.env.ZENVIK_NO_BROWSER !== "1"
};
