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
    // CRITICAL: Targeting modern browsers reduces polyfill overhead and build complexity
    target: 'es2020',
    rollupOptions: {
      output: {
        // AGGRESSIVE CHUNKING: Splitting large libraries (MUI, framer-motion) into smaller chunks
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'vendor_mui';
            }
            if (id.includes('react') || id.includes('router') || id.includes('framer-motion')) {
              return 'vendor_react';
            }
            if (id.includes('jspdf') || id.includes('notistack')) {
              return 'vendor_utils';
            }
            return 'vendor_core'; // All other node_modules
          }
        },
      }
    }
  },
  server: {
    open: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000', 
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
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
