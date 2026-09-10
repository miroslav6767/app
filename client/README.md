# Zenvik Client

Electron desktop client for Zenvik.

## Run

```bash
bun install
bun run dev
```

## Backend configuration

By default the client connects to:

- HTTP health endpoint: `http://127.0.0.1:3001`
- WebSocket: `ws://127.0.0.1:3001`

Override them with `ZENVIK_BACKEND_URL` and `ZENVIK_WEBSOCKET_URL`.

## WebSocket events expected by the client

Client sends:

- `auth:identify`
- `conversation:list`
- `conversation:select`
- `conversation:create`
- `message:send`

Server can send:

- `auth:user` or `auth:success`
- `conversation:list`
- `conversation:created`
- `message:new`
- `error`
