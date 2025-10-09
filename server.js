import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { connectDB } from "./api/db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// === Connect MongoDB ===
connectDB();

// === Middleware ===
app.use(cors());
app.use(express.json());

// === Auto-load API Routes ===
const apiPath = path.join(__dirname, "api");
if (fs.existsSync(apiPath)) {
  fs.readdirSync(apiPath).forEach((file) => {
    if (file.endsWith(".js") && file !== "db.js") {
      import(path.join(apiPath, file)).then((module) => {
        if (typeof module.default === "function") {
          module.default(app);
          console.log(`✅ Loaded API: /api/${file.replace(".js", "")}`);
        }
      });
    }
  });
}

// === Serve React Build ===
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// === Error Handling ===
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// === Start Server ===
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Assessly running on port ${PORT}`)
);
