import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// Helper to replace placeholders in HTML and manifest.json
function injectEnvPlugin(env) {
  return {
    name: "html-manifest-env-replacer",
    enforce: "pre",
    transformIndexHtml(html) {
      return html
        .replace(/%VITE_APP_NAME%/g, env.VITE_APP_NAME)
        .replace(/%VITE_APP_DESCRIPTION%/g, env.VITE_APP_DESCRIPTION)
        .replace(/%VITE_APP_LOGO_URL%/g, env.VITE_APP_LOGO_URL);
    },
    buildStart() {
      const manifestPath = path.resolve(__dirname, "public/manifest.json");
      if (fs.existsSync(manifestPath)) {
        let manifest = fs.readFileSync(manifestPath, "utf-8");
        manifest = manifest
          .replace(/%VITE_APP_NAME%/g, env.VITE_APP_NAME)
          .replace(/%VITE_APP_DESCRIPTION%/g, env.VITE_APP_DESCRIPTION)
          .replace(/%VITE_APP_LOGO_URL%/g, env.VITE_APP_LOGO_URL);
        fs.writeFileSync(manifestPath, manifest, "utf-8");
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load environment variables based on mode (development / production)
  const env = loadEnv(mode, process.cwd(), "VITE_");

  const isProd = mode === "production";
  const backendUrl = isProd
    ? env.VITE_API_BASE_URL || "https://assesslyplatform.onrender.com/api"
    : env.VITE_API_BASE_URL || "http://localhost:3000/api";

  return {
    base: "/",
    plugins: [
      react({
        jsxRuntime: "automatic",
        babel: { presets: ["@babel/preset-react"] },
      }),
      injectEnvPlugin(env), // inject VITE_* variables into HTML & manifest
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: ["jwt-decode"],
    },
    define: {
      "process.env": {}, // Fixes process reference errors in browser
      __APP_ENV__: JSON.stringify(mode),
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(backendUrl),
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
      commonjsOptions: { include: [/node_modules/] },
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
            ? env.VITE_API_BASE_URL.replace("/api", "")
            : "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
