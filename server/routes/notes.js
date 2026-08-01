import express from "express";
import {
  createNote,
  getAllNotes,
  getNoteById,
  updateNoteTitle,
  deleteNote,
  getSharedNotes
} from "../controllers/controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.post("/", authMiddleware, createNote);
router.get("/", authMiddleware, getAllNotes);
router.get("/shared", authMiddleware, getSharedNotes);
router.get("/:id", getNoteById);
router.patch("/:id/title", authMiddleware, updateNoteTitle);
router.delete("/:id", authMiddleware, deleteNote);

export default router;