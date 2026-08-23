import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../auth/useAuth";

const API_URL = `${import.meta.env.VITE_SERVER_URL || "http://localhost:3001"}/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default function Home() {
  const [userName, setUserName] = useState("");
  const [creating, setCreating] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userNotes, setUserNotes] = useState([]);
  const [sharedNotes, setSharedNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const userMenuRef = useRef(null);
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserNotes();
      fetchSharedNotes();
    }
  }, [user]);

  const fetchUserNotes = async () => {
    setLoadingNotes(true);
    try {
      const res = await api.get("/notes");
      setUserNotes(res.data || []);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const fetchSharedNotes = async () => {
    try {
      const res = await api.get("/notes/shared");
      setSharedNotes(res.data || []);
    } catch (err) {
      console.error("Failed to fetch shared notes:", err);
    }
  };

  const handleCreateNote = async () => {
    if (!user) {
      toast.error("Please sign in to create notes");
      navigate("/login");
      return;
    }

    setCreating(true);
    try {
      const res = await api.post("/notes", {
        title: "Untitled Note",
      });

      toast.success("Note created!");
      navigate(`/note/${res.data._id}`, {
        state: { userName: user.username },
      });
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error("Please sign in to create notes");
        navigate("/login");
      } else {
        toast.error("Failed to create note");
      }
    } finally {
      setCreating(false);
    }
  };

  const joinNote = () => {
    const name = user?.username || userName.trim();
    if (!name) {
      toast.error("Please enter your name");
      return;
    }

    navigate("/join", {
      state: { userName: name },
    });
  };

  const filteredNotes = userNotes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSharedNotes = sharedNotes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <>
        <header className="app-header">
          <div className="container header-inner">
            <div className="brand">
              <div className="brand-logo">
                <span className="material-symbols-outlined">edit_note</span>
              </div>
              <span className="brand-name">WeShare</span>
            </div>

            <nav className="header-links hide-mobile">
              <a href="/login" className="btn btn-ghost btn-sm">Sign In</a>
              <a href="/register" className="btn btn-primary btn-sm">Get Started</a>
            </nav>
          </div>
        </header>

        <main className="hero">
          <div className="container hero-grid">
            <section className="hero-copy fade-in-up">
              <span className="badge badge-primary">
                <span className="material-symbols-outlined">group</span>
                Real-time Sync
              </span>

              <h1>
                Where focus meets <em>collaboration.</em>
              </h1>

              <p>
                A premium workspace for high-performing teams. Shared notes,
                instant feedback, and seamless brainstorming.
              </p>

              <div className="presence-teaser">
                <span className="avatar" style={{ background: "#6063ee" }}>AR</span>
                <span className="avatar" style={{ background: "#8455ef" }}>SC</span>
                <span className="avatar" style={{ background: "#008096" }}>JB</span>
                <span className="avatar" style={{ background: "#283044" }}>+12</span>
              </div>
            </section>

            <section className="join-card glass-surface fade-in-up">
              <div className="join-card-head">
                <h2>Join the Session</h2>
                <p>Set your identity to start collaborating</p>
              </div>

              <div className="field">
                <label htmlFor="name">Enter your name</label>
                <input
                  id="name"
                  className="input-box"
                  type="text"
                  placeholder="e.g. Alex Rivers"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateNote()}
                />
              </div>

              <button className="btn btn-primary btn-lg" onClick={handleCreateNote} disabled={creating || authLoading}>
                <span className="material-symbols-outlined">add_circle</span>
                Sign in to Create
              </button>

              <button className="btn btn-secondary btn-lg" onClick={joinNote} disabled={authLoading}>
                <span className="material-symbols-outlined">input</span>
                Join Existing Note
              </button>
            </section>
          </div>

          <div className="container features-grid">
            <article className="feature-card glass-surface">
              <div
                className="feature-icon"
                style={{ background: "rgba(107, 56, 212, 0.1)", color: "var(--secondary)" }}
              >
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <div>
                <h4>Zero Latency</h4>
                <p>Real-time collaborative editing with sub-50ms sync.</p>
              </div>
            </article>

            <article className="feature-card glass-surface">
              <div
                className="feature-icon"
                style={{ background: "rgba(0, 101, 119, 0.1)", color: "var(--tertiary)" }}
              >
                <span className="material-symbols-outlined">security</span>
              </div>
              <div>
                <h4>E2E Encryption</h4>
                <p>Your data remains private with military-grade security.</p>
              </div>
            </article>

            <article className="feature-card glass-surface">
              <div
                className="feature-icon"
                style={{ background: "rgba(70, 72, 212, 0.1)", color: "var(--primary)" }}
              >
                <span className="material-symbols-outlined">devices</span>
              </div>
              <div>
                <h4>Cross-Platform</h4>
                <p>Switch from desktop to mobile without losing flow.</p>
              </div>
            </article>
          </div>
        </main>
      </>
    );
  }

  if (authLoading) {
    return (
      <div className="join-page">
        <div className="join-page-card glass-surface">
          <div className="spinner" style={{ margin: "0 auto" }}></div>
          <p style={{ textAlign: "center", marginTop: "16px", color: "var(--on-surface-variant)" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Authenticated Dashboard
  return (
    <>
      <header className="app-header dashboard-header">
        <div className="container header-inner">
          <div className="brand">
            <div className="brand-logo">
              <span className="material-symbols-outlined">edit_note</span>
            </div>
            <span className="brand-name">WeShare</span>
          </div>

          <div className="search-bar" role="search">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              type="search"
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              aria-label="Search notes"
            />
          </div>

          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleCreateNote} disabled={creating}>
              <span className="material-symbols-outlined">add</span>
              <span className="btn-text">New Note</span>
            </button>

            <div className="user-menu" ref={userMenuRef}>
              <button
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                <span className="user-avatar-sm">{user.username[0].toUpperCase()}</span>
                <span className="btn-text hide-mobile">{user.username}</span>
                <span className="material-symbols-outlined">{userMenuOpen ? "expand_less" : "expand_more"}</span>
              </button>

              {userMenuOpen && (
                <div className="user-menu-dropdown" role="menu">
                  <div className="user-menu-header">
                    <div className="user-menu-name">{user.username}</div>
                  </div>
                  <div className="user-menu-divider" />
                  <button className="user-menu-item" role="menuitem" onClick={() => { setUserMenuOpen(false); }}>
                    <span className="material-symbols-outlined">settings</span>
                    Settings
                  </button>
                  <div className="user-menu-divider" />
                  <button className="user-menu-item danger" role="menuitem" onClick={() => { logout(); setUserMenuOpen(false); }}>
                    <span className="material-symbols-outlined">logout</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="container dashboard-container">
          <section className="welcome-section fade-in-up">
            <h1>Welcome back, {user.username} 👋</h1>
            <p className="welcome-subtitle">Pick up where you left off or start something new</p>
          </section>

          <section className="quick-actions fade-in-up">
            <button className="btn btn-primary btn-lg" onClick={handleCreateNote} disabled={creating}>
              <span className="material-symbols-outlined">add</span>
              <span>New Note</span>
            </button>
            <button className="btn btn-secondary btn-lg" onClick={joinNote}>
              <span className="material-symbols-outlined">input</span>
              <span>Join Existing Note</span>
            </button>
          </section>

          {searchQuery ? (
            <section className="search-results fade-in-up">
              <h2>Search Results</h2>
              {filteredNotes.length === 0 && filteredSharedNotes.length === 0 ? (
                <div className="notes-empty">
                  <span className="material-symbols-outlined">search_off</span>
                  <p>No notes found matching "{searchQuery}"</p>
                </div>
              ) : (
                <>
                  {filteredNotes.length > 0 && (
                    <div className="notes-section">
                      <h3>Your Notes</h3>
                      <div className="notes-grid">
                        {filteredNotes.map((note) => (
                          <NoteCard
                            key={note._id}
                            note={note}
                            currentUser={user.username}
                            onOpen={() => navigate(`/note/${note._id}`, { state: { userName: user.username } })}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {filteredSharedNotes.length > 0 && (
                    <div className="notes-section">
                      <h3>Shared With Me</h3>
                      <div className="notes-grid">
                        {filteredSharedNotes.map((note) => (
                          <NoteCard
                            key={note._id}
                            note={note}
                            currentUser={user.username}
                            isShared
                            onOpen={() => navigate(`/note/${note._id}`, { state: { userName: user.username } })}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          ) : (
            <>
              <section className="recent-notes fade-in-up">
                <div className="section-header">
                  <h2>Recent Notes</h2>
                </div>
                {loadingNotes ? (
                  <div className="notes-loading">Loading your notes...</div>
                ) : filteredNotes.length === 0 ? (
                  <div className="notes-empty">
                    <span className="material-symbols-outlined">description</span>
                    <p>No notes yet. Create your first note!</p>
                    <button className="btn btn-primary" onClick={handleCreateNote} disabled={creating}>
                      Create Note
                    </button>
                  </div>
                ) : (
                  <div className="notes-grid">
                    {filteredNotes.map((note) => (
                      <NoteCard
                        key={note._id}
                        note={note}
                        currentUser={user.username}
                        onOpen={() => navigate(`/note/${note._id}`, { state: { userName: user.username } })}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="shared-notes fade-in-up">
                <div className="section-header">
                  <h2>Shared With Me</h2>
                  {filteredSharedNotes.length > 4 && (
                    <a href="#" className="view-all-link">View all</a>
                  )}
                </div>
                {filteredSharedNotes.length === 0 ? (
                  <div className="notes-empty">
                    <span className="material-symbols-outlined">people</span>
                    <p>No shared notes yet</p>
                    <p className="notes-empty-subtitle">Notes shared with you will appear here</p>
                  </div>
                ) : (
                  <div className="notes-grid shared-notes-grid">
                    {filteredSharedNotes.slice(0, 4).map((note) => (
                      <NoteCard
                        key={note._id}
                        note={note}
                        currentUser={user.username}
                        isShared
                        compact
                        onOpen={() => navigate(`/note/${note._id}`, { state: { userName: user.username } })}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function NoteCard({ note, currentUser, isShared = false, onOpen, compact = false }) {
  const isOwner = note.ownerName === currentUser;
  const collaboratorCount = note.collaborators ? note.collaborators.length : 0;
  const userPermission = note.userPermission || (isOwner ? "write" : "read");
  const isEditable = userPermission === "write";

  return (
    <article className={`note-card glass-surface ${isShared ? 'shared' : ''} ${compact ? 'compact' : ''}`} onClick={onOpen}>
      <div className="note-card-header">
        <h3 className="note-title">{note.title || "Untitled Note"}</h3>
        <span className="note-date">
          {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="note-meta">
        <span className="note-owner">
          <span className="material-symbols-outlined">person</span>
          {note.ownerName} {isOwner && <span className="owner-badge">Owner</span>}
        </span>
        {collaboratorCount > 0 && (
          <span className="collaborator-count">
            <span className="material-symbols-outlined">group</span>
            {collaboratorCount}
          </span>
        )}
        {isShared && (
          <span className={`permission-badge ${userPermission === 'write' ? 'can-edit' : 'read-only'}`}>
            {userPermission === "write" ? "Can Edit" : "Read Only"}
          </span>
        )}
      </div>
      {!compact && (
        <div className="note-card-actions">
          <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
            <span className="material-symbols-outlined">edit</span>
            Open
          </button>
          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); }}>
            <span className="material-symbols-outlined">share</span>
            Share
          </button>
        </div>
      )}
      {compact && isShared && (
        <div className="note-card-actions">
          <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
            <span className="material-symbols-outlined">edit</span>
            Open
          </button>
          {isEditable && (
            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); }}>
              <span className="material-symbols-outlined">share</span>
              Share
            </button>
          )}
        </div>
      )}
    </article>
  );
}