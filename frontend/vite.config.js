// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  // ────────────────────────────────────────────────
  // Explicitly set base to root — fixes most white-screen issues
  // on static deployments (Render, GitHub Pages, etc.)
  // Change only if deploying to a subpath (e.g. /myapp/ → base: '/myapp/')
  base: '/',

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  server: {
    port: 5173,
    open: true,
  },

  build: {
    outDir: "dist",
    sourcemap: true,          // ← Enable temporarily for debugging
                              //   (makes console errors point to original source lines)
    chunkSizeWarningLimit: 1000,

    // Optional: lower target if you suspect old browser issues
    // (Render serves modern browsers fine, but good to try if still broken)
    // target: 'es2015',      // or 'es2019' — uncomment only if needed
  },
});
