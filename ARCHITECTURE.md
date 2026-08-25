# Architecture — WeShare Real-Time Collaborative Notes

## Overview

WeShare is a full-stack, real-time collaborative note-taking application. It combines a
React SPA with an Express + Socket.IO backend and MongoDB persistence. Documents are
shared via a link; the owner gets full control (title editing, write permissions, kicking
users) while guests can join as read-only collaborators.

```
┌──────────────────────┐        HTTP (REST + cookies)          ┌─────────────────────────────┐
│                      │  ─────────────────────────────────▶   │                             │
│  React SPA (Vite)    │                                      │  Express (HTTP)             │
│                      │  ◀─────────────────────────────────   │   /api/auth/*               │
│  • AuthContext       │        JSON + httpOnly cookie (JWT)   │   /api/notes/*              │
│  • ThemeContext      │                                      │                             │
│  • Quill + y-quill   │   WebSocket (Socket.IO)              │  Socket.IO (realtime)       │
│  • Yjs (CRDT client) │  ─────────────────────────────────▶   │   /join-note, /update, ...  │
│  • Yjs Awareness     │  ◀─────────────────────────────────   │   Yjs document store        │
│  • Yjs UndoManager   │        update sync + presence        └──────────────┬──────────────┘
└──────────────────────┘                                              │  Mongoose (ODM)
                                                                     ▼
                                                            ┌──────────────────────┐
                                                            │     MongoDB (Atlas)    │
                                                            │   User, Note coll.     │
                                                            └──────────────────────┘
```

## Components

### Client (`client/`)

Vite + React 19 SPA. No UI framework — a hand-written "Lumina" design system lives in
`src/index.css` (CSS variables + Material-3-style palettes for light and dark themes).

| File | Responsibility |
| --- | --- |
| `src/main.jsx` | Entry point; wraps `<App />` in `<ThemeProvider>` |
| `src/App.jsx` | Router (`/`, `/notes`, `/login`, `/register`, `/join`, `/note/:noteId`) + `AuthProvider` + Toaster |
| `src/auth/AuthContext.jsx` | Holds current `user`; `login`, `register`, `logout`, `refetch` via `fetch` with `credentials: "include"`; provides `socketToken` for Socket.IO auth |
| `src/auth/useAuth.js` | Hook to consume auth context |
| `src/theme/ThemeProvider.jsx` | Dark/light state, persists to `localStorage`, writes `data-theme` on `<html>` |
| `src/theme/themeContext.js` | `ThemeContext` + `useTheme()` + initial-theme helper (system preference) |
| `src/pages/home.jsx` | Dashboard: search, create note, "Recent Notes" (owned), "Shared With Me", user dropdown (settings, logout), **Manage Notes link** |
| `src/pages/ManageNotesPage.jsx` | **Dedicated note management page** (`/notes`): search, sort, multi-select, bulk delete, open/delete per-note via overflow menu |
| `src/pages/Login.jsx`, `src/pages/Register.jsx` | Auth screens |
| `src/pages/join.jsx` | Paste-a-link entry point for guests/collaborators |
| `src/pages/NotePage.jsx` | Route wrapper that resolves identity and renders `Editor` |
| `src/editor/Editor.jsx` | The collaboration UI: Quill editor bound to Yjs, **remote cursors/selections via Yjs Awareness**, **connection status indicator**, presence avatars, people panel, share/QR modal, owner controls, **Yjs UndoManager for collaborative undo/redo** |
| `src/sockets/socket.js` | Singleton Socket.IO client (`getSocket(authToken)`, `disconnectSocket()`) |
| `src/components/SettingsModal.jsx` | **Settings modal**: Profile (username only, email read-only), Appearance (theme), Account (logout, delete account) |

#### Editor data flow

1. `Editor` creates a `Y.Doc` and calls `getSocket(socketToken)`.
2. Emits `join-note { noteId, userName }`.
3. Server responds with `sync` (encoded Yjs state, owner info, users, permissions, title).
4. `QuillBinding(ydoc.getText("quill"), quill, awareness)` keeps Quill ⇄ Yjs in sync with **Yjs Awareness for remote cursors**.
5. Local edits produce Yjs updates broadcast over Socket.IO; every client applies them
   (CRDT merges guarantee convergence).
6. **`Y.UndoManager` tracks local changes only** — undo/redo affects only the current user's edits.
7. **Connection status** tracked via Socket.IO events (`connect`, `disconnect`, `connect_error`).
8. Read-only users have `quill.disable()` applied; the server independently rejects
   their `update` events.
9. **On reconnection**, client re-sends `join-note`; server responds with fresh `sync` to restore state.

### Server (`server/`)

| File | Responsibility |
| --- | --- |
| `index.js` | Express app bootstrap: CORS (credentials), JSON, cookie-parser, DB connect, REST routes, Socket.IO wiring |
| `config/db.js` | Mongoose connection (redacts credentials in logs) |
| `middleware/auth.js` | JWT sign/verify; `authMiddleware` from httpOnly cookie; `optionalAuthMiddleware` |
| `routes/auth.js` | Register / Login / Logout / Me |
| `routes/notes.js` | Notes REST routes |
| `controllers/controller.js` | Note CRUD + shared-notes query |
| `models/user.js` | User schema; bcrypt (12 rounds) pre-save; `comparePassword`; password stripped from JSON |
| `models/note.js` | Note schema; `collaborators[]` subdocs; indexes on `ownerId` and `collaborators.userId` |
| `yjs/setupYjs.js` | Socket auth + full realtime collaboration layer + **Yjs Awareness relay** + **force-save on last user leave** |

## Authentication & Authorization

- **Registration/Login** validate input, hash/verify password with bcrypt, sign a JWT
  (`7d` expiry) and set it in an **httpOnly cookie** (`sameSite: lax`, `secure` in production).
- **REST** endpoints use `authMiddleware`, which reads the cookie and sets `req.userId`.
- **Socket.IO** auth runs as a middleware: token is read from `handshake.auth.token`,
  `handshake.query.token`, or the `cookie` header (via `cookie` package). A verified token
  marks the socket as authenticated; otherwise the socket is treated as a guest.
- **Owner check** is always server-side: `note.ownerId.toString() === req.userId`.
- **Write permission** is enforced twice — client-side (Quill disabled) and server-side
  (the `update` event is dropped for non-owners/non-writers).
- **Guest owners** (unauthenticated users matching `ownerName`) can rename and manage permissions.

## REST API

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | — | Create account, set cookie |
| `POST` | `/api/auth/login` | — | Log in, set cookie |
| `POST` | `/api/auth/logout` | — | Clear cookie |
| `GET` | `/api/auth/me` | required | Current user |
| `POST` | `/api/notes` | required | Create note (owner = user) |
| `GET` | `/api/notes` | required | Notes owned by user |
| `GET` | `/api/notes/shared` | required | Notes where user is a collaborator (+ `userPermission`) |
| `GET` | `/api/notes/:id` | public | Fetch note (guest join) |
| `PATCH` | `/api/notes/:id/title` | owner | Rename note |
| `DELETE` | `/api/notes/:id` | owner | Delete note |

## Realtime Protocol (Socket.IO)

| Event | Direction | Description |
| --- | --- | --- |
| `join-note` | C → S | Join a note session (`noteId`, `userName`) |
| `leave-note` | C → S | Explicit clean leave |
| `sync` | S → C | Initial document state + owner + users + permissions + title |
| `update` | C ↔ S | CRDT document update (rejected without write permission) |
| `user-joined` | S → C | Presence: new participant |
| `user-left` | S → C | Presence: participant left/kicked |
| `remove-user` | C → S | Owner kicks a user (added to per-note kick list) |
| `toggle-write` | C → S | Owner flips a collaborator's permission |
| `permission-changed` | S → C | Broadcast permission change |
| `update-title` | C → S | Owner renames note |
| `title-changed` | S → C | Broadcast new title |
| `awareness-update` | C ↔ S | **Cursor/selection presence (Yjs Awareness state)** |
| `awareness-remove` | S → C | **Remove remote cursor on user leave** |
| `error` | S → C | Error (kicked, note not found, …) |

### In-memory collaboration state (`setupYjs.js`)

| Map | Purpose |
| --- | --- |
| `documents` | `noteId → Y.Doc` (hydrated from `Note.content` on first join) |
| `activeUsers` | `noteId → Set<userName>` presence |
| `writePermissions` | `noteId → Map<userName, boolean>` runtime write state |
| `kickedUsers` | `noteId → Set<userName>` removed users (cleared when room empties) |
| `saveTimers` | Debounced (2s) persistence of the full Yjs state to MongoDB |
| `userAwareness` | `noteId → Map<clientID, awarenessState>` **remote cursor/selection state** |

## Data Model

```js
User {
  username: String   // unique, 2–30 chars
  email:    String   // unique, lowercased
  password: String   // bcrypt hash (12 rounds), excluded from JSON
}

Collaborator (subdocument of Note) {
  userId:     ObjectId → User
  userName:   String
  permission: "read" | "write"   // default "read"
}

Note {
  title:         String
  content:       Buffer           // encoded Yjs state
  ownerId:       ObjectId → User
  ownerName:     String
  collaborators: Collaborator[]
  createdAt / updatedAt: Date
  // indexes: { ownerId, createdAt: -1 }, { "collaborators.userId": 1 }
}
```

## Theming

- CSS custom properties are defined in `:root` (light) and `[data-theme="dark"]` (dark).
- `ThemeProvider` persists the choice under `weshare-theme` in `localStorage` and
  defaults to the OS `prefers-color-scheme`.
- Hard-coded translucent surfaces (headers, glass cards, secondary buttons) get dark
  overrides via `[data-theme="dark"] .selector` rules.

## Security Notes

- Passwords are hashed with bcrypt; never returned by the API (`toJSON` strips `password`).
- Secrets (Mongo URI, JWT secret) live in `.env`, which is gitignored; `.env.example`
  files are committed as templates.
- CORS is restricted to `CLIENT_URL` with credentials allowed.
- Authorization is enforced server-side for every REST route and realtime event;
  client-side UI restrictions are convenience only.

## Deployment Topology

A single Node process serves Express + Socket.IO behind one port. In production:

- Serve the built client statically (or from a CDN/host) pointed at the API via `VITE_SERVER_URL`.
- Set `NODE_ENV=production` so cookies are `secure`.
- For horizontal scaling, replace the in-memory Yjs maps with a shared store (e.g.
  Redis) — currently the design is single-instance.
