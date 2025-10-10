import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Ensure the react plugin is correctly configured for development
  plugins: [
    react({
      // Explicitly enable Fast Refresh for better dev experience
      fastRefresh: true,
    }),
  ],
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    sourcemap: false,
    // Keep build optimization
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Improved chunking strategy for production
        manualChunks: {
          react_core: ['react', 'react-dom', 'react-router-dom'],
          mui_core: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          utilities: ['axios', 'jspdf', 'notistack']
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true,
    host: true,
    // Add proxy configuration for /api to your Node/Express backend 
    // (Assuming the backend runs on port 3000 as is common for Express)
    proxy: {
      '/api': {
        target: 'http://localhost:3000', 
        changeOrigin: true,
        secure: false, // Set to true if your backend uses HTTPS
        // Optional: rewrite the path if the backend expects a different root
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  preview: {
    port: process.env.PORT || 4173,
    host: true
  },
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(new URL(import.meta.url).pathname), "./src"), // Use the correct way to resolve __dirname in ESM
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },
  // Removed the explicit esbuild config for .jsx as it is redundant when using @vitejs/plugin-react
  // esbuild: {
  //   loader: 'jsx',
  //   include: /src\/.*\.jsx?$/,
  //   exclude: [],
  // },
  // Keep dependency optimization
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@mui/material', 
      '@mui/icons-material',
      'notistack'
    ]
  }
});
