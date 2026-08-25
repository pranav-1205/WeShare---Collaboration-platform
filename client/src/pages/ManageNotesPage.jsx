import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = `${import.meta.env.VITE_SERVER_URL || "http://localhost:3001"}/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

const SORT_OPTIONS = [
  { value: "updatedAt-desc", label: "Last modified — newest first" },
  { value: "updatedAt-asc", label: "Last modified — oldest first" },
  { value: "title-asc", label: "Title — A → Z" },
  { value: "title-desc", label: "Title — Z → A" },
];

function NoteActionMenu({
  note,
  open,
  onClose,
  onOpen,
  onDelete,
  deleting,
  position,
}) {
  const menuRef = useRef(null);
  const title = note.title || "Untitled Note";

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open || !position) return null;

  return (
    <div
      ref={menuRef}
      className="note-action-menu"
      role="menu"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <button
        className="menu-item"
        role="menuitem"
        onClick={() => { onOpen(note._id); onClose(); }}
      >
        <span className="material-symbols-outlined">open_in_new</span>
        Open
      </button>
      <button
        className="menu-item danger"
        role="menuitem"
        onClick={() => { onDelete(note._id, title); onClose(); }}
        disabled={deleting}
      >
        {deleting ? (
          <span className="spinner" style={{ width: 14, height: 14 }}></span>
        ) : (
          <span className="material-symbols-outlined">delete</span>
        )}
        Delete
      </button>
    </div>
  );
}

function NoteRow({
  note,
  isSelected,
  isOpen,
  deletingNoteId,
  onOpen,
  onDelete,
  onToggleSelect,
  onTriggerClick,
  menuPosition,
  onCloseMenu,
}) {
  const title = note.title || "Untitled Note";

  return (
    <div className="table-row" role="row">
      <div className="table-cell checkbox-cell">
        <label className="checkbox-wrapper">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(note._id)}
            aria-label={`Select "${title}"`}
          />
          <span className="checkbox-custom"></span>
        </label>
      </div>
      <div className="table-cell title-cell">
        <div className="note-title-wrapper" onClick={() => onOpen(note._id)}>
          <span className="note-title">{title}</span>
          <span className="note-date">
            {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>
      <div className="table-cell date-cell">
        <time dateTime={note.updatedAt}>
          {new Date(note.updatedAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })}
        </time>
      </div>
      <div className="table-cell actions-cell">
        <button
          className={`overflow-trigger ${isOpen ? 'open' : ''}`}
          onClick={onTriggerClick}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={`Actions for "${title}"`}
        >
          <span className="material-symbols-outlined">more_vert</span>
        </button>
        <NoteActionMenu
          note={note}
          open={isOpen}
          onClose={onCloseMenu}
          onOpen={onOpen}
          onDelete={onDelete}
          deleting={deletingNoteId === note._id}
          position={menuPosition}
        />
      </div>
    </div>
  );
}

export default function ManageNotesPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [userNotes, setUserNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt-desc");
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);

  const fetchUserNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const res = await api.get("/notes");
      setUserNotes(res.data || []);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
      toast.error("Failed to load notes");
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserNotes();
    }
  }, [user, fetchUserNotes]);

  useEffect(() => {
    setSelectedNotes(new Set());
  }, [userNotes]);

  const filteredAndSortedNotes = useMemo(() => {
    let notes = userNotes.filter((note) =>
      (note.title || "Untitled Note").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const [field, order] = sortBy.split("-");
    notes.sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      if (field === "title") {
        aVal = (aVal || "").toLowerCase();
        bVal = (bVal || "").toLowerCase();
      } else {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });

    return notes;
  }, [userNotes, searchQuery, sortBy]);

  const handleOpenNote = (noteId) => {
    navigate(`/note/${noteId}`, { state: { userName: user.username } });
  };

  const handleDeleteNote = async (noteId, noteTitle) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete "${noteTitle}"?`);
    if (!confirmed) return;

    setDeletingNoteId(noteId);
    try {
      await api.delete(`/notes/${noteId}`);
      toast.success("Note deleted");
      fetchUserNotes();
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedNotes.size;
    const confirmed = window.confirm(`Are you sure you want to permanently delete ${count} note${count > 1 ? "s" : ""}? This action cannot be undone.`);
    if (!confirmed) return;

    setBulkDeleting(true);
    try {
      for (const noteId of selectedNotes) {
        await api.delete(`/notes/${noteId}`);
      }
      toast.success(`${count} note${count > 1 ? "s" : ""} deleted`);
      setSelectedNotes(new Set());
      fetchUserNotes();
    } catch {
      toast.error("Failed to delete selected notes");
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelectNote = (noteId) => {
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedNotes.size === filteredAndSortedNotes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(filteredAndSortedNotes.map((n) => n._id)));
    }
  };

  if (authLoading) {
    return (
      <div className="manage-notes-page">
        <div className="manage-notes-loading">
          <div className="spinner" style={{ margin: "0 auto" }}></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="manage-notes-page">
        <div className="manage-notes-empty auth-required">
          <span className="material-symbols-outlined">lock</span>
          <h2>Sign in required</h2>
          <p>Please sign in to manage your notes.</p>
          <Link to="/login" className="btn btn-primary">
            <span className="material-symbols-outlined">login</span>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const showBulkActions = selectedNotes.size > 0;

  return (
    <div className="manage-notes-page">
      <header className="manage-notes-header">
        <button className="back-button" onClick={() => navigate("/")} aria-label="Back to Home">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="hide-mobile">Home</span>
        </button>
        <div className="manage-notes-title-block">
          <h1>Manage Notes</h1>
          <p className="manage-notes-subtitle">
            <span>Manage all notes you own</span>
            <span className="note-count-separator" aria-hidden="true">·</span>
            <span className="manage-notes-count">{userNotes.length} note{userNotes.length !== 1 ? "s" : ""}</span>
          </p>
        </div>
      </header>

      <div className="manage-notes-toolbar">
        <div className="search-sort-group">
          <div className="search-wrapper">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              type="search"
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes by title..."
              aria-label="Search notes"
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery("")} aria-label="Clear search">
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
          <div className="sort-wrapper">
            <label htmlFor="sort-select" className="sr-only">Sort notes</label>
            <select
              id="sort-select"
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showBulkActions && (
        <div className="bulk-action-bar">
          <span className="bulk-action-info">
            <strong>{selectedNotes.size}</strong> note{selectedNotes.size !== 1 ? "s" : ""} selected
          </span>
          <button
            className="btn btn-ghost danger btn-sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
          >
            {bulkDeleting ? "Deleting..." : "Delete Selected"}
          </button>
        </div>
      )}

      <main className="manage-notes-main" role="list" aria-label="Your notes">
        {loadingNotes ? (
          <div className="manage-notes-loading">
            <div className="spinner"></div>
            <p>Loading notes...</p>
          </div>
        ) : filteredAndSortedNotes.length === 0 ? (
          <div className="manage-notes-empty">
            <span className="material-symbols-outlined">{searchQuery ? "search_off" : "description"}</span>
            <h2>{searchQuery ? "No notes found" : "No notes yet"}</h2>
            <p>{searchQuery ? `Try a different search term.` : "Create your first note to get started."}</p>
            {!searchQuery && (
              <Link to="/" className="btn btn-primary">
                <span className="material-symbols-outlined">add</span>
                New Note
              </Link>
            )}
            {searchQuery && (
              <button className="btn btn-secondary btn-sm" onClick={() => setSearchQuery("")}>
                <span className="material-symbols-outlined">clear</span>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="notes-table-header" role="row">
              <div className="table-cell checkbox-cell">
                <label className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={selectedNotes.size === filteredAndSortedNotes.length && filteredAndSortedNotes.length > 0}
                    indeterminate={selectedNotes.size > 0 && selectedNotes.size < filteredAndSortedNotes.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all notes"
                  />
                  <span className="checkbox-custom"></span>
                </label>
              </div>
              <div className="table-cell title-cell">Note</div>
              <div className="table-cell date-cell">Last Modified</div>
              <div className="table-cell actions-cell"></div>
            </div>
            <div className="notes-table-body">
              {filteredAndSortedNotes.map((note) => {
                const isOpen = openMenuId === note._id;

                const handleTriggerClick = (e) => {
                  e.stopPropagation();
                  if (isOpen) {
                    setOpenMenuId(null);
                    setMenuPosition(null);
                  } else {
                    const rect = e.currentTarget?.getBoundingClientRect();
                    if (rect) {
                      setMenuPosition({
                        top: rect.bottom + 4,
                        left: rect.left - 130,
                      });
                    }
                    setOpenMenuId(note._id);
                  }
                };

                const handleCloseMenu = () => {
                  setOpenMenuId(null);
                  setMenuPosition(null);
                };

                return (
                  <NoteRow
                    key={note._id}
                    note={note}
                    isSelected={selectedNotes.has(note._id)}
                    isOpen={isOpen}
                    deletingNoteId={deletingNoteId}
                    onOpen={handleOpenNote}
                    onDelete={handleDeleteNote}
                    onToggleSelect={toggleSelectNote}
                    onTriggerClick={handleTriggerClick}
                    menuPosition={isOpen ? menuPosition : null}
                    onCloseMenu={handleCloseMenu}
                  />
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}