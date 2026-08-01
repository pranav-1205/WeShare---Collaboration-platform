import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Quill from "quill";
import * as Y from "yjs";
import { QuillBinding } from "y-quill";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { getSocket } from "../sockets/socket";
import { useAuth } from "../auth/useAuth";
import "quill/dist/quill.snow.css";

const AVATAR_COLORS = ["#4648d4", "#6b38d4", "#006577", "#283044", "#8455ef"];

function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Editor({ noteId, userName }) {
  const navigate = useNavigate();
  const { socketToken } = useAuth();

  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const ydocRef = useRef(null);
  const syncedRef = useRef(false);

  const [users, setUsers] = useState([]);
  const [owner, setOwner] = useState("");
  const [writePermissions, setWritePermissions] = useState({});
  const [noteTitle, setNoteTitle] = useState("Untitled Note");
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPeoplePanel, setShowPeoplePanel] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const shareUrl = window.location.href;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  useEffect(() => {
    if (!noteId || !userName) return;

    const socket = getSocket(socketToken);

    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
    }
    const ydoc = ydocRef.current;
    const ytext = ydoc.getText("quill");

    socket.emit("join-note", { noteId, userName });

    socket.once("sync", ({ update, owner: ownerName, users, writePermissions, title, isOwner: ownerFlag }) => {
      setOwner(ownerName);
      setIsOwner(ownerFlag);
      setUsers(Array.isArray(users) ? users : []);
      setWritePermissions(writePermissions || {});
      setNoteTitle(title || "Untitled Note");

      Y.applyUpdate(ydoc, new Uint8Array(update));

      if (quillRef.current) {
        // Clean up previous Quill instance
        const oldQuill = quillRef.current;
        const container = oldQuill.container;
        if (container) {
          container.innerHTML = "";
        }
        quillRef.current = null;
      }

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
      quillRef.current = quill;

      new QuillBinding(ytext, quill);

      syncedRef.current = true;

      const canWrite = writePermissions?.[userName] === true || ownerName === userName || isOwner;
      quill.enable(canWrite);

      ydoc.on("update", (update) => {
        if (syncedRef.current) {
          socket.emit("update", update);
        }
      });
    });

    socket.on("update", (update) => {
      if (syncedRef.current) {
        Y.applyUpdate(ydoc, new Uint8Array(update));
      }
    });

    socket.on("user-joined", (data) => {
      const name = typeof data === "string" ? data : data.userName;
      setUsers((prev) => {
        if (prev.includes(name)) return prev;
        return [...prev, name];
      });
    });

    socket.on("user-left", (name) => {
      if (name === userName) {
        toast.error("You have been removed from this note");
        setTimeout(() => navigate("/"), 1500);
        return;
      }
      setUsers((prev) => prev.filter((u) => u !== name));
    });

    socket.on("permission-changed", ({ userName: targetUser, canWrite }) => {
      setWritePermissions((prev) => ({ ...prev, [targetUser]: canWrite }));

      if (targetUser === userName) {
        quillRef.current?.enable(canWrite || isOwner);
        if (canWrite || isOwner) {
          toast.success("You can now edit");
        } else {
          toast("Switched to read-only mode", { icon: "👁️" });
        }
      }
    });

    socket.on("title-changed", ({ title }) => {
      setNoteTitle(title);
    });

    socket.on("error", (message) => toast.error(message));

    return () => {
      socket.off("update");
      socket.off("sync");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("permission-changed");
      socket.off("title-changed");
      socket.off("error");
      if (quillRef.current) {
        const container = quillRef.current.container;
        if (container) {
          container.innerHTML = "";
        }
        quillRef.current = null;
      }
      syncedRef.current = false;
    };
  }, [noteId, userName, navigate, socketToken]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!noteId || !userName) {
    return (
      <div className="join-page">
        <div className="join-page-card glass-surface">
          <h2>Invalid session</h2>
          <p>This note link is invalid or your name is missing.</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const socket = getSocket(socketToken);

  return (
    <main className="editor-page">
      <div className="editor-shell glass-surface fade-in-up">
        <div className="editor-topbar">
          <div className="editor-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => {
              socket.emit("leave-note", { noteId });
              navigate(-1);
            }}>
              <span className="material-symbols-outlined">arrow_back</span>
              Back
            </button>
          </div>

          <div className="editor-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowShare(true)}>
              <span className="material-symbols-outlined">qr_code</span>
              Share
            </button>

            <button className="btn btn-primary btn-sm" onClick={copyLink}>
              <span className="material-symbols-outlined">link</span>
              {copied ? "Copied!" : "Copy Link"}
            </button>

            <button
              className={`btn btn-ghost btn-sm ${showPeoplePanel ? "active" : ""}`}
              onClick={() => setShowPeoplePanel(!showPeoplePanel)}
              aria-label="Show participants"
              title="Participants"
            >
              <span className="material-symbols-outlined">people</span>
              <span className="btn-text hide-mobile">{users.length}</span>
            </button>
          </div>
        </div>

        <div className="editor-title-row">
          <input
            type="text"
            className="note-title-input"
            value={noteTitle}
            onChange={(e) => {
              const newTitle = e.target.value;
              setNoteTitle(newTitle);
            }}
            onBlur={() => {
              setTimeout(() => {
                getSocket(socketToken).emit("update-title", { noteId, title: noteTitle });
              }, 500);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.target.blur();
              }
            }}
            placeholder="Untitled Note"
            disabled={!isOwner}
            title={isOwner ? "Click to rename" : "Only the owner can rename"}
          />
        </div>

        <div className="editor-presence hide-desktop">
          <span className="editor-presence-label">Collaborators</span>
          <div className="avatar-stack">
            {users.map((u) => (
              <span
                key={u}
                className="avatar"
                style={{ background: colorFor(u) }}
                title={u === owner ? `${u} (Owner)` : u}
              >
                {initials(u)}
              </span>
            ))}
          </div>
        </div>

        <div ref={editorRef} className="editor-mount" />

        <div className="editor-footer">
          <span className="editor-footer-note">
            Changes save automatically · Real-time collaboration via CRDT
          </span>
        </div>
      </div>

      {showPeoplePanel && (
        <div className="people-panel-overlay" onClick={() => setShowPeoplePanel(false)} />
      )}
      <aside
        className={`people-panel ${showPeoplePanel ? "open" : ""}`}
        role="complementary"
        aria-label="Participants"
      >
        <div className="people-panel-header">
          <h3>Participants</h3>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowPeoplePanel(false)}
            aria-label="Close participants"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="people-panel-list">
          {users.map((u) => {
            const canWrite = writePermissions[u] === true || u === owner;
            const isUserOwner = u === owner;
            const isCurrentUser = u === userName;
            return (
              <div
                key={u}
                className={`people-panel-item ${isUserOwner ? "owner" : ""} ${!canWrite && !isUserOwner ? "read-only" : ""} ${isCurrentUser ? "current-user" : ""}`}
              >
                <span className="people-avatar" style={{ background: colorFor(u) }}>
                  {initials(u)}
                </span>
                <div className="people-info">
                  <span className="people-name">
                    {u}
                    {isUserOwner && <span className="people-badge owner-badge">Owner</span>}
                    {isCurrentUser && <span className="people-badge you-badge">You</span>}
                  </span>
                  {!canWrite && !isUserOwner && (
                    <span className="people-status read-only">Read-only</span>
                  )}
                </div>
                {!isCurrentUser && isOwner && !isUserOwner && (
                  <div className="people-actions">
                    <button
                      className="people-action-btn permission-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        getSocket(socketToken).emit("toggle-write", { noteId, targetUserName: u, canWrite: !canWrite });
                      }}
                      aria-label={canWrite ? `Make ${u} read-only` : `Allow ${u} to write`}
                      title={canWrite ? `Make ${u} read-only` : `Allow ${u} to write`}
                    >
                      <span className="material-symbols-outlined">
                        {canWrite ? "visibility_off" : "edit"}
                      </span>
                    </button>
                    <button
                      className="people-action-btn remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        getSocket(socketToken).emit("remove-user", { noteId, targetUserName: u });
                      }}
                      aria-label={`Remove ${u}`}
                      title={`Remove ${u}`}
                    >
                      <span className="material-symbols-outlined">person_remove</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {showShare && (
        <div className="modal-overlay" onClick={() => setShowShare(false)}>
          <div
            className="modal-content share-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowShare(false)}
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3>Share this note</h3>
            <p>Scan the QR code or copy the link to collaborate</p>

            <div className="share-qr">
              <QRCodeSVG value={shareUrl} size={140} fgColor="#4648d4" />
            </div>

            <div className="share-link-box">
              <input
                className="input-box"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
              />
              <button className="btn btn-primary" onClick={copyLink} aria-label="Copy link">
                <span className="material-symbols-outlined">content_copy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}