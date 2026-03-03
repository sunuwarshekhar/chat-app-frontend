# Chat App Frontend

Vite + React + TypeScript frontend for the chat application. Connects to the NestJS backend for auth (cookie-based JWT) and real-time chat via Socket.IO.

## Setup

```bash
pnpm install
```

## Development

1. Start the backend from `chat-app-backend`:

   ```bash
   cd ../chat-app-backend && pnpm start:dev
   ```

2. Start the frontend (with Vite proxy to backend):

   ```bash
   pnpm dev
   ```

3. Open [http://localhost:5173](http://localhost:5173). In dev, API and WebSocket requests are proxied to the backend (default `http://localhost:3000`).

## Environment

- **`VITE_API_URL`** (optional): Backend base URL. If unset in development, the Vite dev server proxies `/api` and `/socket.io` to `http://localhost:3000`. Set this in production to your backend URL (e.g. `https://api.example.com`).

## Project structure (scalable)

- **`src/api/`** – API client and auth calls; add more modules (e.g. `rooms.ts`, `users.ts`) as the backend grows.
- **`src/context/`** – React context (e.g. `AuthContext`); add more as needed (e.g. `RoomContext`).
- **`src/hooks/`** – `useSocket` and other shared hooks.
- **`src/pages/`** – Route-level components (Login, Register, Chat).
- **`src/components/`** – Reusable UI (MessageList, MessageInput, ProtectedRoute); add RoomList, ChannelSidebar, etc. here.
- **`src/types/`** – Shared TypeScript types; extend with `Room`, `Channel`, etc.

## Build

```bash
pnpm build
```

Output is in `dist/`. For production, set `VITE_API_URL` to your backend URL and serve the built files with your preferred static host.
