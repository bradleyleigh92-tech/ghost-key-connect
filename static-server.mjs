// Tiny static SPA server. Ignores Host header (works for localhost, .onion, etc.).
// Serves files from dist/client and falls back to index.html for unknown paths.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const ROOT = resolve("dist/client");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

async function tryFile(p) {
  try {
    const s = await stat(p);
    if (s.isFile()) return p;
    if (s.isDirectory()) {
      const idx = join(p, "index.html");
      const si = await stat(idx);
      if (si.isFile()) return idx;
    }
  } catch {}
  return null;
}

async function resolvePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const safe = normalize(clean).replace(/^([/\\])+/, "");
  const abs = resolve(ROOT, safe);
  if (!abs.startsWith(ROOT + sep) && abs !== ROOT) return null;
  return (await tryFile(abs)) || (await tryFile(resolve(ROOT, "index.html")));
}

const server = createServer(async (req, res) => {
  try {
    const file = await resolvePath(req.url || "/");
    if (!file) {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("Not found");
    }
    const buf = await readFile(file);
    const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "content-type": type,
      "cache-control": file.endsWith(".html")
        ? "no-cache"
        : "public, max-age=31536000, immutable",
    });
    res.end(buf);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Server error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Static site serving ${ROOT} at http://${HOST}:${PORT}`);
});
