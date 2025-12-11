import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  // The base URL is crucial for correctly resolving asset paths
  base: "./", // Changed from '/' to relative path './'

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // Include only the core assets that definitely exist
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "Assessly",
        short_name: "Assessly",
        description: "AI-Powered Assessment Platform",
        theme_color: "#3f51b5",
        background_color: "#ffffff",
        display: "standalone",
        // Start URL should be relative
        start_url: "./",
        scope: "./",
        icons: [
          {
            src: "./logo.png", // Changed to relative path
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "./logo.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      // Simplified workbox configuration
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff2}"],
        navigateFallback: "./index.html",
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      }
    })
  ],

  build: {
    outDir: "dist",
    // This helps the plugin find the correct paths
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html")
      }
    }
  },

  resolve: {
    alias: {
      "@": path.resolve("./src")
    }
  }
});
