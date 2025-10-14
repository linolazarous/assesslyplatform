// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fetch from "node-fetch"; // ✅ For health check requests

// 🔍 Custom health check plugin
function backendHealthCheckPlugin(apiUrl) {
  return {
    name: "backend-health-check",
    async configResolved() {
      try {
        const res = await fetch(`${apiUrl}/health`);
        if (!res.ok) throw new Error(`Backend responded with ${res.status}`);
        const data = await res.json();
        console.log(
          `\n✅ Backend Health Check Passed: ${data.status} (${apiUrl})\n`
        );
      } catch (err) {
        console.warn(
          `\n⚠️  Warning: Backend unreachable at ${apiUrl}\nReason: ${err.message}\n`
        );
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";
  const backendUrl = isProd
    ? "https://assesslyplatform.onrender.com/api"
    : "http://localhost:3000/api";

  return {
    plugins: [
      react(),
      backendHealthCheckPlugin(backendUrl) // ✅ runs before build/serve
    ],
    base: "./",

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
      "process.env": {},
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(backendUrl),
    },
  };
});
