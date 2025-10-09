import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { connectDB } from "./api/db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

connectDB();

// Serve frontend
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server running successfully" });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Assessly running on port ${PORT}`)
);
