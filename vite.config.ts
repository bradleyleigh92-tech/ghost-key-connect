import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: false }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
});
