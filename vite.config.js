import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// ✅ Base path '/' ensures all assets load correctly on Render
export default defineConfig({
  plugins: [
    react(),
    // ✅ PWA plugin
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Assessly - AI-Powered Assessment Platform',
        short_name: 'Assessly',
        description: 'Create, manage, and analyze assessments using AI.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3f51b5',
        orientation: 'portrait-primary',
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
      workbox: {
        // Optional caching strategies
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }
            }
          }
        ]
      }
    })
  ],

  // ✅ Resolve aliases for cleaner imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },

  // ✅ Build options
  build: {
    outDir: 'dist',
    target: 'esnext',
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html')
    }
  },

  // ✅ Define environment variables for VITE_APP_*
  define: {
    'process.env': process.env
  }
});
