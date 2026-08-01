import * as Y from "yjs";

const documents = new Map();

export default function setupYjs(io) {
  io.on("connection", (socket) => {

    socket.on("join-note", (noteId) => {
      socket.join(noteId);

      let ydoc = documents.get(noteId);
      if (!ydoc) {
        ydoc = new Y.Doc();
        documents.set(noteId, ydoc);
      }

      // Send current state
      socket.emit("sync", Y.encodeStateAsUpdate(ydoc));

      // Receive updates
      socket.on("update", (update) => {
        Y.applyUpdate(ydoc, update);
        socket.to(noteId).emit("update", update);
      });
    });

  });
}
