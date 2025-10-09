import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  // Root-level index.html (important for your current structure)
  root: "./",

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ✅ Development server setup
  server: {
    port: 5173,
    host: true,
    cors: {
      origin: [
        "http://localhost:5173",        // local dev frontend
        "http://localhost:5000",        // local backend API
        "https://assesslyplatform.onrender.com", // production Render frontend
      ],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // ✅ Production build config
  build: {
    outDir: "dist",
    sourcemap: false,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },

  // ✅ Preview configuration (useful for Render static preview)
  preview: {
    port: 8080,
    cors: true,
  },
});
