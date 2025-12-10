import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";
  const isAnalyze = mode === "analyze";
  
  return {
    // Required when hosting on Render / Netlify / or Root Path Deployment
    base: "./",

    plugins: [
      react(),

      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "logo.png", "robots.txt"],
        
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

          // Use the same logo.png for all sizes - browser will resize
          icons: [
            {
              src: "/logo.png",
              sizes: "64x64",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/logo.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/logo.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/logo.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
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
          navigateFallback: "/index.html",
          
          // Runtime caching for better performance
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
              }
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5 // 5 minutes
                }
              }
            }
          ]
        },

        // Dev options
        devOptions: {
          enabled: !isProduction,
          type: "module",
          navigateFallback: "index.html"
        }
      })
    ],

    build: {
      outDir: "dist",
      emptyOutDir: true,

      /** 👈 Enable source maps for easier debugging */
      sourcemap: isProduction ? false : true,

      rollupOptions: {
        output: {
          manualChunks: {
            // Optimized chunk splitting
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "mui-vendor": [
              "@mui/material",
              "@mui/icons-material",
              "@emotion/react",
              "@emotion/styled"
            ],
            "utils-vendor": ["axios", "dayjs", "jwt-decode", "notistack"],
            "charts-vendor": ["recharts", "chart.js"],
            "forms-vendor": ["react-hook-form", "@hookform/resolvers", "yup"]
          },
          
          // Better chunk naming for caching
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]"
        }
      },

      /** 👈 Fail build on errors to prevent broken deploys */
      minify: isProduction ? "terser" : "esbuild",
      
      // Terser options for better minification in production
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        mangle: true,
      } : undefined,
      
      // Chunk size warning limit
      chunkSizeWarningLimit: 1000,
    },

    server: {
      port: 3000,
      host: true,
      headers: {
        // Prevent caching for easier development refresh
        "Cache-Control": "no-store"
      },
      
      // Proxy for API in development
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      }
    },

    preview: {
      port: 4173,
      host: true
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@mui/material",
        "@mui/icons-material",
        "axios",
        "dayjs",
        "notistack"
      ],
      exclude: []
    },
    
    // Resolve aliases for cleaner imports
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@contexts": path.resolve(__dirname, "./src/contexts"),
      }
    }
  };
});
