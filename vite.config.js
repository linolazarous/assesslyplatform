// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Required for Render static site hosting
  base: "/",

  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      // Files in /public
      includeAssets: ["favicon.ico", "logo.png"],

      manifest: {
        id: "/",
        lang: "en",
        name: "Assessly",
        short_name: "Assessly",
        description:
          "AI-Powered Assessment Platform for creating, managing, and analyzing assessments.",
        theme_color: "#3f51b5",
        background_color: "#ffffff",
        display: "standalone",

        // These MUST match your hosting base path
        scope: "/",
        start_url: "/",

        orientation: "portrait-primary",

        // Recommended icon set (min 192 & 512)
        icons: [
          {
            src: "/logo.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/logo.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },

      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff2,webp}"
        ],

        // Allow caching large bundles
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB

        // PREVENT excessive re-caching on every deploy
        cleanupOutdatedCaches: true,

        // Make sure PWA doesn't break navigation
        navigateFallback: "/index.html"
      }
    })
  ],

  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,

    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          mui: [
            "@mui/material",
            "@mui/icons-material",
            "@emotion/react",
            "@emotion/styled"
          ],
          utils: ["axios", "dayjs", "jwt-decode"],
          charts: ["recharts"]
        }
      }
    }
  },

  server: {
    port: 3000,
    host: true,
    headers: {
      "Cache-Control": "no-store"
    }
  },

  preview: {
    port: 4173,
    host: true
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@mui/material",
      "@mui/icons-material",
      "axios",
      "dayjs",
      "recharts"
    ]
  }
});
