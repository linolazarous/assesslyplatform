// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ⚠️ IMPORTANT — Your frontend lives on its own domain
// So assets must load from ROOT "/", not "./"
export default defineConfig({
  base: '/',

  plugins: [
    react(),

    // Optional PWA support — safe defaults
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Assessly',
        short_name: 'Assessly',
        description: 'Secure Authentication & Assessment Platform',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],

  // Ensures correct build output on Render & S3-style hosting
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled']
        }
      }
    }
  },

  // Development server configuration
  server: {
    port: 3000,
    host: true, // Listen on all addresses
    headers: {
      'Cache-Control': 'public, max-age=0'
    }
  },

  // Preview server (for production build preview)
  preview: {
    port: 3000,
    host: true
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material', '@mui/icons-material']
  }
});
