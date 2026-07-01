// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function tanstackPrerenderServerBridge() {
  return {
    name: "tanstack-prerender-server-bridge",
    closeBundle() {
      const serverEntry = resolve("dist/server/index.mjs");
      const prerenderEntry = resolve("dist/server/server.js");

      if (existsSync(serverEntry)) {
        writeFileSync(
          prerenderEntry,
          [
            'import server from "./index.mjs";',
            "",
            "function createPreviewSafeRequest(request) {",
            "  const init = {",
            "    method: request.method,",
            "    headers: request.headers,",
            "    redirect: request.redirect,",
            "    signal: request.signal,",
            "  };",
            "  if (request.method !== 'GET' && request.method !== 'HEAD') {",
            "    init.body = request.body;",
            "    init.duplex = 'half';",
            "  }",
            "  const safeRequest = new Request(request.url, init);",
            "  Object.defineProperty(safeRequest, 'ip', { value: undefined, writable: true, configurable: true });",
            "  Object.defineProperty(safeRequest, 'runtime', { value: undefined, writable: true, configurable: true });",
            "  Object.defineProperty(safeRequest, 'waitUntil', { value: undefined, writable: true, configurable: true });",
            "  return safeRequest;",
            "}",
            "",
            "export default {",
            "  fetch(request, env = {}, ctx) {",
            "    return server.fetch(createPreviewSafeRequest(request), env, ctx);",
            "  },",
            "};",
            "",
          ].join("\n"),
          "utf8",
        );
      }
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [tanstackPrerenderServerBridge()],
  },
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
