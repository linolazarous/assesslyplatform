// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Required when hosting on Render / Netlify / or Root Path Deployment
  base: "/",

  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",
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
        scope: "/",
        start_url: "/",
        orientation: "portrait-primary",

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

        // Improve app stability during new deploys
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB

        // Ensure offline routing works
        navigateFallback: "/index.html"
      }
    })
  ],

  build: {
    outDir: "dist",
    emptyOutDir: true,

    /** 👈 Enable source maps for easier debugging */
    sourcemap: true,

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
    },

    /** 👈 Fail build on errors to prevent broken deploys */
    minify: "esbuild",
  },

  server: {
    port: 3000,
    host: true,
    headers: {
      // Prevent caching for easier development refresh
      "Cache-Control": "no-store"
    }
  },

  preview: {
    port: 4173,
    host: true
  }
});
