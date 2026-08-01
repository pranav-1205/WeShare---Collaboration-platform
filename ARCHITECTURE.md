# Architecture Documentation

## System Overview

Real-time collaborative note-taking application using CRDTs (Yjs) for conflict-free concurrent editing, Socket.IO for real-time communication, and MongoDB for persistence.

---

## High-Level Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   React Client  │ ◄─────────────────► │  Node.js Server │
│  (Vite + React) │    (Socket.IO)      │  (Express + IO) │
└────────┬────────┘                     └────────┬────────┘
         │                                       │
         │                              ┌────────▼────────┐
         │                              │    MongoDB      │
         └─────────────────────────────► │  (Mongoose)     │
            REST API (titles, notes)     └─────────────────┘
```

---

## Client Architecture

### State Management
- **React hooks** (`useState`, `useRef`, `useEffect`) for local state
- **No external state library** - minimal, self-contained
- **Refs** for non-reactive values: `quillRef`, `ydocRef`, `ownerRef`, `syncedRef`

### Component Tree
```
App
├── BrowserRouter
├── Toaster (react-hot-toast)
└── Routes
    ├── / (Home)
    │   └── Landing page with join card
    ├── /join (Join)
    │   └── Paste link to join existing note
    └── /note/:noteId (NotePage)
        └── Editor
            ├── Top bar (Back, Share, Copy Link, People toggle)
            ├── Title input (owner editable)
            ├── Inline avatars (mobile)
            ├── Quill editor (CRDT-bound)
            ├── Footer
            ├── People Panel (side drawer)
            └── Share Modal (QR + link)
```

### Editor Initialization Flow
```
1. Mount Editor component
2. useEffect triggers (noteId + userName)
3. Create/reuse Y.Doc (ydocRef)
4. socket.emit("join-note", { noteId, userName })
5. Wait for socket.once("sync")
6. On sync:
   - Apply initial Yjs state
   - Initialize Quill on editorRef.current
   - Create QuillBinding(ytext, quill)
   - Set read-only based on permissions
   - Start listening for ydoc updates
7. Socket listeners attached:
   - update (remote changes)
   - user-joined/user-left
   - permission-changed
   - title-changed
   - error
```

---

## Server Architecture

### Core Modules
```
server/
├── index.js              # Express + Socket.IO setup
├── config/db.js          # MongoDB connection
├── models/note.js        # Mongoose schema
├── routes/notes.js       # REST endpoints
├── controllers/
│   └── controller.js     # CRUD + title update
└── yjs/
    └── setupYjs.js       # Real-time collaboration logic
```

### In-Memory State (per server process)
```javascript
documents = Map<noteId, Y.Doc>           // Yjs documents
saveTimers = Map<noteId, Timeout>        // Debounced save timers
activeUsers = Map<noteId, Set<userName>> // Currently connected
kickedUsers = Map<noteId, Set<userName>> // Banned from rejoining
writePermissions = Map<noteId, Map<userName, boolean>> // Write access
```

### Socket Event Handlers (per connection)
```
join-note → validate → load note → init permissions → emit sync
leave-note → cleanup activeUsers → emit user-left
remove-user (owner) → delete from active/kicked → force disconnect
toggle-write (owner) → update perms → broadcast permission-changed
update-title (owner) → persist to DB → broadcast title-changed
update (from client) → check perms → apply to ydoc → broadcast → debounced save
disconnect → cleanup if not kicked
```

### Permission Model
- **Owner**: Always `canWrite: true`, cannot be changed
- **New users**: Default `canWrite: false` (read-only)
- **Owner actions**: Toggle any user's write permission via side panel
- **Server enforcement**: Rejects `update` events from users without permission

---

## Data Flow

### Create Note
```
POST /api/notes { title, owner }
→ controller.createNote()
→ Note.create() in MongoDB
→ returns { _id, title, owner }
→ Client navigates to /note/:id
```

### Join Note
```
Client: socket.emit("join-note", { noteId, userName })
Server: 
  1. Check kickedUsers
  2. Join socket room
  3. Load/create Y.Doc from MongoDB
  4. Init writePermissions (owner=true, others=false)
  5. Emit "sync" to joining client
  6. Broadcast "user-joined" to room
```

### Real-Time Edit
```
Client types → Quill → ydoc.on("update") → socket.emit("update")
Server:
  1. Check writePermissions[userName] === true
  2. Y.applyUpdate(ydoc, update)
  3. socket.to(room).emit("update")
  4. Debounced save to MongoDB (2s)
```

### Permission Change
```
Owner clicks toggle in panel → socket.emit("toggle-write", { target, canWrite })
Server:
  1. Verify requester is owner
  2. Update writePermissions map
  3. io.to(room).emit("permission-changed", { userName: target, canWrite })
Clients:
  1. Receive event
  2. Update local writePermissions state
  3. If target === self: quill.enable(canWrite)
```

### Title Update
```
Owner edits title input → onBlur debounced → socket.emit("update-title", { title })
Server:
  1. Verify owner
  2. Note.findByIdAndUpdate()
  3. io.to(room).emit("title-changed", { title })
Clients: setNoteTitle(title)
```

---

## Security Considerations

| Aspect | Implementation |
|--------|----------------|
| **No auth** | Stateless, name-based (Kahoot-style) |
| **Write control** | Server-enforced per-message validation |
| **Kick/ban** | Kicked users tracked in memory, rejected on rejoin |
| **Owner trust** | Only owner can toggle perms/kick/update title |
| **CORS** | Open (`origin: "*"`) for dev; restrict in prod |
| **MongoDB** | Connection string in env var |

---

## Scaling Notes

### Current Limitations (Single Process)
- In-memory maps (`documents`, `activeUsers`, etc.) don't share across processes
- Socket.IO rooms work single-process only

### Horizontal Scaling Requirements
1. **Redis adapter** for Socket.IO: `io.adapter(createAdapter(redisClient))`
2. **Shared Yjs persistence**: Use `y-leveldb` or custom provider with Redis/Mongo
3. **Sticky sessions** or shared in-memory state via Redis
4. **Document locking** for concurrent Y.Doc access

### Production Checklist
- [ ] Restrict CORS to known origins
- [ ] Add rate limiting on socket connections
- [ ] Implement Redis adapter for multi-process
- [ ] Add request validation/sanitization
- [ ] Set up MongoDB indexes
- [ ] Add health checks / monitoring
- [ ] Configure proper logging
- [ ] Set up CI/CD pipeline

---

## File Reference

### Client
| File | Purpose |
|------|---------|
| `client/src/main.jsx` | Entry point |
| `client/src/App.jsx` | Router + Toaster |
| `client/src/pages/Home.jsx` | Landing page |
| `client/src/pages/Join.jsx` | Join by link |
| `client/src/pages/NotePage.jsx` | Route guard + Editor wrapper |
| `client/src/editor/Editor.jsx` | Main editor component |
| `client/src/sockets/socket.js` | Socket.IO client instance |
| `client/src/index.css` | Lumina design system + all styles |

### Server
| File | Purpose |
|------|---------|
| `server/index.js` | Express + Socket.IO bootstrap |
| `server/config/db.js` | Mongoose connection |
| `server/models/note.js` | Note schema |
| `server/routes/notes.js` | REST routes |
| `server/controllers/controller.js` | REST handlers |
| `server/yjs/setupYjs.js` | Socket.IO real-time logic |

---

## Development Commands

```bash
# Backend
cd server && npm start        # Development (nodemon)
cd server && npm test         # No tests yet

# Frontend
cd client && npm run dev      # Vite dev server
cd client && npm run build    # Production build
cd client && npm run lint     # ESLint
cd client && npm run preview  # Preview production build
```

---

## Environment Variables

### Server
```
MONGO_URI=mongodb+srv://user:pass@cluster/db
PORT=3001 (default)
```

### Client (Vite)
```
VITE_API_URL=http://localhost:3001 (optional, defaults to same origin)
```