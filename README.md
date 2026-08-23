**COMPANY**: CODETECH IT SOLUTIONS

**NAME**: PRANAV V SADWELKAR

**INTERN ID**: CT04DR2516

**DOMAIN**: SOFTWARE DEVELOPMENT

**DURATION**: 4 WEEKS

**MENTOR**: NEELA SANTOSH KUMAR

---
`Task-03 - Collaboration_tool/README.md`
---

# 📝 Real-Time Collaborative Notes Application — WeShare

A **real-time collaborative note-taking web application** where users create accounts,
own notes, and collaborate in the same document simultaneously via a shared link.
Documents are synchronized with **CRDTs (Yjs)** over WebSockets, so concurrent edits
never conflict or overwrite each other.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for a deep dive into the system design.

---

## 🚀 Project Overview

The application provides:

* Account registration / login with **JWT + httpOnly cookies**
* A **dashboard** with search, recent notes, and "shared with me"
* Instant note creation and QR-code sharing
* **Real-time collaboration** on any note
* **Owner controls**: rename, grant/revoke write access, and remove users
* Guest joins via link (read-only by default)
* Active-user presence with a Google Meet-style **people panel**
* Automatic saving to MongoDB (debounced)
* **Dark / Light theme** toggle

---

## 🧠 Key Concepts Used

* Real-time synchronization
* **CRDT-based collaboration (Yjs)**
* WebSockets (Socket.IO)
* JWT authentication with httpOnly cookies
* Role-based access control (owner / read / write)
* Presence tracking (active users)
* Debounced autosave to MongoDB
* CSS-variable theming (Material-3 palette)

---

## 🛠️ Tech Stack

### Frontend

* **React 19 (Vite)** – SPA
* **Quill.js + y-quill** – rich text editor bound to Yjs
* **Yjs** – CRDT data model
* **y-protocols** – Yjs Awareness protocol
* **quill-cursors** – remote cursor rendering for Quill
* **Yjs Awareness** – cursor/selection presence
* **Yjs UndoManager** – collaborative undo/redo
* **Socket.IO Client**
* **React Router** – routing
* **qrcode.react** – QR-code sharing
* **react-hot-toast** – notifications
* **Custom CSS** (no UI framework) – "Lumina" design system

### Backend

* **Node.js + Express**
* **Socket.IO** – realtime transport
* **MongoDB (Mongoose)** – persistence
* **Yjs** – server-side CRDT document store
* **jsonwebtoken + cookie-parser** – session auth
* **bcrypt** – password hashing

---

## 🗂️ Project Structure

```
Task-03-Collaboration-Tool/
│
├── client/                          # React SPA
│   ├── src/
│   │   ├── auth/
│   │   │   ├── AuthContext.jsx      # user state + login/register/logout
│   │   │   └── useAuth.js           # useAuth() hook
│   │   ├── theme/
│   │   │   ├── ThemeProvider.jsx    # dark/light provider + persistence
│   │   │   └── themeContext.js      # context + useTheme() hook
│   │   ├── pages/
│   │   │   ├── home.jsx             # dashboard (recent/shared/search)
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── join.jsx             # paste-link entry for collaborators
│   │   │   └── NotePage.jsx         # editor route wrapper
│   │   ├── editor/
│   │   │   └── Editor.jsx           # Quill + Yjs + people panel + owner controls
│   │   ├── sockets/
│   │   │   └── socket.js            # singleton Socket.IO client
│   │   ├── App.jsx                  # routes + providers
│   │   ├── main.jsx                 # entry point
│   │   └── index.css                # Lumina design system (light + dark)
│   └── .env.example                 # VITE_SERVER_URL
│
├── server/
│   ├── config/
│   │   └── db.js                    # Mongoose connection
│   ├── controllers/
│   │   └── controller.js            # note CRUD + shared notes
│   ├── middleware/
│   │   └── auth.js                  # JWT sign/verify + auth middleware
│   ├── models/
│   │   ├── user.js                  # User schema (bcrypt)
│   │   └── note.js                  # Note + collaborator schema
│   ├── routes/
│   │   ├── auth.js                  # /api/auth/*
│   │   └── notes.js                 # /api/notes/*
│   ├── yjs/
│   │   └── setupYjs.js              # Socket.IO auth + collaboration layer
│   ├── index.js                     # app bootstrap
│   ├── .env.example
│   └── package.json
│
├── ARCHITECTURE.md                  # system design reference
├── .gitignore
└── README.md
```

---

## ✨ Features

### 🔹 Authentication

* Register / login with username, email, password
* Password hashed with bcrypt (12 rounds)
* JWT stored in an **httpOnly cookie** (7-day expiry), sent automatically on every request
* `GET /api/auth/me` restores the session on refresh

### 🔹 Dashboard

* **Search** across your notes
* **Recent Notes** — notes you own
* **Shared With Me** — notes where you are a collaborator, with your permission badge
* One-click **New Note**
* User menu: **theme toggle** and **logout**

### 🔹 Create & Share Notes

* Instant note creation; a unique MongoDB `_id` becomes the URL
* Copyable share link + **QR code** for mobile sharing
* Guests and collaborators join by pasting the link

### 🔹 Real-Time Collaboration

* Multiple users type simultaneously without conflicts (CRDT)
* New participants default to **read-only**
* The owner can grant/revoke **write access** per user
* **Remote cursors & selections** — see where others are typing (Google Docs style)
* **Connection status indicator** — Connected / Reconnecting / Offline
* **Collaborative undo/redo** — your undo only affects your own edits

### 🔹 Owner Controls

* **Rename** the note title (synced to all clients)
* **Toggle write permission** per collaborator
* **Remove/kick** users (they cannot rejoin until the room empties)

### 🔹 People Panel (Google Meet style)

* Slides in from the right showing all active participants
* **Owner** / **You** badges
* Per-user permission toggle and remove buttons (owner only)
* Live presence updates as users join/leave

### 🔹 Autosave & Persistence

* Yjs state encoded and stored in MongoDB as a `Buffer`
* Debounced (2s) writes reduce database load
* **Force-save on last user leave** — content never lost
* Rejoining reloads the document from the stored state

### 🔹 Theming

* **Dark / Light mode** toggle in the user menu
* Follows OS preference by default; persisted in `localStorage`
* Full Material-3 color palette via CSS variables

---

## 🔄 How Real-Time Sync Works

1. A user opens a note link and joins the session
2. The server loads the note from MongoDB and hydrates a `Y.Doc` (or reuses the in-memory one)
3. The initial state is sent to the client via the `sync` event
4. **Client initializes Yjs Awareness and UndoManager** (once per session)
5. Edits propagate as Yjs CRDT updates over Socket.IO
6. All clients apply the same updates → automatic convergence
7. **Remote cursors/selections** broadcast via `awareness-update` events
8. A debounced timer (2s) persists the full state back to MongoDB
9. **On last user leave**, server force-saves immediately

**Write Permission Flow:**
1. New users join with read-only permission
2. The owner toggles access from the people panel
3. Server broadcasts `permission-changed` to every client
4. The target client disables/enables Quill accordingly
5. The server also rejects `update` events from users without write access

**Reconnection Flow:**
1. Socket disconnects (network issue, tab backgrounded)
2. Client shows "Reconnecting..." status
3. Socket reconnects, client re-sends `join-note`
4. Server responds with fresh `sync` (current document state)
5. Client applies update → seamless restoration

---

## 📡 Socket Events

| Event | Direction | Description |
| --- | --- | --- |
| `join-note` | Client → Server | Join a note session |
| `leave-note` | Client → Server | Explicit leave (clean disconnect) |
| `sync` | Server → Client | Initial document + users + permissions |
| `update` | Both | CRDT document updates |
| `user-joined` | Server → Client | Presence: new user joined |
| `user-left` | Server → Client | Presence: user left/kicked |
| `remove-user` | Client → Server | Owner kicks a user |
| `toggle-write` | Client → Server | Owner changes write permission |
| `permission-changed` | Server → Client | Broadcast permission change |
| `update-title` | Client → Server | Owner updates note title |
| `title-changed` | Server → Client | Broadcast title change |
| `awareness-update` | Both | **Cursor/selection presence (Yjs Awareness)** |
| `awareness-remove` | Server → Client | **Remove remote cursor on user leave** |
| `error` | Server → Client | Error messages (kicked, not found, etc.) |

---

## 🧩 Database Schema

```js
User {
  username: String,   // unique, 2–30 chars
  email:    String,   // unique, lowercased
  password: String,   // bcrypt hash (never serialized)
}

Note {
  title:         String,
  content:       Buffer,       // encoded Yjs state
  ownerId:       ObjectId → User,
  ownerName:     String,
  collaborators: [{ userId: ObjectId, userName: String, permission: "read" | "write" }],
  createdAt:     Date,
  updatedAt:     Date
}
```

---

## ⚙️ Installation & Setup

> Requires **Node.js 18+** and a MongoDB instance (local or Atlas).

### 1️⃣ Clone Repository

```bash
git clone <repository-url>
cd Task-03-Collaboration-Tool
```

### 2️⃣ Backend Setup

```bash
cd server
npm install
```

Create `.env` (copy from `.env.example`):

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/collab_notes
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=3001
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Start the server:

```bash
npm start
```

### 3️⃣ Frontend Setup

```bash
cd client
npm install
```

Create `client/.env` (copy from `client/.env.example`):

```env
VITE_SERVER_URL=http://localhost:3001
```

Start the dev server:

```bash
npm run dev
```

### 4️⃣ Open the Application

```
http://localhost:5173
```

> ⚠️ The real `.env` files are gitignored — never commit secrets.

---

## 🧪 How to Use

1. **Register / Log in** on the landing page
2. Click **New Note** to create one
3. Share the link or scan the QR code to invite collaborators
4. In the editor, click the **people icon** to open the participant panel
5. **Owner**: rename the title, toggle write access, or remove users
6. Guests open the shared link and **paste it in** (or land directly on the note)
7. Everyone types in real time; changes auto-save

---

## 🎯 Learning Outcomes

This project demonstrates:

* Real-time systems design (WebSockets + CRDTs)
* JWT session management with httpOnly cookies
* Role-based access control in real-time applications
* Full-stack integration (React ⇄ Express ⇄ MongoDB)
* State management under concurrency
* Secure persistence (bcrypt, cookie flags, server-side authorization)
* Clean UI/UX with a custom design system and theming

---

## 🔮 Future Enhancements

* Version history & restore
* Export notes as PDF / Markdown
* Image avatars / profile pictures
* Offline editing with sync-on-reconnect (IndexedDB + Yjs)
* Redis-backed state for horizontal scaling
* Commenting / annotations
* Rich text formatting: images, tables, code blocks

---

## 👨‍💻 Author

**Pranav V Sadwelkar**
Computer Science & Engineering Student
Built as part of an **internship mini-project** focusing on **real-time collaboration systems**.

---
