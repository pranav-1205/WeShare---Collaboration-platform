import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    // Store Yjs document updates as binary
    content: {
      type: Buffer,
      default: null
    },

    owner: {
      type: String, // later can be ObjectId(User)
      default: "admin"
    }
  },
  {
    timestamps: true
  }
);

const Note = mongoose.model("Note", noteSchema);

export default Note;
