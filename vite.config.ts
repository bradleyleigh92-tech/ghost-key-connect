// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Prerender all routes as static HTML so the output can be served by any
    // static file server (nginx, Tor hidden service, etc.) with no runtime.
    prerender: {
      enabled: true,
      crawlLinks: true,
      autoSubfolderIndex: true,
    },
    pages: [{ path: "/" }, { path: "/admin" }],
  },
  // Force the static nitro preset outside Lovable's own build so the output
  // is a plain public/ directory of HTML+assets (no Worker, no Node server).
  nitro: { preset: "static" },
});
