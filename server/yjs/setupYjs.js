import * as Y from "yjs";
import Note from "../models/note.js";

const documents = new Map();     // noteId -> Y.Doc
const saveTimers = new Map();    // noteId -> timeout
const activeUsers = new Map();   // noteId -> Set(userNames)

export default function setupYjs(io) {
  io.on("connection", (socket) => {

    socket.on("join-note", async ({ noteId, userName }) => {
      if (!noteId || !userName) return;

      socket.join(noteId);
      socket.data.noteId = noteId;
      socket.data.userName = userName;

      // 🔹 Track active users
      if (!activeUsers.has(noteId)) {
        activeUsers.set(noteId, new Set());
      }
      activeUsers.get(noteId).add(userName);

      // 🔹 Load or create Yjs document
      let ydoc = documents.get(noteId);

      const note = await Note.findById(noteId);
      if (!note) {
        socket.emit("error", "Note not found");
        return;
      }

      if (!ydoc) {
        ydoc = new Y.Doc();
        if (note.content) {
          Y.applyUpdate(ydoc, new Uint8Array(note.content));
        }
        documents.set(noteId, ydoc);
      }

      // 🔹 Initial sync (THIS FIXES CLIENT CRASH)
      socket.emit("sync", {
        update: Y.encodeStateAsUpdate(ydoc),
        owner: note.owner,
        users: Array.from(activeUsers.get(noteId))
      });

      // 🔹 Notify others
      socket.to(noteId).emit("user-joined", userName);

      // 🔹 Handle document updates
      socket.on("update", (update) => {
        const safeUpdate = new Uint8Array(update);
        Y.applyUpdate(ydoc, safeUpdate);

        socket.to(noteId).emit("update", safeUpdate);

        // 🔹 Debounced save to DB
        clearTimeout(saveTimers.get(noteId));
        saveTimers.set(
          noteId,
          setTimeout(async () => {
            const state = Y.encodeStateAsUpdate(ydoc);
            await Note.findByIdAndUpdate(noteId, {
              content: Buffer.from(state)
            });
          }, 2000)
        );
      });

      // 🔹 Cleanup on disconnect
      socket.on("disconnect", () => {
        if (activeUsers.has(noteId)) {
          activeUsers.get(noteId).delete(userName);

          if (activeUsers.get(noteId).size === 0) {
            activeUsers.delete(noteId);
          }
        }

        socket.to(noteId).emit("user-left", userName);
      });
    });

  });
}
