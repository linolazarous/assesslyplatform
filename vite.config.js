import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: "./", // ✅ Ensures proper asset paths when index.html is in root
  optimizeDeps: {
    include: ["jwt-decode"],
  },
  build: {
    outDir: "dist",
    target: "es2020",
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    __APP_ENV__: JSON.stringify(mode),
    "process.env.VITE_API_BASE_URL": JSON.stringify(
      mode === "production"
        ? "https://assesslyplatform.onrender.com/api"
        : "http://localhost:3000/api"
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
