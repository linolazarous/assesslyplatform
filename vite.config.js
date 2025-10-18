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
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'Assessly.mp4', 'logo.png'],
      manifest: {
        name: process.env.VITE_APP_NAME || 'Assessly',
        short_name: process.env.VITE_APP_SHORT_NAME || 'Assessly',
        description: process.env.VITE_APP_DESCRIPTION || 'AI-Powered Assessment Platform',
        theme_color: '#3f51b5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './index.html',
        icons: [
          { src: 'favicon.ico', sizes: '48x48', type: 'image/x-icon' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          { src: 'logo.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo.png', sizes: '512x512', type: 'image/png' }
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

  base: './', // Ensures assets load correctly in production

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
