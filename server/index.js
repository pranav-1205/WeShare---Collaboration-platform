import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import "dotenv/config";

import connectDB from "./config/db.js";
import notesRoutes from "./routes/notes.js";
import authRoutes from "./routes/auth.js";
import setupYjs from "./yjs/setupYjs.js";

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// 🔹 Connect MongoDB
connectDB();

// 🔹 REST API routes
app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});

// 🔹 Real-time collaboration
setupYjs(io);

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});