import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
    }),
  ],
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          react_core: ['react', 'react-dom', 'react-router-dom'],
          mui_core: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          utilities: ['axios', 'jspdf', 'notistack', 'jwt-decode']
        }
      }
    }
  },
  server: {
    // FIX: Removed explicit port definitions (port, preview)
    open: true,
    host: true,
    // Keep proxy configuration for development mode when running Express separately
    proxy: {
      '/api': {
        target: 'http://localhost:3000', 
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    // Removed explicit port definition
    host: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@mui/material', 
      '@mui/icons-material',
      'notistack',
      'jspdf',
      'jspdf-autotable'
    ]
  }
});
