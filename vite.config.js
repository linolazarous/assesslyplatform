import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // FIX 1: Instruct Vite to pre-bundle 'jwt-decode' during development 
  // This step helps Vite resolve the "default" export for CJS packages like the older version 
  // of jwt-decode, allowing the import jwtDecode from 'jwt-decode' syntax to work.
  optimizeDeps: {
    include: ['jwt-decode'] 
  },
  build: {
    outDir: "dist",
    target: "es2020",
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 1500, // prevent warnings on large chunks
    // FIX 2: Configure CommonJS handling for the production build.
    // Ensures CJS dependencies are correctly transformed for the browser in an ESM project.
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000", // local dev backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    __APP_ENV__: JSON.stringify(mode),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
