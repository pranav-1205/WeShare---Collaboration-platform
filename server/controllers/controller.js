import Note from "../models/note.js";
import User from "../models/user.js";

/**
 * Create a new note - requires authentication
 */
export const createNote = async (req, res, next) => {
  try {
    const { title } = req.body;
    const ownerId = req.userId;

    // Fetch owner name from user
    const ownerUser = await User.findById(ownerId);
    const ownerName = ownerUser?.username || "Unknown";

    const note = await Note.create({
      title: title || "Untitled Note",
      ownerId,
      ownerName,
      content: null,
      collaborators: [],
    });

    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all notes owned by authenticated user
 */
export const getAllNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ ownerId: req.userId }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    next(error);
  }
};

/**
 * Get notes shared with the authenticated user (where user is collaborator but not owner)
 */
export const getSharedNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({
      ownerId: { $ne: req.userId },
      "collaborators.userId": req.userId,
    }).sort({ updatedAt: -1 });
    
    // Add permission info for each note
    const notesWithPerms = notes.map(note => {
      const collaborator = note.collaborators.find(c => c.userId.toString() === req.userId);
      return {
        ...note.toObject(),
        userPermission: collaborator?.permission || "read",
      };
    });
    
    res.json(notesWithPerms);
  } catch (error) {
    next(error);
  }
};

/**
 * Get note by ID - public for guests to join
 */
export const getNoteById = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json(note);
  } catch (error) {
    next(error);
  }
};

/**
 * Update note title - only owner can update
 */
export const updateNoteTitle = async (req, res, next) => {
  try {
    const { title } = req.body;
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.ownerId.toString() !== req.userId) {
      return res.status(403).json({ message: "Only the owner can update the title" });
    }

    note.title = title;
    // Fetch updated owner name
    const ownerUser = await User.findById(req.userId);
    note.ownerName = ownerUser?.username || note.ownerName;
    await note.save();

    res.json(note);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete note - only owner can delete
 */
export const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.ownerId.toString() !== req.userId) {
      return res.status(403).json({ message: "Only the owner can delete the note" });
    }

    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    next(error);
  }
};