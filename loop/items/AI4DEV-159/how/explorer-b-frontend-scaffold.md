### Components Found

| Name | Path | What it does |
|---|---|---|
| `defineConfig` (Lovable wrapper) | `vite.config.ts` 7–15; `node_modules/@lovable.dev/vite-tanstack-config/dist/index.js` `defineConfig` 296–447 | Single Vite config. Injects `tanstackStart`, React, Tailwind, `vite-tsconfig-paths`, VITE env `define`, optional Nitro, sandbox port 8080. |
| `tanstackStart` plugin | pulled in by that wrapper at `index.js` 334–345 | File-based routing, SSR, import protection. Nested `tanstackRouterGenerator` writes `src/routeTree.gen.ts`. |
| `getRouter` | `src/router.tsx` 5–16 | Builds the TanStack router from `routeTree`, with a `QueryClient` in context. |
| `startInstance` | `src/start.ts` 20–23 | Global Start config: request middleware that turns unhandled throws into HTML 500. `defaultSsr` is not set, so SSR stays on. |
| default `fetch` export | `src/server.ts` 40–53 | Workers-style SSR entry: `fetch(request, env, ctx)` around `@tanstack/react-start/server-entry`, plus h3 500 rewrite. |
| `Route` (root) | `src/routes/__root.tsx` 75–100 | App shell: HTML document, `HeadContent`/`Scripts`, React Query, 404, error UI, Lovable error reporting. |
| `Route` (index) | `src/routes/index.tsx` 3–11 | Only page: `/` renders an `h1` “ai4good”. No loader, no `ssr: false`, no auth. |
| `routeTree` | `src/routeTree.gen.ts` 57–59 | Generated tree. Today only `__root__` and `/`. |
| `getServerConfig` | `src/lib/config.server.ts` 19–26 | Server-only helper. Reads `process.env` inside a function (Cloudflare request-time bind). Unused by any route. |
| `getGreeting` | `src/lib/api/example.functions.ts` 14–22 | Template `createServerFn`. Nothing imports it. |
| `reportLovableError` | `src/lib/lovable-error-reporting.ts` 21–36 | Forwards errors to `window.__lovableEvents` if that object exists. |
| `cn` | `src/lib/utils.ts` 4–6 | shadcn class merge (`clsx` + `tailwind-merge`). |
| shadcn primitives | `src/components/ui/*.tsx` (46 files); `components.json` | New York style, `rsc: false`, alias `@/components/ui`. No route imports them. |
| `useIsMobile` | `src/hooks/use-mobile.tsx` | `window.matchMedia` in `useEffect`. Unused by routes. |
| `ClientOnly` / `useHydrated` | `node_modules/@tanstack/react-router/src/ClientOnly.tsx` | Renders children only after hydration. Available, unused. |
| `@supabase/supabase-js` | `package.json` 80 (devDependency); `bun.lock` 65 and 501; `node_modules/@supabase/supabase-js` | Installed. Nothing under `src/` imports it. |
| `ai` / `@ai-sdk/react` | not in `package.json` or `bun.lock` | Not installed. |

There is no Discovery chat route, no `useChat`, no browser session helper, no `vercel.json`, no `wrangler.toml`/`wrangler.jsonc`, no `netlify.toml`, no `index.html`, no `src/vite-env.d.ts`.

---

### Flow

**1. Dev or build starts.** `bun run dev` → `vite dev`. `bun run build` → `vite build`. Vite loads `vite.config.ts`, which calls Lovable `defineConfig`.

**2. Plugins register.** Lovable `defineConfig` (`index.js` 334–345) pushes `tanstackStart(...)`. That plugin includes `tanstackRouterGenerator` (`node_modules/@tanstack/start-plugin-core/src/vite/start-router-plugin/plugin.ts` 144–156).

**3. Route tree regenerates.** On Vite `configResolved`, the generator runs once (`router-generator-plugin.ts` 77–79). During `vite dev`, `watchChange` regenerates on create/update/delete of route files (70–75). Default dirs: `srcDirectory` `src`, routes `src/routes`, output `src/routeTree.gen.ts` (`schema.ts` 71–83, 184). There is no separate generate script. `enableRouteGeneration` is not set to false.

**4. How to add a file route.** Drop a `.tsx` under `src/routes/` that exports `const Route = createFileRoute("<path>")({ ... })`. Conventions are in `src/routes/README.md` 10–19: `index.tsx` → `/`; `users/$id.tsx` → `/users/:id` (bare `$`); `_layout.tsx` for a layout with `<Outlet />`. Do not invent `src/pages/` or `app/layout.tsx`. After `vite dev` or `vite build`, `routeTree.gen.ts` is rewritten. Do not edit that file by hand (README line 21). CI exempts it from the Lovable/Claude ownership guard (`.github/workflows/ci.yml` 250–258).

**5. Request for `/` today.** Incoming HTTP hits `src/server.ts` `fetch` (40–45) → Start server entry → `getRouter()` (`src/router.tsx` 5–16) → generated tree. Root `shellComponent` (`__root.tsx` 102–114) emits `<html>`, `<HeadContent />`, `<Scripts />`. Root `component` wraps `<Outlet />` in `QueryClientProvider`. Index `component` (`index.tsx` 13–18) paints the heading. SSR is on (Start default `ssr: true`; `src/start.ts` does not set `defaultSsr: false`). Then the client hydrates.

**6. Public config to the browser.** Lovable wrapper, `envDefine !== false` (default): `loadEnv(mode, process.cwd(), "VITE_")` then `define: { "import.meta.env.VITE_FOO": JSON.stringify(value) }` (`index.js` 400–408). Vite’s own env load also runs. Vite 7 file order (`node_modules/vite/dist/node/chunks/config.js` 9371–9401): `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`. Later files overwrite earlier. Then any `process.env` key with prefix `VITE_` overwrites the files. `bun run` also auto-loads `.env` / `.env.local` into `process.env` (`tests/at/harness/local-stack.ts` 67–74). Among `.env` vs `.env.local`, **`.env.local` wins**. Mode files (`.env.development` on `vite dev`) would then win over `.env.local`. This worktree has **no** `.env.local`.

**7. What the tracked `.env` points at.** Hosted Supabase, not the local stack:

- `VITE_SUPABASE_URL` / `SUPABASE_URL` = `https://poancmeitlmxejofwzuu.supabase.co`
- `VITE_SUPABASE_PROJECT_ID` = `poancmeitlmxejofwzuu`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = the hosted anon JWT

Local API is `http://127.0.0.1:44321` (`supabase/config.toml` 19; verify skill). Same `project_id` string, different host. Nothing in `src/` reads `import.meta.env` today (only a comment in `config.server.ts` 15–17).

**8. Typecheck.** `bun run typecheck` → `bun tests/at/typecheck.ts`. Always runs three `tsc --noEmit -p` projects with the pinned compiler at `node_modules/typescript/bin/tsc` (`typecheck.ts` 41–45, 58–63):

| Label | Config | Covers |
|---|---|---|
| app | `tsconfig.json` | `src/**/*.ts(x)`, `vite.config.ts`, `eslint.config.js`. Yes, it types `src/`. |
| acceptance tests | `tests/at/tsconfig.json` | all of `tests/at` |
| verify drive | `.claude/skills/verify-ai4good/scripts/tsconfig.json` | drive scripts |

App `tsconfig.json`: `strict: true`, `noEmit: true`, `skipLibCheck: true`, `paths: { "@/*": ["./src/*"] }`, `types: ["vite/client"]`. `routeTree.gen.ts` has `@ts-nocheck` so it is included but not checked. CI runs this (`ci.yml` 131–134). CI does **not** run lint.

**9. Lint.** `bun run lint` → `eslint .` (`package.json` 11). `eslint.config.js`: files `**/*.{ts,tsx}`; ignores `dist`, `.output`, `.vinxi`, `loop/parked`. Browser globals. Bans importing `server-only`. `react-hooks` recommended. `react-refresh/only-export-components` warn, `allowConstantExport: true`. `@typescript-eslint/no-unused-vars` off. Prettier plugin last. No `.prettierrc`. `routeTree.gen.ts` is not ignored; it has `/* eslint-disable */`.

**10. shadcn.** `components.json`: schema `ui.shadcn.com`, style `new-york`, `rsc: false`, Tailwind `src/styles.css`, alias `ui` → `@/components/ui`. Use: `import { Button } from "@/components/ui/button"` and `cn(...)` for classes. Primitives compose with Radix + CVA. Routes do not import them. `design/ui-way-of-work.md` 30–32 says Lovable owns `src/` and builds screens with these components; this item’s brief says no design work beyond readable markup.

**11. Session in the browser (not built).** `@supabase/supabase-js` 2.112.2 is a **devDependency**, present in `node_modules/@supabase/` and `bun.lock`. No `src/` import. A page would: `createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)`, then `auth.getSession()` / `auth.getUser()`. Defaults (`GoTrueClient.ts` 194–201, 496–505): `persistSession: true` → `localStorage` when `supportsLocalStorage()`, else memory; `autoRefreshToken: true`; storage key `supabase.auth.token`. That `localStorage` path is browser-only; a loader that touches `localStorage` on SSR will throw unless the route sets `ssr: false` or uses `ClientOnly`. Local JWT lifetime is 120 seconds (`supabase/config.toml` 181); auto-refresh margin is 90s (`auth-js` `EXPIRY_MARGIN_MS`). There is no sign-in route and no `beforeLoad` guard.

**12. How the missing chat page would talk to the stack.** Not implemented. The intended path (brief + `chat-ui.md`): browser `useChat` + `DefaultChatTransport` → `POST {VITE_SUPABASE_URL}/functions/v1/discovery-message` with `Authorization: Bearer <access_token>`, `apikey: <anon>`, `Accept: text/event-stream`, body `{ organizationId, projectId, message }`; history from `POST .../discovery-conversation` (that function is POST-only, `discovery-conversation/index.ts` 8–9). CORS on functions allows origin `*`, methods `POST, OPTIONS`, headers `authorization, apikey, content-type, x-client-info` (`edge.ts` 83–86). `Accept` is a safelisted request header. Extra custom request headers would fail preflight.

**13. Host deploy.** No Vercel/Netlify/Wrangler config files. Host behavior lives in Lovable’s Vite wrapper:

- Sandbox if `LOVABLE_SANDBOX=1` or `DEV_SERVER__PROJECT_PATH` set (`index.js` 4–8).
- Sandbox: port 8080, `strictPort`, host `::`, Nitro **forced** to `cloudflare-module`, output `dist` / `dist/server` / `dist/client`, `nodeCompat` + `deployConfig` (369–373). Dev: `componentTagger`, HMR gate, dev-server bridge.
- Outside sandbox (local clone, typical Vercel CI): Nitro **skipped** unless `nitro: true` or a nitro object (`index.js` 346–351). Log: “No Lovable context detected — skipping nitro deploy plugin.”
- `vite.config.ts` does **not** pass `nitro`. So a local/`vite build` is Vite + TanStack Start only, not a Cloudflare or Vercel adapter.
- Nitro’s `defaultPreset: "cloudflare-module"` and Vercel/Netlify auto-detect apply **only when Nitro actually runs**.
- `src/server.ts` is a Cloudflare/Nitro-shaped `fetch(request, env, ctx)` wrapper. `config.server.ts` 6–8 warns that on Workers, `process.env` must be read inside a handler.
- `reportLovableError` is a no-op unless `window.__lovableEvents` exists.

A route that only uses `import.meta.env.VITE_*` and `fetch` to edge functions has no host-specific API. A route that uses `createServerFn` (the template in `example.functions.ts`) needs the Start server runtime (Workers on Lovable, Nitro-on-Vercel only if Nitro is enabled). That is the host split the brief’s “no host-specific API” line is about.

---

### Files Read

- `loop/items/AI4DEV-159/brief.md`, `loop/items/AI4DEV-159/how/prompt-b-frontend-scaffold.md`
- `package.json`, `bunfig.toml`, `bun.lock` (supabase-js / `ai` hits)
- `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `components.json`
- `.env`, `.env.example`, `.gitignore` (`.env.local` absent in this worktree)
- `src/router.tsx`, `src/start.ts`, `src/server.ts`, `src/routeTree.gen.ts`, `src/styles.css`
- `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/README.md`
- `src/lib/config.server.ts`, `src/lib/error-capture.ts`, `src/lib/error-page.ts`, `src/lib/lovable-error-reporting.ts`, `src/lib/utils.ts`, `src/lib/api/example.functions.ts`
- `src/hooks/use-mobile.tsx`
- `src/components/ui/button.tsx`, `input.tsx`, `textarea.tsx`, `card.tsx`, `alert.tsx`, `badge.tsx`, `scroll-area.tsx`, `sonner.tsx`
- `tests/at/typecheck.ts`, `tests/at/tsconfig.json`, `.claude/skills/verify-ai4good/scripts/tsconfig.json`
- `.github/workflows/ci.yml` (ownership + typecheck)
- `supabase/config.toml` (ports, `site_url`, `jwt_expiry`)
- `supabase/functions/_shared/edge.ts` (CORS), `discovery-stream.ts`, `discovery-message/index.ts`, `discovery-conversation/index.ts`
- `tests/at/harness/live-stack.ts`, `local-stack.ts` (env allowlist / bun `.env` load)
- `.claude/skills/verify-ai4good/SKILL.md`
- `design/ui-way-of-work.md` (shadcn / Lovable ownership)
- `loop/items/AI4DEV-132/research/chat-ui.md`
- `node_modules/@lovable.dev/vite-tanstack-config/dist/index.js`, `index.d.ts`, `package.json`
- `node_modules/@tanstack/react-start/src/plugin/vite.ts`, `skills/react-start/SKILL.md`, `skills/react-start/server-components/examples/05-ssr-false-browser-loader.tsx`
- `node_modules/@tanstack/start-plugin-core/src/schema.ts`, `src/vite/start-router-plugin/plugin.ts`, `src/import-protection/defaults.ts`
- `node_modules/@tanstack/start-client-core/skills/start-core/deployment/SKILL.md`
- `node_modules/@tanstack/router-plugin/src/core/router-generator-plugin.ts`, `src/core/config.ts`, `README.md`
- `node_modules/@tanstack/router-generator/src/config.ts`
- `node_modules/@tanstack/react-router/src/ClientOnly.tsx`
- `node_modules/vite/dist/node/chunks/config.js` (`loadEnv` / `getEnvFilesForMode`)
- `node_modules/@supabase/auth-js/src/GoTrueClient.ts`, `src/lib/constants.ts`
- `node_modules/@supabase/supabase-js/src/SupabaseClient.ts`
- Confirmed missing: `vercel.json`, `wrangler.toml`, `wrangler.jsonc`, `netlify.toml`, `index.html`, `src/vite-env.d.ts`, `.env.local`

---

### Boundaries

**In (what this scaffold gives a chat page)**

- File-route slot under `src/routes/`; generated types after `vite dev`/`vite build`.
- Public `VITE_SUPABASE_*` via `import.meta.env` once the page reads them.
- shadcn primitives and `cn` if used.
- SSR document shell (`__root.tsx`) and HTML 500 pages.
- Dev server on port **8080**, host `::` (Lovable wrapper, sandbox and not).
- CI typecheck of `src/` via root `tsconfig.json`.
- Ownership: `src/` is Lovable territory. `package.json` / `bun.lock` are neither. Same PR must not also change `supabase/`, `tests/`, `loop/`, `.claude/`, `.github/`. `src/routeTree.gen.ts` is exempt.

**Out (what the page must not / cannot get from this scaffold)**

- No Discovery UI, no `useChat`, no `ai` packages.
- No browser Supabase client wiring, no sign-in, no token in router context.
- UI must not hit PostgREST/`createClient` against tables; calls go to edge functions (`CLAUDE.md`; brief).
- `createServerFn` in `example.functions.ts` is a Start RPC, not an edge function.
- Secrets stay in gitignored `.env.local` / `supabase/functions/.env`, never in tracked `.env` (`.env.example` 1–21). This worktree has no `.env.local`.
- Local stack coordinates (`127.0.0.1:44321`, local anon key) are not in tracked `.env`. Acceptance children never inherit `.env` (`local-stack.ts` 67–74). The Vite app **does** inherit them if present.

**Adjacent**

- Edge functions `discovery-message` and `discovery-conversation` (other explorers).
- Verify skill still describes the user surface as “the API, not a screen” (`SKILL.md` 8–9). Evidence for this item is a browser drive of the new route.

---

### Non-Obvious Things

1. **Tracked `.env` is the hosted project.** A `vite dev` in this worktree with no `.env.local` injects `https://poancmeitlmxejofwzuu.supabase.co` into the browser. Local functions live at `http://127.0.0.1:44321`. Same `project_id` string in `config.toml`. Easy to drive the hosted project by accident.

2. **This worktree has no `.env.local`.** The brief says the provider key is in repo-root `.env.local`. Vite `loadEnv` uses `process.cwd()` (the worktree). Override `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` here for a local drive.

3. **SSR is on.** `useChat`, `localStorage`, `window` in render/loader need `ssr: false` on the route, `ClientOnly`, or a `useEffect`/`useHydrated` guard. `useIsMobile` already defers `window` to `useEffect`. `reportLovableError` guards `typeof window === "undefined"`.

4. **`vite.config.ts` comment vs package.** Comment says Nitro is always included with Cloudflare as default. Package 2.3.2 **skips Nitro** outside Lovable sandbox unless `nitro: true`. Local and default Vercel builds are not Cloudflare-bundled unless that flag or sandbox env is set.

5. **`example.functions.ts` contradicts the product rule.** Lines 11–12: “Use this pattern instead of Supabase Edge Functions.” Product rule and this item: every call through an edge function; no host-specific API. Using `getGreeting` as a model for Discovery would bind the page to Start’s server runtime.

6. **Lovable importProtection vs `.server.ts`.** Wrapper sets client protection to files `**/server/**` and specifier `server-only` (`index.js` 336–342). Start’s own default is `**/*.server.*` (`import-protection/defaults.ts` 23–26). `config.server.ts` depends on the suffix. I did not fully trace whether Lovable’s object replaces Start’s default.

7. **Auth `site_url` is port 3000; Vite is 8080.** `supabase/config.toml` 169: `site_url = "http://127.0.0.1:3000"`. OAuth/email redirects will not return to the Vite app unless that is changed. Password grant + in-page client does not need `site_url`.

8. **`@supabase/supabase-js` is a devDependency.** Added for tests. Vite will still bundle it if `src/` imports it. Production install-with-`--production` would omit it. Moving it to `dependencies` is a deploy-shape choice.

9. **`package.json` name is still `tanstack_start_ts`.** Lovable template leftover.

10. **`bun run build` rewrites `routeTree.gen.ts`.** Historical CI failures; now exempt. Typecheck and acceptance runs do not write it (`ci.yml` 250–253).

11. **No `ImportMetaEnv` typing.** `types: ["vite/client"]` only. `import.meta.env.VITE_SUPABASE_URL` is untyped beyond Vite’s index signature.

12. **Root meta still says “Lovable App”.** `__root.tsx` 80–87. Index overrides title to “ai4good”.

13. **CORS allow-methods is POST only.** Matches `discovery-conversation` (POST only). A GET from the browser would fail CORS and the function.

14. **Ownership vs this leaf.** The page is `src/` (Lovable). Adding `ai` / `@ai-sdk/react` in `package.json` is allowed in the same PR. Changing `tests/` or `supabase/` in that PR fails CI.

---

### Open Questions

- Whether Lovable’s `importProtection` **replaces** Start’s `**/*.server.*` rule or merges with it. `config.server.ts` assumes the suffix is enough.
- Exact `vite build` output layout when Nitro is skipped (no `vercel.json`, no Wrangler file). Not run; inferred from package source only.
- Whether Vercel’s environment would set something that turns Nitro on. The wrapper only checks `LOVABLE_SANDBOX` / `DEV_SERVER__PROJECT_PATH`, plus an explicit `nitro` option. `NITRO_PRESET` / Vercel auto-detect only matter if Nitro runs.
- Where this worktree should get `VITE_SUPABASE_*` for the local stack (copy from `bunx supabase status`, or a worktree `.env.local`). File is absent here.
- How the proof page obtains a session: no sign-in route. Options (paste JWT, in-page password form, or verify-skill cookies) are not in the scaffold.
- Whether `createFileRoute` path for “NGO admin with a project id” should be `/…/$projectId`, search params, or something else. README documents `$param` files; the brief does not name the URL.
- Whether `react-refresh/only-export-components` warns on `export const Route`. CI does not run eslint, so it would not block.