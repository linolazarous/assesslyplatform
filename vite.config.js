import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";
  // Determine the full API URL including /api path for client-side consumption
  const backendUrl = isProd
    ? "https://assesslyplatform.onrender.com/api"
    : "http://localhost:3000/api";

  return {
    // Defines the base path for assets, crucial for Netlify/subfolders
    base: "/", 
    plugins: [
      react({
        // Keeping explicit Babel config to prevent recurrence of the @babel/preset-react error
        jsxRuntime: "automatic", 
        babel: { presets: ["@babel/preset-react"] },
      }),
    ],
    // Explicitly include jwt-decode to handle its CJS structure in an ESM project
    optimizeDeps: { 
      include: ["jwt-decode"] 
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
      // Ensure CommonJS dependencies like jwt-decode are correctly transformed during build
      commonjsOptions: { 
        include: [/node_modules/] 
      },
      rollupOptions: {
        output: {
          // Manual chunking for vendor packages (React, React-DOM)
          manualChunks: {
            vendor: ["react", "react-dom"],
          },
        },
      },
    },
    server: {
      host: true,
      port: 5173,
      // Proxying /api/ requests to the backend host (without /api path)
      proxy: {
        "/api": {
          target: isProd
            ? "https://assesslyplatform.onrender.com"
            : "http://localhost:3000",
          changeOrigin: true,
          secure: false, // For local development with self-signed certs (if applicable)
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Define global constants/environment variables
    define: {
      __APP_ENV__: JSON.stringify(mode),
      // Required for older libraries that check process.env (e.g., some MUI dependencies)
      "process.env": {}, 
      // Define the client-side variable using the full URL
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(backendUrl),
    },
  };
});
