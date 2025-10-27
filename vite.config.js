import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      filename: 'service-worker.js', // ✅ Ensure consistent SW filename
      injectRegister: 'auto', // ✅ Automatically inject registration script
      strategies: 'generateSW', // ✅ Generate SW dynamically
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'Assessly.mp4', 'logo.png'],
      manifest: {
        name: process.env.VITE_APP_NAME || 'Assessly',
        short_name: 'Assessly',
        description: process.env.VITE_APP_DESCRIPTION || 'AI-Powered Assessment Platform',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3f51b5',
        orientation: 'portrait-primary',
        scope: '/',
        icons: [
          { src: '/logo.png', sizes: '48x48', type: 'image/png' },
          { src: '/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'offline-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 24 * 60 * 60 // 1 day
              }
            }
          }
        ]
      }
    })
  ],

  base: '/', // ✅ Render serves from root (not ./)

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components')
    }
  },

  server: {
    port: 5173,
    open: true
  },

  build: {
    outDir: 'dist',
    target: 'esnext',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html')
    }
  }
});
