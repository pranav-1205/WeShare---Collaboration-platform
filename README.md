**COMPANY**: CODETECH IT SOLUTIONS

**NAME**: PRANAV V SADWELKAR

**INTERN ID**: CT04DR2516

**DOMAIN**: SOFTWARE DEVELOPMENT

**DURATION**: 4 WEEKS

**MENTOR**: NEELA SANTOSH KUMAR

---
`Task-03 - Collaboration_tool/README.md`
---

# 📝 Real-Time Collaborative Notes Application

A **real-time collaborative note-taking web application** that allows multiple users to edit the same document simultaneously without creating accounts.
The application follows a **Kahoot-style identity model**, where users join with a display name and collaborate instantly via a shared link.

---

## 🚀 Project Overview

This project enables users to:

* Create a new note instantly
* Share a link with others
* Collaborate in real time
* See active users in the session
* Automatically save content to the database
* Leave and rejoin without losing data
* **Rename notes** (owner only)
* **Control write permissions** per collaborator (owner only)
* **Remove/kick users** from session (owner only)
* **View participants** in a Google Meet-style side panel

The system uses **CRDTs (Conflict-Free Replicated Data Types)** to ensure **conflict-free real-time collaboration** even when multiple users edit simultaneously.

---

## 🧠 Key Concepts Used

* **Real-time synchronization**
* **CRDT-based collaboration (Yjs)**
* **WebSockets (Socket.IO)**
* **Autosave with debounce**
* **Presence tracking (active users)**
* **Stateless user identity (no login system)**
* **Role-based write permissions**
* **Participant management panel**

---

## 🛠️ Tech Stack

### Frontend

* **React (Vite)**
* **Quill.js** – Rich text editor
* **Yjs + y-quill** – Real-time CRDT sync
* **Socket.IO Client**
* **React Router**
* **qrcode.react** – QR code sharing
* **react-hot-toast** – Notifications
* **Custom modern CSS (no frameworks)**

### Backend

* **Node.js**
* **Express.js**
* **Socket.IO**
* **MongoDB (Mongoose)**
* **Yjs server-side persistence**

---

## 🗂️ Project Structure

```
Task-03-Collaboration-Tool/
│
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Join.jsx
│   │   │   └── NotePage.jsx
│   │   ├── editor/
│   │   │   └── Editor.jsx
│   │   ├── sockets/
│   │   │   └── socket.js
│   │   ├── index.css
│   │   └── App.jsx
│   └── package.json
│
├── server/
│   ├── controllers/
│   │   └── controller.js
│   ├── models/
│   │   └── note.js
│   ├── routes/
│   │   └── notes.js
│   ├── yjs/
│   │   └── setupYjs.js
│   ├── config/
│   │   └── db.js
│   ├── index.js
│   └── package.json
│
└── README.md
```

---

## ✨ Features

### 🔹 Create & Share Notes

* Users can create a note instantly
* A unique MongoDB `_id` is generated
* Shareable link allows others to join
* **QR code for instant mobile sharing**

### 🔹 Real-Time Collaboration

* Multiple users can type simultaneously
* Changes sync instantly using Yjs
* No overwriting or conflicts
* **Read-only mode for new users by default**

### 🔹 Participant Management (Owner Controls)

* **Google Meet-style side panel** — slide-in from right with all participants
* **Per-user write permissions** — toggle between "Can edit" / "Read-only"
* **Remove/kick users** — they cannot rejoin (banned until room clears)
* **Owner badge** — always has write access
* **"You" badge** — identifies current user

### 🔹 Active Users Presence

* Displays who is currently in the note
* Owner is highlighted with badge
* Users disappear when they leave
* **Read-only badge (👁️)** shown for view-only participants

### 🔹 Note Title

* **Editable title at top** (owner only)
* Real-time sync across all clients
* Auto-saves on blur (debounced)

### 🔹 Autosave

* Changes are saved automatically to MongoDB
* Uses debounce to reduce database load

### 🔹 Stateless Identity

* No authentication required
* Users join by entering a name
* Kahoot-style UX

### 🔹 Navigation & Sharing

* Back button to leave the editor
* Copy link button for sharing
* QR code modal for mobile sharing
* **Explicit leave event** for clean disconnect

---

## 🔄 How Real-Time Sync Works

1. A user joins a note using a link
2. The server loads the note content from MongoDB
3. Yjs creates a shared CRDT document
4. Updates are exchanged using Socket.IO
5. All clients stay in sync automatically
6. Periodic updates are saved to MongoDB

**Write Permission Flow:**
1. New users join with `canWrite: false` (read-only)
2. Owner sees toggle buttons in side panel
3. Owner toggles → server broadcasts `permission-changed`
4. Target user's Quill editor switches to/from read-only
5. Server rejects `update` events from users without write permission

---

## 📡 Socket Events

| Event            | Direction       | Description                              |
| ---------------- | --------------- | ---------------------------------------- |
| `join-note`      | Client → Server | User joins a note session                |
| `leave-note`     | Client → Server | Explicit leave (clean disconnect)        |
| `sync`           | Server → Client | Initial document + users + permissions   |
| `update`         | Both            | Document CRDT updates                    |
| `user-joined`    | Server → Client | Presence: new user joined                |
| `user-left`      | Server → Client | Presence: user left/kicked               |
| `remove-user`    | Client → Server | Owner kicks a user                       |
| `toggle-write`   | Client → Server | Owner changes write permission           |
| `permission-changed` | Server → Client | Broadcast permission change            |
| `update-title`   | Client → Server | Owner updates note title                 |
| `title-changed`  | Server → Client | Broadcast title change                   |
| `error`          | Server → Client | Error messages (kicked, not found, etc.) |

---

## 🧩 Database Schema

```js
Note {
  title: String,           // Note title (editable by owner)
  content: Buffer,         // Yjs encoded state
  owner: String,           // Creator's name
  createdAt: Date,
  updatedAt: Date
}
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone <repository-url>
cd Task-03-Collaboration-Tool
```

---

### 2️⃣ Backend Setup

```bash
cd server
npm install
```

Create `.env` file:

```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/collab_notes
```

Start server:

```bash
npm start
```

---

### 3️⃣ Frontend Setup

```bash
cd client
npm install
npm run dev
```

---

### 4️⃣ Open Application

```
http://localhost:5173
```

---

## 🧪 How to Use

1. Enter your name on the Home page
2. Click **Create New Note**
3. **Click the title at top** to rename (owner only)
4. Start writing
5. Click **Participants** (people icon) in top bar to open side panel
6. **Owner**: toggle write permissions / remove users from panel
7. Copy the share link or use QR code
8. Open link in another browser/tab
9. Collaborate in real time

---

## 🎯 Learning Outcomes

This project demonstrates:

* Real-time systems design
* CRDT-based collaboration
* WebSocket communication
* Frontend–backend integration
* State management under concurrency
* Clean UI/UX without heavy libraries
* Role-based access control in real-time apps
* Client-side optimistic UI with server validation

---

## 🔮 Future Enhancements

* Cursor presence (Google Docs style)
* Version history
* Dark/Light mode toggle
* Export notes as PDF/Markdown
* User avatars with image upload
* Rich text formatting toolbar enhancements
* Commenting/annotations

---

## 👨‍💻 Author

**Pranav**
Computer Science & Engineering Student
Built as part of an **internship mini-project** focusing on **real-time collaboration systems**.

---