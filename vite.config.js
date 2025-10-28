import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * 🚀 Production Vite Configuration
 * Optimized for Render deployment and production performance
 */
export default defineConfig({
  plugins: [
    react({
      // Optimize React for production
      jsxRuntime: 'automatic',
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico', 
        'apple-touch-icon.png', 
        'logo.png',
        'robots.txt'
      ],
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
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/logo.png', 
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['education', 'productivity'],
        lang: 'en-US'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|ico)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ],
        // Skip waiting for service worker - immediate activation
        skipWaiting: true,
        clientsClaim: true,
        // Don't precache source maps in production
        dontCacheBustURLsMatching: new RegExp('.+.[a-f0-9]{8}.+'),
        // Optimize for SPA
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^(?!\/__).*/]
      },
      // Development options
      devOptions: {
        enabled: false, // Disable PWA in development for faster builds
        type: 'module'
      }
    })
  ],

  // Build optimization for production
  build: {
    outDir: 'dist',
    target: 'esnext',
    assetsDir: 'assets',
    sourcemap: false, // Disable source maps for smaller bundle
    minify: 'esbuild', // Fastest minifier
    cssMinify: true,
    
    // Bundle optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          utils: ['axios', 'jwt-decode', 'jspdf']
        },
        // Optimize chunk names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // Reduce bundle size
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1000kb
    reportCompressedSize: false // Disable compressed size reporting for faster builds
  },

  // Server configuration (for preview)
  server: {
    host: true,
    port: 4173,
    strictPort: true // Exit if port is taken
  },

  preview: {
    host: true,
    port: 4173
  },

  // Base path for deployment
  base: './',

  // Environment variables
  define: {
    'process.env': {},
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material'
    ],
    exclude: ['jspdf'] // Exclude heavy libraries from pre-bundling
  }
});
