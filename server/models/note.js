import mongoose from "mongoose";

const collaboratorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    permission: {
      type: String,
      enum: ["read", "write"],
      default: "read",
    },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    content: {
      type: Buffer,
      default: null,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    ownerName: {
      type: String,
      required: true,
    },

    collaborators: [collaboratorSchema],
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ ownerId: 1, createdAt: -1 });
noteSchema.index({ "collaborators.userId": 1 });

const Note = mongoose.model("Note", noteSchema);

export default Note;