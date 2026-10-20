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
  build: {
    rollupOptions: {
      output: {
        /**
         * Split the vendor libraries out of the entry chunk.
         *
         * The entry was 513 kB because React, the router, react-query and
         * GSAP were bundled together with the app's own code. That is a
         * caching problem more than a size one: every deploy changes the app
         * code, so the single combined chunk's hash changed too and returning
         * visitors re-downloaded half a megabyte of unchanged framework on
         * every release.
         *
         * Grouped rather than one-chunk-per-package: dozens of tiny chunks
         * cost more in requests than they save in bytes. React and the router
         * are deliberately together — the router imports React internals, and
         * separating them is the usual cause of a "Cannot read properties of
         * undefined (reading 'useState')" on a cold load, where the chunks
         * initialise in the wrong order.
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) {
            return "vendor-react";
          }
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("gsap")) return "vendor-gsap";

          /**
           * recharts and d3 are deliberately NOT named here.
           *
           * Naming them produced a `vendor-charts` chunk that Vite then
           * emitted a `modulepreload` for in index.html — so every visitor to
           * the marketing page downloaded 392 kB of charting library to render
           * a page with no charts on it. Left alone, Vite keeps them inside
           * the lazily-imported dashboard chunk that actually uses them, which
           * is already the right answer.
           */
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    // Bind every interface, not just the default localhost.
    //
    // Vite otherwise listened on [::1] alone, so anything dialling
    // 127.0.0.1 — a tunnel agent, another container, a phone on the LAN —
    // got a refused connection rather than the dev server.
    host: true,
    // Vite 5.4.12+ rejects any request whose Host header it does not
    // recognise (403 "Blocked request. This host is not allowed."), which
    // is what a VS Code dev tunnel URL hits. Allow the tunnel domains we
    // actually share links from; the check stays on for everything else.
    allowedHosts: [".devtunnels.ms", ".ngrok-free.app", ".trycloudflare.com"],
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
  /**
   * The server to share from, not the dev server.
   *
   * `npm run dev` serves every source file as its own module request: one
   * catalogue page is 81 separate JavaScript requests, and the seller
   * dashboard is far more. On this machine that is invisible, but through a
   * forwarded-port link to a phone every one of those is a full round-trip
   * through the tunnel relay, and a single navigation turns into minutes of
   * waiting. The same page off a production build is 15 requests.
   *
   * So: forward the port of `npm run share` when you want to look at this on
   * a phone, and keep `npm run dev` for the machine you are editing on, where
   * hot reload is worth the request count.
   *
   * `host`, `allowedHosts` and `proxy` are not repeated here — Vite defaults
   * each of them to the `server` value above, so the tunnel domains and the
   * API proxy already apply.
   */
  preview: {
    port: 4173,
  },
});
