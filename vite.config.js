import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Define the absolute path to the root directory
const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  // Ensure the react plugin is correctly configured for development
  plugins: [
    react({
      // Explicitly enabled Fast Refresh is good for dev experience
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
        // Improved chunking strategy for production
        manualChunks: {
          react_core: ['react', 'react-dom', 'react-router-dom'],
          mui_core: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          utilities: ['axios', 'jspdf', 'notistack', 'jwt-decode'] // Added jwt-decode for completeness
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true,
    host: true,
    // Production-ready proxy setup for backend API calls
    proxy: {
      '/api': {
        target: 'http://localhost:3000', 
        changeOrigin: true,
        secure: false, // Set to true if your backend uses HTTPS/SSL
      }
    }
  },
  preview: {
    port: process.env.PORT || 4173,
    host: true
  },
  resolve: {
    // FIX: Using path.resolve(__dirname, 'src') for a robust, cross-platform alias resolution.
    // The previous URL/import.meta method was unnecessarily complex.
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  // Keep dependency optimization for faster cold start
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@mui/material', 
      '@mui/icons-material',
      'notistack',
      'jspdf',
      'jspdf-autotable' // Include jspdf-autotable for stability
    ]
  }
});
