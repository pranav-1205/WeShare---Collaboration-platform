import * as Y from "yjs";
import Note from "../models/note.js";
import jwt from "jsonwebtoken";
import { parseCookie } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

const documents = new Map();
const saveTimers = new Map();
const activeUsers = new Map();
const kickedUsers = new Map();
const writePermissions = new Map();

function verifySocketToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getTokenFromHandshake(socket) {
  // Check auth token first (sent by client)
  let token = socket.handshake.auth.token || socket.handshake.query.token;
  
  // If no token, try to parse from cookie header
  if (!token && socket.handshake.headers.cookie) {
    const cookies = parseCookie(socket.handshake.headers.cookie);
    token = cookies.token;
  }
  
  return token;
}

export default function setupYjs(io) {
  io.use((socket, next) => {
    const token = getTokenFromHandshake(socket);
    const decoded = verifySocketToken(token);
    socket.user = decoded ? { userId: decoded.userId, authenticated: true } : { authenticated: false };
    next();
  });

  io.on("connection", (socket) => {
    const isAuthenticated = socket.user?.authenticated === true;
    const userId = socket.user?.userId;

    socket.on("join-note", async ({ noteId, userName }) => {
      if (!noteId || !userName) return;

      if (kickedUsers.has(noteId) && kickedUsers.get(noteId).has(userName)) {
        socket.emit("error", "You have been removed from this note");
        socket.disconnect(true);
        return;
      }

      socket.join(noteId);
      socket.data.noteId = noteId;
      socket.data.userName = userName;
      socket.data.isOwner = false;
      socket.data.authenticated = isAuthenticated;
      socket.data.userId = userId;

      if (!activeUsers.has(noteId)) {
        activeUsers.set(noteId, new Set());
      }
      activeUsers.get(noteId).add(userName);

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

      if (!writePermissions.has(noteId)) {
        writePermissions.set(noteId, new Map());
      }
      const perms = writePermissions.get(noteId);

      const isOwner = isAuthenticated && note.ownerId.toString() === userId;
      socket.data.isOwner = isOwner;

      perms.set(note.ownerName, true);
      for (const u of activeUsers.get(noteId)) {
        if (!perms.has(u)) perms.set(u, false);
      }

      if (!perms.has(userName)) {
        perms.set(userName, false);
      }

      socket.emit("sync", {
        update: Y.encodeStateAsUpdate(ydoc),
        owner: note.ownerName,
        ownerId: note.ownerId.toString(),
        users: Array.from(activeUsers.get(noteId)),
        writePermissions: Object.fromEntries(perms),
        title: note.title,
        isOwner,
        authenticated: isAuthenticated,
      });

      socket.to(noteId).emit("user-joined", { userName, isOwner: false, authenticated: false });

      // Add user as collaborator in database if not owner and authenticated
      if (isAuthenticated && !isOwner) {
        const existingCollab = note.collaborators.find(c => c.userId.toString() === userId);
        if (!existingCollab) {
          note.collaborators.push({
            userId,
            userName,
            permission: "read"
          });
          await note.save();
        } else if (existingCollab.permission === "read" && !perms.has(userName)) {
          // Ensure read permission is set
          existingCollab.permission = "read";
          await note.save();
        }
      }

      if (!perms.has(userName)) {
        perms.set(userName, false);
        io.to(noteId).emit("permission-changed", { userName, canWrite: false });
      }

      socket.on("remove-user", async ({ targetUserName }) => {
        if (!socket.data.isOwner) return;

        if (activeUsers.has(noteId)) {
          activeUsers.get(noteId).delete(targetUserName);
          if (activeUsers.get(noteId).size === 0) activeUsers.delete(noteId);
        }

        if (!kickedUsers.has(noteId)) kickedUsers.set(noteId, new Set());
        kickedUsers.get(noteId).add(targetUserName);

        io.to(noteId).emit("user-left", targetUserName);

        // Remove collaborator from database
        note.collaborators = note.collaborators.filter(c => c.userName !== targetUserName);
        await note.save();

        const room = io.sockets.adapter.rooms.get(noteId);
        if (room) {
          for (const socketId of room) {
            const targetSocket = io.sockets.sockets.get(socketId);
            if (targetSocket && targetSocket.data.userName === targetUserName) {
              targetSocket.disconnect(true);
              break;
            }
          }
        }
      });

      socket.on("toggle-write", async ({ targetUserName, canWrite }) => {
        if (!socket.data.isOwner) return;

        const perms = writePermissions.get(noteId);
        if (!perms) return;
        if (targetUserName === note.ownerName) return;

        perms.set(targetUserName, canWrite);
        io.to(noteId).emit("permission-changed", { userName: targetUserName, canWrite });

        // Persist permission change to database
        const collab = note.collaborators.find(c => c.userName === targetUserName);
        if (collab) {
          collab.permission = canWrite ? "write" : "read";
          await note.save();
        }
      });

      socket.on("update-title", async ({ title }) => {
        if (!socket.data.isOwner) return;

        const updatedNote = await Note.findByIdAndUpdate(noteId, { title }, { new: true });
        if (updatedNote) {
          io.to(noteId).emit("title-changed", { title: updatedNote.title });
        }
      });

      socket.on("update", (update) => {
        const perms = writePermissions.get(noteId);
        const canWrite = perms?.get(userName) === true;
        if (!canWrite) return;

        const safeUpdate = new Uint8Array(update);
        Y.applyUpdate(ydoc, safeUpdate);
        socket.to(noteId).emit("update", safeUpdate);

        clearTimeout(saveTimers.get(noteId));
        saveTimers.set(noteId, setTimeout(async () => {
          const state = Y.encodeStateAsUpdate(ydoc);
          await Note.findByIdAndUpdate(noteId, { content: Buffer.from(state) });
        }, 2000));
      });

      socket.on("disconnect", () => {
        if (activeUsers.has(noteId) && activeUsers.get(noteId).has(userName)) {
          activeUsers.get(noteId).delete(userName);
          if (activeUsers.get(noteId).size === 0) {
            activeUsers.delete(noteId);
            kickedUsers.delete(noteId);
          }
          socket.to(noteId).emit("user-left", userName);
        }
      });

      socket.on("leave-note", () => {
        if (activeUsers.has(noteId) && activeUsers.get(noteId).has(userName)) {
          activeUsers.get(noteId).delete(userName);
          if (activeUsers.get(noteId).size === 0) {
            activeUsers.delete(noteId);
            kickedUsers.delete(noteId);
          }
          socket.to(noteId).emit("user-left", userName);
        }
        socket.leave(noteId);
      });
    });
  });
}