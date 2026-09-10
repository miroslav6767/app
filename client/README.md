# Zenvik Client

A shared Zenvik messaging client that runs as both:

- **Electron desktop app**
- **Browser web app**

The desktop and web versions use the same TypeScript client, message protocol, UI, and settings.

## Requirements

- Bun
- A running Zenvik backend/WebSocket server on port `3001` by default

## Install

```bash
bun install
```

## Desktop

Development/build + launch:

```bash
bun run dev
```

Build only:

```bash
bun run build
```

Launch an already-built desktop client:

```bash
bun run start
```

## Web

Build and serve the browser version:

```bash
bun run web
```

It will normally be available at:

```text
http://127.0.0.1:3000
```

Build the web assets without starting the server:

```bash
bun run web:build
```

The small web server is included in `scripts-web-server.mjs`; no extra web framework is required.

## Backend configuration

The default backend is:

```text
http://127.0.0.1:3001
```

The default WebSocket endpoint is:

```text
ws://127.0.0.1:3001
```

Set these before building:

### PowerShell

```powershell
$env:ZENVIK_BACKEND_URL="http://127.0.0.1:3001"
$env:ZENVIK_WEBSOCKET_URL="ws://127.0.0.1:3001"
bun run build
```

For HTTPS/WSS deployments:

```powershell
$env:ZENVIK_BACKEND_URL="https://example.com"
$env:ZENVIK_WEBSOCKET_URL="wss://example.com"
bun run web
```

The build writes the browser configuration to `dist/web/config.js`.

## Client/server protocol

The client sends:

- `auth:identify`
- `conversation:list`
- `conversation:select`
- `conversation:create`
- `message:send`

The client handles:

- `auth:user`
- `auth:success`
- `conversation:list`
- `conversation:created`
- `message:new`
- `error`
- `pong`

## UI behavior

The UI is connected to the real client state rather than using placeholder actions.

Working controls include:

- Conversation selection
- Creating conversations
- Sending messages
- Automatic message rendering
- Unread message counts
- WebSocket connection/reconnection
- Manual disconnect/reconnect
- Server health check
- Dark/light theme
- Enter-to-send
- Browser/desktop notifications where supported
- Responsive browser layout
- Keyboard controls for the conversation modal
- Persistent local settings

No button in the included UI is intentionally left as a static placeholder.
