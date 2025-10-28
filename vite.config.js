import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'Assessly.mp4', 'logo.png'],
      manifest: {
        name: process.env.VITE_APP_NAME || 'Assessly',
        short_name: 'Assessly',
        description: process.env.VITE_APP_DESCRIPTION || 'AI-Powered Assessment Platform',
        theme_color: '#3f51b5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/logo.png', sizes: '48x48', type: 'image/png' },
          { src: '/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,ico,svg,mp4}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'assessly-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 }
            }
          }
        ]
      }
    })
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components')
    }
  },

  build: {
    outDir: 'dist',
    target: 'esnext',
    assetsDir: 'assets',
    sourcemap: false
  }
});
