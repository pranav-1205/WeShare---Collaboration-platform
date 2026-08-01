import Note from "../models/note.js";

/**
 * Create a new note
 */
export const createNote = async (req, res) => {
  console.log("🔥 CREATE NOTE HIT", req.body);
  try {
    const { title, owner } = req.body;

    // 🔹 Title is optional now (UX-friendly)
    const note = await Note.create({
      title: title || "Untitled Note",
      owner: owner || "unknown",
      content: null,
    });

    res.status(201).json(note);
  } catch (error) {
    console.error("Create note error:", error);
    res.status(500).json({ message: "Failed to create note" });
  }
};

/**
 * Get all notes
 */
export const getAllNotes = async (req, res) => {
  try {
    const notes = await Note.find().sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get note by ID
 */
export const getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json(note);
  } catch (error) {
    res.status(400).json({ message: "Invalid note ID" });
  }
};
