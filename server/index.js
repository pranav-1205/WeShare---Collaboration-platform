import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import notesRoutes from "./routes/notes.js";
import setupYjs from "./yjs/setupYjs.js";

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Connect MongoDB
connectDB();

// 🔹 REST API routes
app.use("/api/notes", notesRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// 🔹 Real-time collaboration
setupYjs(io);

server.listen(3001, () => {
  console.log("🚀 Server running at http://localhost:3001");
});
