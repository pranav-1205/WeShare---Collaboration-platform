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

The system uses **CRDTs (Conflict-Free Replicated Data Types)** to ensure **conflict-free real-time collaboration** even when multiple users edit simultaneously.

---

## 🧠 Key Concepts Used

* **Real-time synchronization**
* **CRDT-based collaboration (Yjs)**
* **WebSockets (Socket.IO)**
* **Autosave with debounce**
* **Presence tracking (active users)**
* **Stateless user identity (no login system)**

---

## 🛠️ Tech Stack

### Frontend

* **React (Vite)**
* **Quill.js** – Rich text editor
* **Yjs + y-quill** – Real-time CRDT sync
* **Socket.IO Client**
* **React Router**
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

### 🔹 Real-Time Collaboration

* Multiple users can type simultaneously
* Changes sync instantly using Yjs
* No overwriting or conflicts

### 🔹 Active Users Presence

* Displays who is currently in the note
* Owner is highlighted
* Users disappear when they leave

### 🔹 Autosave

* Changes are saved automatically to MongoDB
* Uses debounce to reduce database load

### 🔹 Stateless Identity

* No authentication required
* Users join by entering a name
* Kahoot-style UX

### 🔹 Navigation Controls

* Back button to leave the editor
* Copy link button for sharing

---

## 🔄 How Real-Time Sync Works

1. A user joins a note using a link
2. The server loads the note content from MongoDB
3. Yjs creates a shared CRDT document
4. Updates are exchanged using Socket.IO
5. All clients stay in sync automatically
6. Periodic updates are saved to MongoDB

---

## 📡 Socket Events

| Event         | Description                   |
| ------------- | ----------------------------- |
| `join-note`   | User joins a note session     |
| `sync`        | Initial document + users list |
| `update`      | Document updates              |
| `user-joined` | Presence update               |
| `user-left`   | Presence cleanup              |

---

## 🧩 Database Schema

```js
Note {
  title: String,
  content: Buffer,   // Yjs encoded state
  owner: String,
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
3. Start writing
4. Copy the share link
5. Open link in another browser/tab
6. Collaborate in real time

---

## 🎯 Learning Outcomes

This project demonstrates:

* Real-time systems design
* CRDT-based collaboration
* WebSocket communication
* Frontend–backend integration
* State management under concurrency
* Clean UI/UX without heavy libraries

---

## 🔮 Future Enhancements

* Cursor presence (Google Docs style)
* Version history
* Read-only viewers
* User avatars
* Dark/Light mode toggle
* Export notes as PDF/Markdown

---

## 👨‍💻 Author

**Pranav**
Computer Science & Engineering Student
Built as part of an **internship mini-project** focusing on **real-time collaboration systems**.

---
