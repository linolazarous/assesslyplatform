// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
    /** 
     * CRITICAL FOR RENDER 
     * Fixes MIME errors and 404 on assets
     */
    base: "/",

    plugins: [
      react(),

      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",

        includeAssets: ["favicon.ico", "logo.png", "robots.txt"],

        manifest: {
          id: "/",
          name: "Assessly",
          short_name: "Assessly",
          description: "AI-Powered Assessment Platform",
          theme_color: "#3f51b5",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          scope: "/",
          orientation: "portrait-primary",
          icons: [
            { src: "/logo.png", sizes: "192x192", type: "image/png" },
            { src: "/logo.png", sizes: "512x512", type: "image/png" },
            { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
          ]
        },

        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff2,webp}"],
          cleanupOutdatedCaches: true,
          navigateFallback: "/index.html",
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,

          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                networkTimeoutSeconds: 8
              }
            }
          ]
        }
      })
    ],

    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: !isProduction,

      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "mui-vendor": [
              "@mui/material",
              "@mui/icons-material",
              "@emotion/react",
              "@emotion/styled"
            ],
            "utils-vendor": ["axios", "dayjs", "notistack", "jwt-decode"]
          },
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]"
        }
      },

      minify: isProduction ? "terser" : "esbuild",
      terserOptions: isProduction
        ? { compress: { drop_console: true, drop_debugger: true }, mangle: true }
        : undefined
    },

    resolve: {
      alias: {
        "@": path.resolve("./src")
      }
    }
  };
});
