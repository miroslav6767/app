export interface ClientConfig {
    backendUrl: string;
    websocketUrl: string;
}

const backendUrl = process.env.ZENVIK_BACKEND_URL ?? "http://127.0.0.1:3001";

export const config: ClientConfig = {
    backendUrl,
    websocketUrl: process.env.ZENVIK_WEBSOCKET_URL ?? backendUrl.replace(/^http/, "ws")
};
