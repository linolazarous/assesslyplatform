// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = process.env;

  // ✅ Helper: Replace placeholders in files
  const injectEnvVars = () => {
    return {
      name: "inject-env-vars",
      enforce: "post",
      generateBundle(_, bundle) {
        // Target files (manifest & index)
        const manifestFile = bundle["manifest.json"];
        const htmlFile = bundle["index.html"];

        const replaceEnvVars = (content) =>
          content
            .replace(/%VITE_APP_LOGO_URL%/g, env.VITE_APP_LOGO_URL || "/logo.png")
            .replace(/%VITE_APP_NAME%/g, env.VITE_APP_NAME || "Assessly")
            .replace(/%VITE_APP_DESCRIPTION%/g, env.VITE_APP_DESCRIPTION || "");

        // ✅ Replace in manifest
        if (manifestFile) {
          const updated = replaceEnvVars(manifestFile.source);
          manifestFile.source = updated;
        }

        // ✅ Replace in HTML
        if (htmlFile) {
          const updated = replaceEnvVars(htmlFile.source);
          htmlFile.source = updated;
        }
      },
    };
  };

  return {
    plugins: [react(), injectEnvVars()],
    base: "./",
    build: {
      outDir: "dist",
      target: "esnext",
    },
    optimizeDeps: {
      include: ["jwt-decode"],
    },
  };
});
