// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";
  
  return {
    /**
     * ✅ CRITICAL:
     * Render/Vercel/Netlify require absolute base "/"
     * Fixes MIME errors + asset 404 issues
     */
    base: "/",

    plugins: [
      react(),

      /** ------------------------------
       * 🔥 Progressive Web App (PWA)
       * ------------------------------ */
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",

        includeAssets: ["favicon.ico", "logo.png", "robots.txt"],

        manifest: {
          id: "/",
          lang: "en",
          name: "Assessly",
          short_name: "Assessly",
          description: "AI-Powered Assessment Platform",
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
              type: "image/png",
            },
            {
              src: "/logo.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/logo.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            }
          ]
        },

        workbox: {
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff2,webp}"
          ],

          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,

          /** 🌐 SPA fallback */
          navigateFallback: "/index.html",

          /** ⚡ Runtime cache rules */
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 50, maxAgeSeconds: 300 }
              }
            }
          ]
        },

        devOptions: {
          enabled: !isProduction,
          type: "module"
        }
      })
    ],

    /** ------------------------------
     * Build Config
     * ------------------------------ */
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
              "@emotion/styled",
            ],
            "utils-vendor": [
              "axios",
              "dayjs",
              "jwt-decode",
              "notistack"
            ]
          },

          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]"
        }
      },

      /** Prevent broken deploys */
      minify: isProduction ? "terser" : "esbuild",
      terserOptions: isProduction
        ? {
            compress: { drop_console: true, drop_debugger: true },
            mangle: true
          }
        : undefined,

      chunkSizeWarningLimit: 1000
    },

    /** Dev server fixes */
    server: {
      port: 3000,
      host: true,
      headers: { "Cache-Control": "no-store" },

      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, "")
        }
      }
    },

    preview: { port: 4173, host: true },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      }
    }
  };
});
