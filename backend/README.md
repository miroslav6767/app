# Zenvik Backend

Real HTTP + WebSocket backend for the Zenvik desktop and web clients.

## Run

```powershell
bun install
bun run dev
```

The server listens on `http://127.0.0.1:3001` by default.

- `GET /`
- `GET /health`
- `GET /api`
- `GET /api/config`
- `GET /api/conversations`

WebSocket endpoint:

```text
ws://127.0.0.1:3001
```

The current client protocol is supported:

- `auth:identify`
- `conversation:list`
- `conversation:select`
- `conversation:create`
- `message:send`

Server events:

- `auth:user`
- `conversation:list`
- `conversation:created`
- `message:new`
- `error`

## PostgreSQL

PostgreSQL is optional.

Without `DATABASE_URL`, data lives in memory and resets when the server stops.

With PostgreSQL:

1. Create a database named `zenvik`.
2. Run `database/schema.sql`.
3. Set `DATABASE_URL`.
4. Start Zenvik.

The server loads existing conversations/messages and persists new data.

## Notes

The client currently has no login screen, so `auth:identify` creates/reuses a guest identity based on a cookie-like connection token. This is intentionally not an authentication system yet.
