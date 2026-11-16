// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const viewerSupabase = process.env.VIEWER_SUPABASE_PROXY;

export default defineConfig({
  vite: viewerSupabase
    ? {
        server: {
          proxy: Object.fromEntries(
            ["/auth/v1", "/rest/v1", "/functions/v1", "/storage/v1", "/realtime/v1"].map((path) => [
              path,
              { target: viewerSupabase, ws: path === "/realtime/v1" },
            ]),
          ),
        },
      }
    : undefined,
  nitro: process.env.VERCEL ? { preset: "vercel" } : undefined,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
