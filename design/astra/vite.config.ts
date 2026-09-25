import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const prototypeRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: prototypeRoot,
  base: "./",
  publicDir: false,
  envDir: prototypeRoot,
  envPrefix: "ASTRA_MOCK_PUBLIC_",
  plugins: [react(), tailwindcss()],
  server: { host: "127.0.0.1", port: 4310, strictPort: true },
  preview: { host: "127.0.0.1", port: 4310, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
