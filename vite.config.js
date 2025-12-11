import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // Changed back to regular plugin
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Base path for production
  base: "./",
  
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ['favicon.ico'],
      manifest: {
        name: "Assessly",
        short_name: "Assessly",
        description: "AI-Powered Assessment Platform",
        theme_color: "#3f51b5",
        background_color: "#ffffff",
        display: "standalone",
        start_url: ".",
        icons: [
          {
            src: "logo-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "logo-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
      }
    })
  ],
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined // Disable manual chunks for now to simplify
      }
    }
  },
  
  server: {
    port: 5173,
    host: true
  }
});
