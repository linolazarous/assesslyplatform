// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// ✅ Safe fallback for environments where process is undefined
if (typeof process === "undefined") {
  window.process = { env: { NODE_ENV: "production" } };
}

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  // ✅ Define backend base URLs (adjust for your actual backend)
  const backendUrl = isProd
    ? "https://assesslyplatform.onrender.com/api"
    : "http://localhost:3000/api";

  return {
    base: "/", // ensures correct asset loading in production
    plugins: [
      react({
        jsxRuntime: "automatic",
        babel: { presets: ["@babel/preset-react"] },
      }),
    ],

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
      cssCodeSplit: true,
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

      // ✅ Prevent process is not defined errors in the browser
      "process.env": {
        NODE_ENV: JSON.stringify(mode),
      },

      // ✅ Ensure frontend always has a base API URL
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(backendUrl),
    },
  };
});
