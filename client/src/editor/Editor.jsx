import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Quill from "quill";
import * as Y from "yjs";
import { QuillBinding } from "y-quill";
import socket from "../sockets/socket";
import "quill/dist/quill.snow.css";

export default function Editor({ noteId, userName }) {
  const navigate = useNavigate();

  const editorRef = useRef(null);
  const syncedRef = useRef(false);

  const [users, setUsers] = useState([]);
  const [owner, setOwner] = useState("");

  // 🔴 Fail loudly instead of blank screen
  if (!noteId || !userName) {
    return (
      <h2 className="text-center mt-10">
        Invalid note or missing user name
      </h2>
    );
  }

  useEffect(() => {
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("quill");

    const quill = new Quill(editorRef.current, {
      theme: "snow",
      placeholder: "Start collaborating...",
      modules: {
        toolbar: [
          [{ header: [1, 2, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["clean"],
        ],
      },
    });

    // 🔹 Join note room
    socket.emit("join-note", { noteId, userName });

    // 🔹 Initial sync
    socket.once("sync", ({ update, owner, users }) => {
      setOwner(owner);
      setUsers(Array.isArray(users) ? users : []);

      Y.applyUpdate(ydoc, new Uint8Array(update));
      new QuillBinding(ytext, quill);

      syncedRef.current = true;

      ydoc.on("update", (update) => {
        if (syncedRef.current) {
          socket.emit("update", update);
        }
      });
    });

    // 🔹 Receive remote updates
    socket.on("update", (update) => {
      if (syncedRef.current) {
        Y.applyUpdate(ydoc, new Uint8Array(update));
      }
    });

    // 🔹 User joined
    socket.on("user-joined", (name) => {
      setUsers((prev) => {
        if (prev.includes(name)) return prev;
        return [...prev, name];
      });
    });

    // 🔹 User left
    socket.on("user-left", (name) => {
      setUsers((prev) => prev.filter((u) => u !== name));
    });

    return () => {
      socket.off("update");
      socket.off("sync");
      socket.off("user-joined");
      socket.off("user-left");
      ydoc.destroy();
    };
  }, [noteId, userName]);

  return (
    <div className="card">
      {/* 🔝 Top bar */}
      <div className="editor-topbar">
        <div className="editor-actions">
          <button onClick={() => navigate(-1)}>← Back</button>

          <button
            className="secondary"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Share link copied!");
            }}
          >
            Copy Link
          </button>
        </div>
      </div>

      {/* 👥 Active users */}
      <div className="active-users">
        👥 Active users:{" "}
        {users.map((u, i) => (
          <span key={u}>
            {u === owner ? <strong>{u} (Owner)</strong> : u}
            {i < users.length - 1 ? ", " : ""}
          </span>
        ))}
      </div>

      {/* ✍️ Editor */}
      <div ref={editorRef} />
    </div>
  );
}
