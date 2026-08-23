import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Quill from "quill";
import * as Y from "yjs";
import { QuillBinding } from "y-quill";
import { Awareness } from "y-protocols/awareness";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { getSocket } from "../sockets/socket";
import { useAuth } from "../auth/useAuth";
import "quill/dist/quill.snow.css";

// Import Quill cursor module for remote cursors
import QuillCursors from "quill-cursors";
import "quill-cursors/css";

// Register QuillCursors at module scope (once) to avoid duplicate registration errors
Quill.register("modules/cursors", QuillCursors);

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
  const bindingRef = useRef(null);
  const awarenessRef = useRef(null);
  const syncedRef = useRef(false);
  const initializingRef = useRef(false);
  const joinedRef = useRef(false);
  const undoManagerRef = useRef(null);
  const connectionStatusRef = useRef("connecting");
  const reconnectAttemptsRef = useRef(0);

  const [users, setUsers] = useState([]);
  const [owner, setOwner] = useState("");
  const [writePermissions, setWritePermissions] = useState({});
  const [noteTitle, setNoteTitle] = useState("Untitled Note");
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPeoplePanel, setShowPeoplePanel] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const isOwnerRef = useRef(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

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

  // Update connection status
  const updateConnectionStatus = useCallback((status) => {
    connectionStatusRef.current = status;
    setConnectionStatus(status);
  }, []);

  useEffect(() => {
    if (!noteId || !userName) return;

    const socket = getSocket(socketToken);

    // Track socket connection events for reconnection handling
    setTimeout(() => {
      if (socket.connected) {
        updateConnectionStatus("connected");
      } else {
        updateConnectionStatus("connecting");
      }
    }, 0);

    socket.on("connect", () => {
      updateConnectionStatus("connected");
      reconnectAttemptsRef.current = 0;
      // Don't re-join here - we emit join-note after setting up all listeners below
      // This prevents double sync on initial connect
    });

    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        updateConnectionStatus("disconnected");
      } else {
        updateConnectionStatus("reconnecting");
      }
    });

    socket.on("connect_error", () => {
      reconnectAttemptsRef.current += 1;
      updateConnectionStatus("reconnecting");
    });

    // Handle keyboard shortcuts for undo/redo
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (undoManagerRef.current) undoManagerRef.current.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (undoManagerRef.current) undoManagerRef.current.redo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Initialize editor with Yjs Awareness (handles cursors automatically via y-quill + quill-cursors)
    const initializeEditor = (serverUpdate) => {
      // Prevent double initialization - if already initialized, just apply the update
      if (quillRef.current && syncedRef.current) {
        // Already initialized, just apply the server update to existing Y.Doc
        if (ydocRef.current) {
          Y.applyUpdate(ydocRef.current, new Uint8Array(serverUpdate));
        }
        return;
      }
      
      if (initializingRef.current) return;
      initializingRef.current = true;

      // Clean up previous instances on reconnection
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (undoManagerRef.current) {
        undoManagerRef.current.destroy();
        undoManagerRef.current = null;
      }
      if (awarenessRef.current) {
        awarenessRef.current.destroy();
        awarenessRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
      if (quillRef.current) {
        // Properly destroy Quill - remove all event listeners and clear container
        quillRef.current.off("selection-change");
        const container = quillRef.current.container;
        if (container) {
          container.innerHTML = "";
        }
        quillRef.current = null;
      }

      // Create fresh Y.Doc and apply server state
      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;
      Y.applyUpdate(ydoc, new Uint8Array(serverUpdate));

      const ytext = ydoc.getText("quill");

      // Create Yjs Awareness for cursor/selection presence
      const awareness = new Awareness(ydoc);
      awarenessRef.current = awareness;
      awareness.setLocalStateField("user", {
        name: userName,
        color: colorFor(userName),
      });

      // Create Quill editor with cursors module
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
          cursors: true,
        },
      });
      quillRef.current = quill;

      // Bind Y.Doc to Quill WITH awareness — y-quill handles remote cursors automatically
      const binding = new QuillBinding(ytext, quill, awareness);
      bindingRef.current = binding;

      // Create undo manager
      undoManagerRef.current = new Y.UndoManager(ytext, {
        trackedOrigins: new Set([null]),
        captureTimeout: 500,
      });

      syncedRef.current = true;
      initializingRef.current = false;

      // Broadcast local cursor/selection changes via awareness
      awareness.on("update", () => {
        const states = awareness.getStates();
        const localState = states.get(awareness.clientID);
        if (localState && syncedRef.current) {
          socket.emit("awareness-update", {
            clientID: awareness.clientID,
            ...localState,
          });
        }
      });

      // Send local Yjs updates to server
      ydoc.on("update", (update) => {
        if (syncedRef.current) {
          socket.emit("update", update);
        }
      });

      initializingRef.current = false;

      return { ydoc, ytext, awareness, quill };
    };

    // Handle sync from server (both initial and reconnection)
    const handleSync = ({ update, owner: ownerName, users, writePermissions, title, isOwner: ownerFlag }) => {
      setOwner(ownerName);
      setIsOwner(ownerFlag);
      isOwnerRef.current = ownerFlag;
      setUsers(Array.isArray(users) ? users : []);
      setWritePermissions(writePermissions || {});
      setNoteTitle(title || "Untitled Note");

      const { quill } = initializeEditor(update);

      // Use ownerFlag (from server) not isOwner (stale state)
      const canWrite = writePermissions?.[userName] === true || ownerName === userName || ownerFlag;
      quill.enable(canWrite);
      const toolbar = quill.getModule('toolbar');
      if (toolbar) {
        toolbar.container.style.opacity = canWrite ? '1' : '0.5';
        toolbar.container.style.pointerEvents = canWrite ? 'auto' : 'none';
      }
    };

    // Handle incoming updates from other clients
    const handleUpdate = (update) => {
      if (syncedRef.current && ydocRef.current) {
        Y.applyUpdate(ydocRef.current, new Uint8Array(update));
      }
    };

    // Only join once per mount
    if (!joinedRef.current) {
      joinedRef.current = true;
      socket.emit("join-note", { noteId, userName });
    }

    socket.on("sync", handleSync);
    socket.on("update", handleUpdate);

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
        const newCanWrite = canWrite || isOwnerRef.current;
        quillRef.current?.enable(newCanWrite);
        const toolbar = quillRef.current?.getModule('toolbar');
        if (toolbar) {
          toolbar.container.style.opacity = newCanWrite ? '1' : '0.5';
          toolbar.container.style.pointerEvents = newCanWrite ? 'auto' : 'none';
        }
        if (newCanWrite) {
          toast.success("You can now edit");
        } else {
          toast("Switched to read-only mode", { icon: "👁️" });
        }
      }
    });

    socket.on("title-changed", ({ title }) => {
      setNoteTitle(title);
    });

    // Handle remote awareness updates (cursors/selections from other users)
    socket.on("awareness-update", ({ userId, cursor, user, ...rest }) => {
      if (awarenessRef.current && userId !== awarenessRef.current.clientID) {
        const state = { cursor, user, ...rest };
        if (state.cursor || state.user) {
          awarenessRef.current.setRemoteState(userId, state);
        } else {
          awarenessRef.current.setRemoteState(userId, null);
        }
      }
    });

    socket.on("awareness-remove", ({ userId }) => {
      if (awarenessRef.current) {
        awarenessRef.current.setRemoteState(userId, null);
      }
    });

    socket.on("error", (message) => toast.error(message));

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("update");
      socket.off("sync");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("permission-changed");
      socket.off("title-changed");
      socket.off("error");
      socket.off("awareness-update");
      socket.off("awareness-remove");
      // Clean up Yjs & Quill
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (awarenessRef.current) {
        awarenessRef.current.destroy();
        awarenessRef.current = null;
      }
      if (undoManagerRef.current) {
        undoManagerRef.current.destroy();
        undoManagerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
      if (quillRef.current) {
        const container = quillRef.current.container;
        if (container) container.innerHTML = "";
        quillRef.current = null;
      }
      syncedRef.current = false;
      joinedRef.current = false;
    };
  }, [noteId, userName, navigate, socketToken, updateConnectionStatus]);

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

            <div className="connection-status" title={`Connection: ${connectionStatus}`}>
              <span className={`status-dot ${connectionStatus}`}></span>
              <span className="status-text hide-mobile">
                {connectionStatus === "connected" ? "Connected" :
                 connectionStatus === "reconnecting" ? "Reconnecting..." :
                 connectionStatus === "disconnected" ? "Offline" : "Connecting..."}
              </span>
            </div>
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