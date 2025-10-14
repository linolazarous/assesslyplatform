// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: "./", // ✅ Critical fix: Ensures assets load correctly in production (avoids white screen)

  optimizeDeps: {
    include: ["jwt-decode"],
  },

  build: {
    outDir: "dist",
    target: "es2020",
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    assetsDir: "assets", // keeps structure clean and predictable
    manifest: true, // ensures proper asset referencing
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },

  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target:
          mode === "development"
            ? "http://localhost:3000"
            : "https://assesslyplatform.onrender.com", // ✅ automatically switch for production
        changeOrigin: true,
        secure: false,
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  define: {
    __APP_ENV__: JSON.stringify(mode),
    "process.env": {}, // ✅ prevents "process is not defined" error on some builds
  },
}));
