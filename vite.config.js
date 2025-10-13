import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    target: "es2020",
    minify: "esbuild",
    sourcemap: false
  },
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000", // local dev backend
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
