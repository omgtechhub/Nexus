import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  // Absolute, not "./".
  //
  // A relative base resolves assets against the current URL, which works only
  // at the site root. At /seller/orders the browser asked for
  // /seller/assets/index-*.js, got the SPA fallback or a 404, and rendered a
  // blank page — so every bookmarked dashboard and every emailed link to a
  // nested route was dead in a production build, while the dev server was fine.
  //
  // Set VITE_BASE to deploy under a sub-path (e.g. VITE_BASE=/nexus/ for
  // http://host/nexus/). App.tsx reads the router basename from this same
  // value via import.meta.env.BASE_URL, so the asset paths and the router can
  // no longer disagree about where the app lives.
  base: process.env.VITE_BASE || "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
