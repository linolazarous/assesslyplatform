// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',

  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      // Keep only the existing assets in /public
      includeAssets: ['favicon.ico', 'logo.png'],

      manifest: {
        id: '/',
        lang: 'en',
        name: 'Assessly',
        short_name: 'Assessly',
        description: 'AI-Powered Assessment Platform for creating, managing, and analyzing assessments.',
        theme_color: '#3f51b5',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',

        // ✔ Match your actual files — logo.png in different sizes
        icons: [
          {
            src: '/logo.png',
            sizes: '48x48',
            type: 'image/png'
          },
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },

      // Caching rules
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      }
    })
  ],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled'
          ],
          utils: ['axios', 'dayjs', 'jwt-decode']
        }
      }
    }
  },

  server: {
    port: 3000,
    host: true,
    headers: {
      'Cache-Control': 'public, max-age=0'
    }
  },

  preview: {
    port: 4173,
    host: true
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@mui/icons-material',
      'axios',
      'dayjs'
    ]
  }
});
