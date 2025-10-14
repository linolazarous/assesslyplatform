// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    plugins: [react()],
    base: "./", // ✅ ensures assets load correctly (prevents white screen)

    optimizeDeps: {
      include: ["jwt-decode"],
    },

    build: {
      outDir: "dist",
      target: "es2020",
      minify: "esbuild",
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      assetsDir: "assets",
      manifest: true,
      cssCodeSplit: true, // ✅ better caching and faster load
      commonjsOptions: {
        include: [/node_modules/],
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
          },
        },
      },
    },

    server: {
      host: true,
      port: 5173,
      proxy: {
        "/api": {
          target: isProd
            ? "https://assesslyplatform.onrender.com"
            : "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
      },
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    define: {
      __APP_ENV__: JSON.stringify(mode),
      "process.env": {}, // ✅ prevents "process is not defined" errors
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
        isProd
          ? "https://assesslyplatform.onrender.com/api"
          : "http://localhost:3000/api"
      ),
    },
  };
});
