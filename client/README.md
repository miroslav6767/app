# Zenvik Client

A shared TypeScript client for the Zenvik desktop and web applications.

## What is included

- Electron desktop client
- Browser client using the same frontend
- WebSocket messaging
- Conversation creation and selection
- Real-time messages
- Unread conversation counts
- Conversation search
- Dark/light themes
- Enter-to-send preference
- Desktop notifications when supported
- Connection state and automatic reconnect
- Server health check
- Server address copy action
- Responsive layout
- Keyboard shortcuts

## Development

Install dependencies:

```powershell
bun install
```

Build:

```powershell
bun run build
```

Run the desktop client:

```powershell
bun run dev
```

Run the web client:

```powershell
bun run web
```

The web development server uses port `3000` by default. The client connects to the Zenvik backend on `3001` unless overridden.

## Configuration

For Electron:

```text
ZENVIK_BACKEND_URL=http://127.0.0.1:3001
ZENVIK_WEBSOCKET_URL=ws://127.0.0.1:3001
```

The web build uses the same local defaults when no runtime configuration is supplied.
