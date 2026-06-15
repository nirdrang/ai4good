# ai4good — Next.js → TanStack Start (Lovable) migration: VERIFIED leftover inventory + edit-set

> Produced by the `ai4good-nextjs-to-lovable-migration-plan` workflow (15 agents, 3 verify rounds).
> **151 leftovers** | by file {'prd.md': 87, 'tasks.json': 60, 'design': 4} | by category {'framework': 47, 'infra-deploy': 57, 'api-route': 19, 'implied': 27, 'dep': 1} | goal_met (auto) = False

## Why goal_met = FALSE (read first)
The inventory is grep-exhaustive (verifiers stopped finding NEW token leftovers). goal_met stays false ONLY because 3 coherence risks rest on unverified assumptions, not missing edits:

1. LOVABLE STACK ASSUMPTION (must verify before relying on it): Lovable's MCP states there is NO tech-stack selector in create_project and new projects use Lovable's default backend stack. Every 'Lovable creates the TanStack Start project' edit (tasks #1, prd Task 1.2 / item 2, design-brief §5) ASSERTS a stack Lovable may not emit by default. The create_project natural-language prompt must explicitly request TanStack Start SSR, and Task #1 must add a verification step (mcp__lovable__get_project / list_template_projects) confirming the scaffold IS TanStack Start before downstream tasks depend on it. If Lovable cannot emit TanStack Start, escalate to the founder — the 'Lovable owns a TanStack Start repo' premise needs confirmation, not assertion.

2. DUAL-AUTH ON SHARED WRITE PATHS: raise-blocker and task-comment are reachable from BOTH the UI (Supabase JWT) and the Skill (per-project bearer token tok_volunteer_<project_id>). The plan must specify ONE Edge Function per write path accepting EITHER auth mode with the same underlying writer + notify() call — not two divergent implementations. Affects prd 1574, 1659, REQ-028, tasks #23/#34/#43, design-brief line 39.

3. ISR-EQUIVALENCE UNPROVEN: 'Lovable edge caching' / 'SSR-with-cache' is treated as an ISR drop-in across prd 2068/2844/2888 and tasks #53. There is no evidence Lovable hosting exposes on-demand revalidation. Edits use 'SSR + HTTP cache-control / stale-while-revalidate (+ TanStack Query client cache)' and explicitly flag the <500ms p95 marketplace target as REQUIRING k6 re-validation under the new stack. If sub-500ms needs a CDN, name Cloudflare in front of Lovable rather than the vague 'Lovable edge caching'.

4. GLOBAL STAGING DEFINITION: define 'staging' ONCE as 'Lovable preview_url (frontend) + a Supabase staging project with Edge Functions deployed via Supabase CLI'; every staging mention (tasks #49 details+testStrategy line 615-619, #50 line 631; prd 2642/2644/2698) must inherit it so no task is left pointing at a removed Vercel preview.

5. MISFILED DUPLICATE: the inventory's tasks.json 'Task #16 line 672 Nightly job' entry is a broken pointer (tasks.json:672 = Task #53 k6 testStrategy). The leftover is real but lives at prd.md:672 (REQ-005.5/REQ-007-011 rows) — handle there, drop the tasks.json entry to avoid editing the wrong line.

6. PRD VALIDATOR / VAGUE-WORD PENALTY: MEMORY notes the PRD is at zero vague-word occurrences (validator 100%). Replacement strings must avoid re-introducing banned words (fast/good/safe/secure/simple/etc.) — e.g. prefer 'preferred for simplicity'→removed wording in Key-Component #6; re-run the prd-taskmaster validator after the rewrite.

7. NON-GOALS NOT TO TOUCH: Track-B NGO self-host examples (prd 1165 Vercel/Netlify/Railway; tasks #30 free-tier host), the Lovable-MCP orchestration model (REQ-021/028), Supabase/Tailwind/shadcn/TanStack Query/Stripe/R2/Playwright/GitHub-Actions-for-test, and §11 rows that merely NARRATE past state without asserting Next.js as the CURRENT stack. These must survive the proof_grep (excluded in the regex).

8. BACKUP / REPORT FILES OUT OF SCOPE: .taskmaster/tasks/tasks.backup-*.json and .taskmaster/reports/task-complexity-report.json also contain Next.js/Edge-runtime/staging strings but are NOT named in-scope artifacts; if parse_prd is re-run after the PRD rewrite, tasks.json is regenerated and these caveats about #1/#75 retitles must be re-applied.

## Proof-grep (the definition of "clean")
```
rg -n -i -e 'next\.?js' -e 'app router' -e 'pages router' -e 'server component' -e 'server action' -e 'route handler' -e 'app/\([a-z]+\)|app/[a-z]+/.*page\.tsx|route\.ts' -e 'create-next-app' -e 'getServerSideProps|getStaticProps' -e 'use server|use client' -e 'next/(image|link)' -e '\bISR\b|incremental static' -e '@supabase/auth-helpers-nextjs|@sentry/nextjs|next-auth|next-[a-z]+' -e 'vercel' -e '/api/(discovery|webhooks|projects|stripe)' -e '(nightly|hourly)\s+(job|cron)|background (job|pull)|reconciliation job|cron job|TS server module' .taskmaster/docs/prd.md .taskmaster/tasks/tasks.json | rg -v -i -e 'Vercel/Netlify/Railway' -e 'Track[- ]?B' -e 'free-tier host' -e 'decision-9 .*was DROPPED|narrat|historical' -e 'tasks\.backup'  — an EMPTY result proves a clean restack. (Note: design/ files also carry leftovers at design-brief.md:49 and claude-md-augmentation.md:28,39,63 — run the same regex over design/ separately; exclude the Track-B host examples. 'Cloudflare Workers' and 'pg_cron'/'Supabase Edge' are intentional survivors and are not matched by the patterns.)
```

## Execution order
First do the canonical anchors that everything else inherits from, so downstream prose stays coherent: prd.md Technology Stack block (2608-2616), System Architecture diagram (2142-2143, 2164), Key Components (2181, 2186), then tasks.json #1 (scaffold) and #75 (design-system anchor) since 25 UI tasks depend on #75 and #1. Second, sweep the backend host rewrites as a group — every /api/* route → Edge Function (prd 2192/2210/2217/2229/1573/1574/1631/1646/1659/1817, tasks #13/#19/#26/#73) and every host-less periodic job → pg_cron→Edge Function (prd 672/756/762/870/1013/1018/1020/1046/1056/1069/1075/1083/1088/1092/1094/1118/1444/1455/1639/1658/1756/1772/2004/2683/2692/2698/3105/3150/3256/3257/3266, tasks #14/#18/#20/#21/#24/#27/#28/#29/#30/#41/#42) so the notify()-as-Deno-module (prd 1973/2885, tasks #35) and outbox/UsageMeteringProvider seams resolve consistently. Third, do the App-Router page-path UI tasks (#5/#6/#7/#9/#10/#11/#12/#15/#16/#23/#32/#33/#34/#36/#37/#38/#39/#43/#44/#54/#55 + prd 1052) and the three design-doc edits, then the staging/perf/observability/CI re-pointing (#8/#48/#49/#50/#53/#59, prd 2642/2644). DROP the misfiled tasks.json:672 entry and apply that leftover at prd.md:672 instead. Finally re-run the proof_grep over prd.md + tasks.json (and separately over design/), then re-run the prd-taskmaster 13-check validator to confirm no vague-word regression and zero leftovers; if parse_prd is re-run, re-apply the #1/#75 retitles. goal_met stays FALSE until that final grep is empty AND the three coherence risks (Lovable stack, dual-auth, ISR-equivalence) are confirmed with the founder/Lovable, not merely asserted."

## Migration edit-set (140 edits)

### prd.md (78)

- **Technology Stack — Frontend (line 2608)**
  - FROM: `**Frontend:** Next.js 14 (App Router, Server Components, Server Actions), React 18, Tailwind CSS, shadcn/ui components, TanStack Query (where client-side caching is needed).`
  - TO: **Frontend:** TanStack Start (SSR) — React 18, TanStack Router + TanStack Query, Tailwind CSS, shadcn/ui components. Lovable owns and two-way-syncs the frontend repo. (No App Router / Server Components / Server Actions.)
  - note: Canonical tech-stack line; all backend REQs inherit 'server action' from here. Framework swap only — React/Tailwind/shadcn/TanStack Query preserved.
- **Technology Stack — Backend (line 2609)**
  - FROM: `**Backend:** Next.js Route Handlers (Node + Edge), Supabase Postgres, Supabase Auth, Supabase Storage (verification docs), Supabase Realtime.`
  - TO: **Backend:** Supabase Edge Functions (Deno) for webhooks / mutations / REST / SSE; pg_cron for periodic jobs; Supabase Postgres, Supabase Auth, Supabase Storage (verification docs), Supabase Realtime.
  - note: Keep the trailing Cloudflare-R2 sentence verbatim (R2 + signed-URL edge function are non-goals).
- **Technology Stack — Infra (line 2614)**
  - FROM: `- **Infra:** Vercel (app), Supabase (data + auth), Upstash Redis (rate limits + caches).`
  - TO: - **Infra:** Lovable hosting (frontend, TanStack Start SSR), Supabase (data + auth + Edge Functions + pg_cron). (Upstash already deferred per §11 decision-10.)
  - note: Vercel(app) is the core infra leftover.
- **Technology Stack — Observability (line 2615)**
  - FROM: `- **Observability:** Sentry (errors), Axiom or Logflare (logs), Vercel Analytics.`
  - TO: - **Observability:** Sentry (errors), Axiom or Logflare (logs), Lovable analytics (get_project_analytics) + Supabase Edge Function / DB logs.
  - note: Vercel Analytics is host-bound.
- **Technology Stack — CI/CD (line 2616)**
  - FROM: `- **CI/CD:** GitHub Actions → Vercel.`
  - TO: - **CI/CD:** GitHub Actions for test/lint; deploy = Lovable `deploy_project` (frontend) + Supabase CLI `functions deploy` / `db push` (backend Edge Functions + migrations).
  - note: Two-target deploy; GitHub Actions kept for test/lint only.
- **System Architecture diagram — app box (lines 2142-2143)**
  - FROM: `                       │   Next.js App         │
                       │   (Vercel)            │`
  - TO:                        │  Lovable App          │
                       │  TanStack Start (SSR) │
  - note: Frontend box. Preserve box width/ASCII alignment of the diagram.
- **System Architecture diagram — Background Workers box (line 2164)**
  - FROM: `│  (Supabase Edge Fns / Fly.io)  │`
  - TO: │  Supabase Edge Fns + pg_cron   │
  - note: Resolve the Fly.io hedge to the decided target; Fly.io is escape-hatch only. Keep listed jobs (usage poll / webhook fanout / fuel-low alerts) and ASCII width.
- **Key Components item 1 (line 2181)**
  - FROM: `1. **Next.js 14 App (Vercel):** Server Components + Server Actions for most reads; Route Handlers for webhooks; Edge runtime for marketplace.`
  - TO: 1. **Lovable App — TanStack Start (SSR):** SSR loaders + TanStack Query for reads; webhooks/mutations/REST/SSE handled by Supabase Edge Functions (Deno); SSR-with-HTTP-cache (stale-while-revalidate) for the marketplace.
  - note: Densest framework leftover — Next 14 + Vercel + Server Components + Server Actions + Route Handlers + Edge runtime in one line.
- **Key Components item 6 (line 2186)**
  - FROM: `6. **Worker layer:** Either Supabase Edge Functions (preferred for simplicity) or a Fly.io worker if longer-running jobs prove necessary.`
  - TO: 6. **Worker layer:** Supabase Edge Functions (Deno), pg_cron-scheduled for periodic jobs; Fly.io worker only as an escape hatch if a specific job exceeds Edge Function time limits.
  - note: Resolve the either/or to the decided target.
- **NFR Performance Response Time (line 2068)**
  - FROM: `  - Marketplace page: < 500ms p95 (with Next.js streaming).`
  - TO:   - Marketplace page: < 500ms p95 (with TanStack Start SSR streaming + HTTP cache-control / stale-while-revalidate). RE-VALIDATE the 500ms target holds under TanStack Start before launch.
  - note: Do NOT assert 'Lovable edge caching' as a proven ISR equivalent — flag the target as needing re-validation (semantic-verifier coherence note).
- **NFR Performance Throughput (line 2073)**
  - FROM: `  - Up to 1000 concurrent marketplace viewers in year 1 (well within Vercel + Supabase free/pro tiers).`
  - TO:   - Up to 1000 concurrent marketplace viewers in year 1 (well within Lovable hosting + Supabase free/pro tiers).
  - note: Do NOT touch the sibling line 2074 (Anthropic-bound discovery throughput — non-leftover boundary).
- **NFR Performance Resource Usage (line 2076)**
  - FROM: `  - Stay within Vercel Pro + Supabase Pro tier for year 1 (~$45/mo).`
  - TO:   - Stay within Lovable Pro ($25/mo) + Supabase Pro tier for year 1 (~$50/mo); re-baseline the cost figure for the two-target deploy.
  - note: Re-cost off Vercel Pro.
- **NFR Security Secrets (line 2082)**
  - FROM: `- **Secrets:** All API keys (Stripe, Anthropic, GitHub) stored in Supabase Vault / Vercel env; never logged.`
  - TO: - **Secrets:** All API keys (Stripe, Anthropic, GitHub) stored in Supabase Vault + Supabase Edge Function secrets; never logged.
  - note: Vercel env disappears with the platform.
- **NFR Scalability Horizontal scaling (line 2095)**
  - FROM: `- **Horizontal scaling:** Vercel auto-scaling for the Next.js app; Supabase provides managed Postgres scaling.`
  - TO: - **Horizontal scaling:** Lovable hosting auto-scales the TanStack Start SSR frontend; Supabase Edge Functions auto-scale the backend; Supabase provides managed Postgres scaling.
  - note: Names both Vercel auto-scaling and 'the Next.js app'.
- **NFR Scalability Heavy work (line 2096)**
  - FROM: `**Heavy work** (usage polling, webhook fanout) runs on **Supabase Edge Functions** or **a small worker on Fly.io** (TBD — see Open Questions).`
  - TO: **Heavy work** (usage polling, webhook fanout, outbox drain) runs on **Supabase Edge Functions** (Deno), scheduled via **pg_cron** where periodic. Fly.io retained only as an escape hatch for any job exceeding Edge Function limits. (TBD resolved.)
  - note: Resolve Open-Q2 TBD inline.
- **API Specifications Discovery start (line 2192)**
  - FROM: `POST /api/discovery/start`
  - TO: POST {SUPABASE_FUNCTIONS_URL}/discovery-start   (Supabase Edge Function, Deno)
  - note: In-app /api route → Edge Function. Keep the adjacent 'Auth: Bearer <Supabase JWT> (ngo_admin)' line + response contract.
- **API Specifications Discovery message / SSE (line 2210)**
  - FROM: `POST /api/discovery/{conversationId}/message`
  - TO: POST {SUPABASE_FUNCTIONS_URL}/discovery-message/{conversationId}   (Supabase Edge Function, Deno; SSE via ReadableStream/TransformStream — Deno natively supports SSE)
  - note: SSE token-stream endpoint → Edge Function. Keep the body + 'streamed (SSE) token-by-token from Claude' note.
- **API Specifications Stripe Webhook (line 2217)**
  - FROM: `POST /api/webhooks/stripe`
  - TO: POST {SUPABASE_FUNCTIONS_URL}/stripe-webhook   (Supabase Edge Function, Deno; Stripe-Signature verification unchanged)
  - note: Keep the 'Headers: Stripe-Signature' line + event list.
- **API Specifications GitHub Webhook (line 2229)**
  - FROM: `POST /api/webhooks/github`
  - TO: POST {SUPABASE_FUNCTIONS_URL}/github-webhook   (Supabase Edge Function, Deno; X-Hub-Signature-256 verification unchanged)
  - note: Keep the 'Headers: X-Hub-Signature-256, X-GitHub-Event' line.
- **REQ-026 bootstrap server action (line 1637)**
  - FROM: `the **bootstrap-from-Discovery server action** generates the initial `tasks.json``
  - TO: the **bootstrap-from-Discovery Supabase Edge Function (Deno)** generates the initial `tasks.json`
  - note: server action → Edge Function. Invoked on the matched_pending_fuel→in_progress transition via outbox/DB-trigger. Keep idempotency clause.
- **REQ-026 Task 26.2 (line 1655)**
  - FROM: `Task 26.2: **Bootstrap-from-Discovery server action** — read scope doc → generate `tasks.json` → commit to repo via GitHub App (~5h)`
  - TO: Task 26.2: **Bootstrap-from-Discovery Supabase Edge Function (Deno)** — read scope doc → generate `tasks.json` → commit to repo via GitHub App (~5h)
  - note: Second 'server action' occurrence.
- **REQ-026 server-side bootstrap (line 1572)**
  - FROM: `**Bootstrap from Discovery** (server-side, at project funding):`
  - TO: **Bootstrap from Discovery** (a Supabase Edge Function, Deno, at project funding):
  - note: 'server-side' implies the Next backend host.
- **§11 git-as-truth bootstrap (line 2877)**
  - FROM: `**Bootstrap from Discovery becomes a server-side git commit** at project funding:`
  - TO: **Bootstrap from Discovery becomes a Supabase Edge Function git commit** at project funding:
  - note: Same server-side→Edge-Function rewrite for the §11 narration that asserts the current mechanism.
- **REQ-025 decision-10 server-side bootstrap-commit (line 1467)**
  - FROM: `**On Accept, the new p0 task is added by calling #26's server-side git bootstrap-commit**`
  - TO: **On Accept, the new p0 task is added by calling #26's Supabase Edge Function git bootstrap-commit**
  - note: server-side → Edge Function; keep the single-writer-invariant clause.
- **§11 Rank-3 server-side git bootstrap-commit (line 2885)**
  - FROM: `A single `notify(recipientIds, event_type, payload)` TS server module is the **sole writer**`
  - TO: A single `notify(recipientIds, event_type, payload)` shared Deno module (imported by every Supabase Edge Function) is the **sole writer**
  - note: TS server module → shared Deno module. SAME LINE also contains 'CR-Accept routes through #26's server-side git bootstrap-commit' — change 'server-side' → 'Supabase Edge Function' there too.
- **REQ-016 decision-10 notify TS server module (line 1973)**
  - FROM: `implement as a single `notify(recipientIds, event_type, payload, channel_id?)` TS server module (task #35)`
  - TO: implement as a single `notify(recipientIds, event_type, payload, channel_id?)` shared Deno module (task #35), imported by every Supabase Edge Function,
  - note: TS server module presumes Next server. In-app-via-Realtime + one-Resend-call stay.
- **REQ-026 get_project_context REST endpoint (line 1573)**
  - FROM: ``get_project_context` is a **REST endpoint** (`GET https://ai4good.dev/api/projects/:id/context`)`
  - TO: `get_project_context` is a **Supabase Edge Function** (`GET {AI4GOOD_API_BASE}/projects/:id/context`, where ai4good_api_base resolves to the Supabase Edge Functions base URL per REQ-028)
  - note: Re-host; bearer auth tok_volunteer_<project_id> preserved.
- **REQ-026 comments + blocker REST (line 1574)**
  - FROM: `also REST endpoints (`POST /api/projects/:id/tasks/:task_key/comments`, `POST /api/projects/:id/blockers`)`
  - TO: also Supabase Edge Functions (`POST {AI4GOOD_API_BASE}/projects/:id/tasks/:task_key/comments`, `POST {AI4GOOD_API_BASE}/projects/:id/blockers`)
  - note: Shared write paths — ONE Edge Function each must accept EITHER a Supabase JWT (UI caller) OR a per-project bearer token (Skill caller), same underlying writer + notify(). See residual_risks.
- **REQ-026 export.json endpoint (line 1631)**
  - FROM: ``GET /api/projects/:id/tasks/export.json` → returns full task tree in a TaskMaster-compatible JSON shape`
  - TO: `GET {AI4GOOD_API_BASE}/projects/:id/tasks/export.json` (Supabase Edge Function) → returns full task tree in a TaskMaster-compatible JSON shape — OR drop per decision-9 (the repo IS the export)
  - note: In-app /api route. Either drop or re-host as Edge Function.
- **REQ-026 AC GitHub webhook receiver (line 1638)**
  - FROM: `**GitHub webhook receiver** for `push` events on `ai4good-projects/*``
  - TO: the **`github-webhook` Supabase Edge Function (Deno)** receiving `push` events on `ai4good-projects/*` (the single ingestPush() projection writer)
  - note: Projection worker host. Logic (diff/upsert) unchanged.
- **REQ-026 AC catch-up cron (line 1639)**
  - FROM: `a low-frequency cron polls each active project's `main` HEAD SHA and reconciles any missed pushes against the projection`
  - TO: a low-frequency **pg_cron schedule → `head-sha-reconcile` Supabase Edge Function (Deno)** polls each active project's `main` HEAD SHA and reconciles any missed pushes against the projection; job_runs heartbeat
  - note: Host-less cron → pg_cron→Edge Function.
- **REQ-026 AC tasks.json proxy (line 1646)**
  - FROM: ``GET /api/projects/:id/tasks/tasks.json` proxies to the repo's current `main` HEAD via the GitHub App`
  - TO: `GET {AI4GOOD_API_BASE}/projects/:id/tasks/tasks.json` (Supabase Edge Function) proxies to the repo's current `main` HEAD via the GitHub App
  - note: In-app /api proxy → Edge Function.
- **REQ-026 Task 26.5 Cron reconciliation worker (line 1658)**
  - FROM: `Task 26.5: **Cron reconciliation worker** — periodic poll of each active repo's `main` HEAD SHA for missed webhooks; reconciles diffs (~2h)`
  - TO: Task 26.5: **HEAD-SHA reconciliation worker = pg_cron → `head-sha-reconcile` Supabase Edge Function (Deno)** — periodic poll of each active repo's `main` HEAD SHA for missed webhooks; reconciles diffs + job_runs heartbeat (~2h)
  - note: Separately-authored host-less worker line; must match line-1639 rewrite.
- **REQ-026 Task 26.6 NGO REST API (line 1659)**
  - FROM: `Task 26.6: NGO REST API — `POST /tasks/:task_key/comments`, `POST /blockers`, `GET /context`, `GET /tasks/tasks.json` (proxy); per-project bearer-`
  - TO: Task 26.6: NGO REST API as **Supabase Edge Functions under /functions/v1/** — `POST /projects/:id/tasks/:task_key/comments`, `POST /projects/:id/blockers`, `GET /projects/:id/context`, `GET /projects/:id/tasks/tasks.json` (proxy); per-project bearer-
  - note: Pin the Task-26.6 REST endpoint list to Edge Functions explicitly.
- **REQ-028 Skill slash-command REST calls (lines 1693-1696, 1710)**
  - FROM: ``/ai4good:fuel` → calls `GET /api/projects/:id/context` (REST) ... `/ai4good:blockers` → calls `GET /api/projects/:id/blockers` (REST) ... every Lovable call logged via the ai4good **REST API** (`POST /api/projects/:id/audit-events`)`
  - TO: `/ai4good:fuel` → calls `GET {AI4GOOD_API_BASE}/projects/:id/context` (Supabase Edge Function) ... `/ai4good:blockers` → calls `GET {AI4GOOD_API_BASE}/projects/:id/blockers` ... every Lovable call logged via the ai4good Supabase Edge Function (`POST {AI4GOOD_API_BASE}/projects/:id/audit-events`)
  - note: Re-point Skill REST targets; no orchestration-logic change, only resolved base URL.
- **REQ-006 AC Stripe webhook handler (line 747)**
  - FROM: `Stripe webhook (`checkout.session.completed`) creates **a single `fuel_transactions` row** for the top-up`
  - TO: The `stripe-webhook` Supabase Edge Function (Deno) on `checkout.session.completed` creates **a single `fuel_transactions` row** for the top-up
  - note: Pin host; logic unchanged.
- **REQ-006 AC control-total nightly (line 756)**
  - FROM: `A nightly **control-total job** verifies two global invariants and **pages** on drift`
  - TO: A **pg_cron nightly schedule → `control-total` Supabase Edge Function (Deno)** verifies two global invariants and **pages** on drift; job_runs heartbeat ('control_total')
  - note: Host-less nightly job → pg_cron→Edge Function.
- **REQ-006 AC match-expiry nightly (line 762)**
  - FROM: `Background job nightly: any `matched_pending_fuel` project older than 7 days → revert to `open` + notify both parties.`
  - TO: **pg_cron schedule → `match-expiry` Supabase Edge Function (Deno)** (or a pg_cron DB-only transition): any `matched_pending_fuel` project older than 7 days → revert to `open` + call notify() to both parties; job_runs heartbeat ('match_expiry').
  - note: Host-less nightly → pg_cron. SAME job referenced at prd 672 (two occurrences) and tasks #27.
- **REQ-005.5 application-expiry table row (line 672)**
  - FROM: `| `accepted` → `expired` | Nightly job runs after `fuel_deadline_at` passes without fuel payment`
  - TO: | `accepted` → `expired` | **pg_cron match-expiry job** (nightly/hourly) runs after `fuel_deadline_at` passes without fuel payment
  - note: THIS is the real location of the 'Nightly job runs after fuel_deadline_at' text (NOT tasks.json:672). Same match-expiry job as line 762. The line is referenced twice in prd (REQ-005.5 + REQ-007/011 na
- **REQ-006 schema outbox drain worker (line 870)**
  - FROM: `-- Worker: SELECT ... FOR UPDATE SKIP LOCKED; idempotent handlers; terminal failures → status='failed_dlq'`
  - TO: -- pg_cron (~1m) → `outbox-drain` Supabase Edge Function (Deno): SELECT ... FOR UPDATE SKIP LOCKED; idempotent handlers; terminal failures → status='failed_dlq'; job_runs heartbeat ('outbox_drain')
  - note: Host-less drain worker → pg_cron→Edge Function.
- **REQ-009 provisioning Admin-API caller (line 1046)**
  - FROM: `**Automated:** Platform calls Anthropic Admin API `POST /v1/organizations/workspaces` to create a workspace named `ai4good-<project-slug>`.`
  - TO: **Automated:** a Supabase Edge Function (Deno) — the UsageMeteringProvider write side (createWorkspace) — calls the Anthropic Admin API `POST /v1/organizations/workspaces` on the in_progress transition to create a workspace named `ai4good-<project-slug>`. Anthropic org admin key in Supabase Vault / Edge Function secrets.
  - note: Implied Next backend as the privileged Admin-API caller.
- **REQ-009 AC ops queue UI route (line 1052)**
  - FROM: `Ops queue UI at `/admin/anthropic-ops` lists pending key-creation tasks`
  - TO: Ops queue UI (TanStack Start route `src/routes/admin/anthropic-ops.tsx`, platform_admin-gated, built via Lovable MCP) lists pending key-creation tasks
  - note: App-Router-shaped admin route — MISSED by inventory. The 'mark task done / paste key' write must go through a Supabase Edge Function (complete-anthropic-key-ops) — never a direct UI DB/Vault write.
- **REQ-009 AC usage poller cron (line 1056)**
  - FROM: `per Anthropic org, ONE Usage Report call every 5 minutes`
  - TO: a **pg_cron schedule (every 5 min) → `usage-poller` Supabase Edge Function (Deno)** makes ONE Usage Report call per Anthropic org
  - note: Host-less 5-min cron → pg_cron→Edge Function. Advisory-lock + cursor logic unchanged; UsageMeteringProvider port unchanged.
- **REQ-009 AC daily reconciliation (line 1069)**
  - FROM: `**Daily reconciliation job:** at 02:00 UTC, fetch yesterday's Cost Report`
  - TO: **Daily reconciliation: pg_cron schedule (daily 02:00 UTC) → `daily-reconciliation` Supabase Edge Function (Deno)** fetches yesterday's Cost Report
  - note: Host-less daily job → pg_cron→Edge Function; job_runs heartbeat ('daily_reconciliation').
- **REQ-009 AC fuel-zero key deactivation (line 1075)**
  - FROM: `at 0% → key programmatically deactivated via Admin API (`POST /v1/organizations/api_keys/{id}` with `status: 'inactive'`)`
  - TO: at 0% → the `usage-poller` Supabase Edge Function (Deno) (or an enqueued `deactivate_anthropic_key` outbox event drained by `outbox-drain`) deactivates the key via the Anthropic Admin API (`POST /v1/organizations/api_keys/{id}` status:'inactive')
  - note: Host-less deactivation action — pin to Edge Function/outbox. Keep the fuel_topup_needed blocker via notify().
- **REQ-009 AC hybrid reactivation via Stripe webhook (line 1083)**
  - FROM: `(a) Stripe webhook handler fires immediate reactivation`
  - TO: (a) the `stripe-webhook` Supabase Edge Function enqueues immediate reactivation (reactivate_anthropic_key outbox event, drained by outbox-drain)
  - note: Same host assumption as REQ-006; usage-poller is the idempotent safety-net.
- **REQ-009 Task 9.2 (line 1088)**
  - FROM: `Task 9.2: Workspace auto-creation on `in_progress` transition (~4h)`
  - TO: Task 9.2: Workspace auto-creation inside the provisioning Supabase Edge Function (Deno) on the in_progress transition, behind the UsageMeteringProvider write seam (createWorkspace) (~4h)
  - note: Separately-authored host-less hint — MISSED by inventory.
- **REQ-009 Task 9.6 (line 1092)**
  - FROM: `Task 9.6: Usage API polling worker (one global call grouped by workspace_id per the AC — NOT per-workspace fan-out; codex round 8 nit fix) (~6h)`
  - TO: Task 9.6: Usage API polling worker = pg_cron (every 5 min) → `usage-poller` Supabase Edge Function (Deno), one global Usage Report call grouped by workspace_id; job_runs heartbeat (~6h)
  - note: Separately-authored host-less 'worker' — MISSED by inventory.
- **REQ-009 Task 9.8 (line 1094)**
  - FROM: `Task 9.8: Programmatic key deactivation at fuel-zero (~3h)`
  - TO: Task 9.8: Programmatic key deactivation at fuel-zero — runs inside the `usage-poller` Supabase Edge Function or via a deactivate_anthropic_key outbox event drained by `outbox-drain` (Deno) (~3h)
  - note: Separately-authored host-less hint — MISSED by inventory.
- **REQ-010 Cadence stats hourly background pull (line 1118)**
  - FROM: `computed from GitHub commits via webhooks + hourly background pull`
  - TO: computed from GitHub commits via the `github-webhook` Supabase Edge Function on push (primary) + a pg_cron → `cadence-pull` Supabase Edge Function (Deno) hourly catch-up (data ingestion only; no GitHub UI surfaced)
  - note: Host-less 'hourly background pull' → pg_cron→Edge Function. Keep the 1-hour cache.
- **REQ-008 AC backend mints installation tokens (line 1011)**
  - FROM: `Backend mints`
  - TO: the Supabase Edge Functions (Deno) mint
  - note: Continue the sentence ('short-lived installation tokens on demand via the GitHub App JWT flow') unchanged; private key in Supabase Vault / Edge Function secrets.
- **REQ-008 AC org-membership nightly reconciliation (line 1013)**
  - FROM: `risk mitigations: audit_events log + nightly reconciliation job + max-membership-lifetime auto-revoke`
  - TO: risk mitigations: audit_events log + a pg_cron → Supabase Edge Function (Deno) org-membership reconciliation job (verifies each active volunteer's ai4good-projects membership/role matches an active assignment; remediates drift via #27's outbox) + a pg_cron max-membership-lifetime auto-revoke sweep; job_runs heartbeats
  - note: MISSED by inventory — distinct from base-permission-assert (1018). Org-MEMBERSHIP drift, not base-permission.
- **REQ-008 AC continuous base-permission invariant (line 1018)**
  - FROM: `an assertion runs continuously (on a short interval + on org-webhook events)`
  - TO: a **pg_cron short-interval schedule → `base-permission-assert` Supabase Edge Function (Deno)** (plus a GitHub org-webhook Edge Function) runs the assertion continuously
  - note: Host-less short-interval job + org-webhook → Edge Functions; remediation via outbox. job_runs ('base_permission_assert').
- **REQ-008 AC App credential rotation (line 1020)**
  - FROM: `rotated on a schedule`
  - TO: rotated on a schedule by a pg_cron → Supabase Edge Function (Deno) (or a documented manual ops runbook); App installation-ID + private key in Supabase Vault / Edge Function secrets
  - note: MISSED by inventory — host-less periodic rotation. Keep the break-glass-runbook clause.
- **REQ-016 inactivity job hourly (line 1756)**
  - FROM: `Inactivity job (hourly) computes inactivity`
  - TO: The hourly aging scan — a **pg_cron → `aging-scan` Supabase Edge Function (Deno)** — computes inactivity
  - note: Host-less hourly merged aging scan → pg_cron→Edge Function. Branches call notify(); 21d release enqueues outbox saga; job_runs heartbeats.
- **REQ-024 AC aging job hourly (line 1444)**
  - FROM: `Aging job runs hourly; fires `blocker_aging_48h` and `blocker_aging_7d_escalation` events.`
  - TO: The blocker branch of the pg_cron → `aging-scan` Supabase Edge Function (Deno) hourly job fires `blocker_aging_48h` / `blocker_aging_7d_escalation` via the shared notify() Deno module; job_runs heartbeat.
  - note: MISSED by inventory — distinct REQ-024 AC. Same merged hourly scan as REQ-027.
- **REQ-024 Task 24.6 aging-blocker hourly cron (line 1455)**
  - FROM: `Task 24.6: Aging-blocker job (hourly cron) + notifications (~5h)`
  - TO: Task 24.6: Aging-blocker branch of the pg_cron → `aging-scan` Supabase Edge Function (Deno) hourly job (merged blocker 48h/7d branch) + notify() + job_runs heartbeat (~5h)
  - note: Host-less 'hourly cron'.
- **REQ-029 AC job_runs cron enumeration (line 1772)**
  - FROM: `every scheduled job (5-min usage poll, daily reconciliation, nightly anomaly/expiry, hourly aging/cadence/inactivity, outbox drain, continuous base-permission assertion, 30-day-alive check) records start/finish; an **overdue-run pager** fires`
  - TO: every scheduled job is a **pg_cron → Supabase Edge Function (Deno)** pair recording a job_runs heartbeat (usage-poller, daily-reconciliation, match-expiry, aging-scan, cadence-pull, outbox-drain, base-permission-assert, deployment-alive-check, control-total); an **overdue-run pager** fires from a pg_cron job_runs watchdog Edge Function
  - note: Enumerates the full cron set whose old host was Vercel cron.
- **REQ-016 EVENT_MAP 14-day Lovable auto-skip (line 2004)**
  - FROM: ``lovable_decision_auto_skipped` (14-day nightly job auto-skip per REQ-021 → NGO + volunteer informational`
  - TO: `lovable_decision_auto_skipped` (14-day auto-skip by a pg_cron → `lovable-setup-autoskip` Supabase Edge Function (Deno) per REQ-021, firing via the shared notify() Deno module → NGO + volunteer informational
  - note: MISSED by inventory — twin of tasks #24 line 310. Host-less nightly job in the EVENT_MAP notify() trigger path.
- **Out of Scope v1.5 AI Proxy edge runtime (line 2812)**
  - FROM: `Built on Cloudflare Workers / Vercel Edge for low-latency global edge presence.`
  - TO: Built on Cloudflare Workers / Supabase Edge Functions (Deno) for low-latency global edge presence. (v1.5, out of scope — no Vercel.)
  - note: Vercel Edge named as v1.5 target. Cloudflare Workers stays.
- **§11 decision-10 rate-limiting Vercel WAF (line 2837)**
  - FROM: `v1 ceiling is a Vercel WAF rule + per-surface caps`
  - TO: v1 ceiling is a Supabase per-IP throttle + Edge Function per-surface caps (Cloudflare WAF if fronting Lovable hosting)
  - note: Vercel WAF asserts a CURRENT v1 mechanism. Keep Discovery-caps/Apply-5min/auth-throttle clauses.
- **§11 decision-10 performance next/image+ISR (line 2844)**
  - FROM: `v1 keeps next/image + ISR + the Supabase pooler.`
  - TO: v1 keeps TanStack Start image handling + SSR-with-HTTP-cache (stale-while-revalidate, in lieu of ISR) + the Supabase pooler.
  - note: next/image + ISR are Next-only and asserted as CURRENT v1.
- **§11 Rank-6 right-size Vercel WAF + next/image+ISR (line 2888)**
  - FROM: `**Rate-limiting/Upstash** (v1 ceiling = a Vercel WAF rule + per-surface caps)`
  - TO: **Rate-limiting/Upstash** (v1 ceiling = a Supabase per-IP throttle + Edge Function per-surface caps; Cloudflare WAF if fronting Lovable)
  - note: SAME LINE also contains 'Performance → keep next/image + ISR + Supabase pooler' — change to 'TanStack Start image handling + SSR-with-HTTP-cache + Supabase pooler' in the same edit.
- **Appendix Phase 1 Task 1.2 scaffold (line 2657)**
  - FROM: `- Task 1.2: Next.js app scaffold (App Router, Tailwind, shadcn/ui) — Small (4h)`
  - TO: - Task 1.2: Scaffold app shell — Lovable creates the TanStack Start (SSR) project + GitHub repo (Tailwind, shadcn/ui) — Small (4h)
  - note: create-next-app/App-Router path removed. See residual_risks re Lovable stack.
- **Appendix Suggested structure item 2 scaffold (line 3238)**
  - FROM: `2. Next.js app scaffold (4h)`
  - TO: 2. Scaffold app shell — Lovable creates the TanStack Start (SSR) project + GitHub repo (4h)
  - note: Second scaffold occurrence.
- **Appendix Phase 2 Task 2.10 server action (line 2682)**
  - FROM: `server action commits initial `tasks.json` to repo on project `in_progress` via GitHub App; REST endpoints `POST /tasks/:task_key/comments`, `POST /blockers`, `GET /context`, `GET /tasks/tasks.json` proxy; per-project bearer-token auth`
  - TO: a Supabase Edge Function (Deno) commits initial `tasks.json` on project `in_progress` via GitHub App; REST endpoints (comments/blockers/context/tasks.json proxy) implemented as Supabase Edge Functions with per-project bearer-token auth
  - note: server action + REST endpoints.
- **Appendix Suggested structure item 18 server action (line 3256)**
  - FROM: `18. Bootstrap-from-Discovery server action + NGO REST API`
  - TO: 18. Bootstrap-from-Discovery Supabase Edge Function (Deno) + NGO REST API (Supabase Edge Functions)
  - note: server action occurrence (item 18).
- **Appendix Phase 2 Task 2.11 webhook receiver + cron (line 2683)**
  - FROM: `GitHub webhook receiver + Postgres projection worker (REQ-026 decision-9 — push event filter, fetch updated `tasks.json`, diff against `project_tasks`, upsert; cron reconciliation for missed webhooks; idempotent via `delivery_id`)`
  - TO: `github-webhook` Supabase Edge Function (Deno) + Postgres projection worker (single ingestPush — push event filter, fetch updated `tasks.json`, diff against `project_tasks`, upsert; pg_cron → `head-sha-reconcile` Edge Function for missed webhooks; idempotent via `delivery_id`)
  - note: MISSED by inventory — webhook receiver (Next route) + host-less cron.
- **Appendix Suggested structure item 19 webhook receiver + cron (line 3257)**
  - FROM: `19. GitHub webhook receiver + Postgres projection worker (REQ-026 decision-9 — push event filter, fetch updated `tasks.json`, diff against `project_`
  - TO: 19. `github-webhook` Supabase Edge Function (Deno) + Postgres projection worker (single ingestPush — push event filter, fetch updated `tasks.json`, diff against `project_tasks`, upsert; pg_cron → head-sha-reconcile Edge Function for missed webhooks; idempotent via delivery_id)
  - note: Mirror of item 2.11; MISSED by inventory.
- **Appendix Phase 2 Task 2.20 control-total nightly + chargeback webhook (line 2692)**
  - FROM: `Task 2.20: Ledger integrity — pair-sum **control-total** nightly job (every entry balances) + Stripe dispute/`chargeback` webhook handler`
  - TO: Task 2.20: Ledger integrity — pair-sum **control-total** pg_cron → Supabase Edge Function (Deno) nightly job (every entry balances) + the `stripe-webhook` Supabase Edge Function handling dispute/`chargeback`
  - note: MISSED by inventory — host-less nightly + 'webhook handler' (Next host). Keep the rest of the cell (chargeback_writeoff/reserve_floor/first_fund_cap).
- **Appendix Suggested structure item 28 control-total nightly + chargeback (line 3266)**
  - FROM: `28. Ledger integrity — pair-sum **control-total** nightly job + Stripe dispute/`chargeback` webhook handler`
  - TO: 28. Ledger integrity — pair-sum **control-total** pg_cron → Supabase Edge Function (Deno) nightly job + the `stripe-webhook` Supabase Edge Function handling dispute/`chargeback`
  - note: Mirror of 2.20; MISSED by inventory.
- **Appendix Phase 4 Task 4.8 performance pass (line 2733)**
  - FROM: `- Task 4.8: Performance pass (caching, edge runtime, image opt) — Medium (8h)`
  - TO: - Task 4.8: Performance pass (SSR-with-HTTP-cache / stale-while-revalidate, TanStack image handling, TanStack Query caching) — Medium (8h)
  - note: 'edge runtime' + 'image opt' are Next/Vercel-sense.
- **REQ-032 signed-URL edge function /api path (line 1817)**
  - FROM: `short-TTL signed URLs minted by an ai4good edge function** (`POST /api/projects/:id/files/:fileId/signed-url`)`
  - TO: short-TTL signed URLs minted by the `sign-project-file` Supabase Edge Function (Deno)** (`POST {SUPABASE_URL}/functions/v1/sign-project-file` with `{projectId, fileId}`)
  - note: MISSED by inventory (distinct from the tasks #73 twin). Keep R2 + 'UI never holds creds' verbatim; drop the /api/ route shape.
- **Open Questions Q2 worker layer options (line 3105)**
  - FROM: `- **Options:** (A) Supabase Edge Fns only, (B) Fly.io worker, (C) Vercel Cron + serverless.`
  - TO: - **Resolved:** Supabase Edge Functions (Deno) + pg_cron for all periodic backend work; Fly.io reserved as an escape hatch only. (Option C Vercel Cron + serverless dropped — platform no longer on Vercel.)
  - note: Mark Q2 resolved; remove the Vercel-Cron option. Also reword the Q2 heading/body framing (line 3102) to past-tense 'Resolved' if it asserts the question is open.
- **Risks table Stripe-webhook-failure mitigation (line 3150)**
  - FROM: `Stripe handles retries; we make webhook handler idempotent; reconciliation job nightly`
  - TO: Stripe handles retries; the `stripe-webhook` Supabase Edge Function is idempotent; a pg_cron nightly reconciliation Edge Function (daily-reconciliation/control-total) catches missed credits
  - note: MISSED by inventory — host-less 'reconciliation job nightly' + 'webhook handler' (Next host).
- **Testing Strategy E2E staging (line 2642)**
  - FROM: `Run on staging on every deploy.`
  - TO: Run against the Lovable preview_url (frontend) + a Supabase staging project (Edge Functions deployed via Supabase CLI), triggered after Lovable deploy_project + Supabase functions deploy / db push (not a single Vercel deploy).
  - note: Implied single Vercel staging. See GLOBAL staging definition in residual_risks.
- **Testing Strategy Security ZAP before launch (line 2644)**
  - FROM: `OWASP ZAP baseline scan before launch.`
  - TO: OWASP ZAP baseline scan before launch against the Supabase staging project (Edge Functions + RLS) behind the Lovable preview_url.
  - note: MISSED by inventory. Keep Snyk/GitHub Advanced Security.
- **Validation Checkpoint 2 works in staging (line 2698)**
  - FROM: `End-to-end happy path works in staging`
  - TO: End-to-end happy path works against the staging environment (Lovable preview_url + Supabase staging project, Edge Functions deployed via Supabase CLI)
  - note: MISSED by inventory — 'works in staging' implies Vercel preview.

### tasks.json (58)

- **Task #1 title (line 6)**
  - FROM: `Initialize Next.js 14 Project with App Router`
  - TO: Scaffold App Shell — Lovable creates the TanStack Start (SSR) project + GitHub repo
  - note: Flagship leftover. App shell created via mcp__lovable__create_project (React 18 + Tailwind + shadcn/ui); Lovable owns + two-way-syncs the repo on main. SEE residual_risks: framework must be requested 
- **Task #1 description (line 7)**
  - FROM: `Set up the foundational Next.js 14 project with App Router, TypeScript, Tailwind CSS, and shadcn/ui component library. Configure the project structure for a marketplace application with proper folder organization.`
  - TO: Stand up the foundational TanStack Start (SSR) project (React 18 + TanStack Router + TanStack Query + Tailwind + shadcn/ui) created and owned by Lovable. Configure the marketplace folder structure (src/routes, components, lib) per Lovable's TanStack Start layout.
  - note: Foundation framework swap.
- **Task #1 details (line 8)**
  - FROM: `Create Next.js 14 project using `npx create-next-app@latest ai4good --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`. Install shadcn/ui with `npx shadcn@latest init`. Configure Tailwind with custom color palette for accessibility (WCAG 2.1 AA compliant). Set up folder structure`
  - TO: Create the project via Lovable create_project (no create-next-app). Install shadcn/ui. Configure Tailwind with custom color palette for accessibility (WCAG 2.1 AA compliant). Routes live under `src/routes` (TanStack Router file-based routing); `src/components` UI, `src/lib` utilities, `src/hooks` hooks, `src/types` interfaces. Install dependencies: `@tanstack/react-query`, `@tanstack/react-router`
  - note: create-next-app, --app, src/app, auth-helpers-nextjs, 'Configure Next.js for Edge runtime' all removed. auth-helpers-nextjs → @supabase/ssr.
- **Task #1 testStrategy (line 9)**
  - FROM: `Verify project builds without errors. Run `npm run dev` and confirm hot reload works. Verify Tailwind styles apply correctly. Test shadcn/ui Button component renders properly.`
  - TO: Verify the Lovable-created TanStack Start project builds and the Lovable preview_url renders. Clone locally, run the TanStack Start dev server, confirm HMR. Verify Tailwind + shadcn/ui Button render. CONFIRM via Lovable get_project/list_template_projects that the scaffold is actually TanStack Start SSR before depending on it.
  - note: Add the verification of the actual emitted stack (residual_risks).
- **Task #3 description (line 31)**
  - FROM: `Implement authentication flows and session management using @supabase/auth-helpers-nextjs.`
  - TO: Implement authentication flows and session management using @supabase/ssr with TanStack Start server-side session handling.
  - note: Deprecated Next auth helper.
- **Task #3 details (line 32)**
  - FROM: `Create `src/lib/supabase/client.ts` for browser client and `src/lib/supabase/server.ts` for server components using `createServerClient`. Implement middleware.ts for session refresh. Create auth routes: `app/auth/callback/route.ts` for OAuth callbacks, `app/auth/confirm/route.ts` for email confirmat`
  - TO: Create `src/lib/supabase/client.ts` (createBrowserClient) and `src/lib/supabase/server.ts` (createServerClient) via @supabase/ssr. Replace Next middleware.ts session refresh with TanStack Start server middleware (beforeLoad / server handler). Implement OAuth callback + email confirm as Supabase Edge Functions (auth-callback, auth-confirm) or TanStack Start server routes — not app/*/route.ts.
  - note: server components, middleware.ts, app/auth/*/route.ts.
- **Task #8 description (line 100)**
  - FROM: `Set up Sentry error tracking, structured logging to Axiom/Logflare, and Vercel Analytics for performance monitoring per NFR Observability.`
  - TO: Set up Sentry error tracking, structured logging to Axiom/Logflare, and Lovable analytics + Supabase logs for performance monitoring per NFR Observability.
  - note: Vercel Analytics.
- **Task #8 details (line 101)**
  - FROM: `Install `@sentry/nextjs` and run `npx @sentry/wizard@latest -i nextjs`. Configure Sentry DSN in environment variables. Set up source maps upload in sentry.config.js. Create `src/lib/logger.ts` with structured logging using pino that outputs JSON. Configure Axiom or Logflare integration via Next.js l`
  - TO: Install `@sentry/react` (client) + `@sentry/node` (Edge Functions); wire Sentry into the TanStack Start client + Supabase Edge Functions. Configure Sentry DSN in environment variables / Edge Function secrets. Create `src/lib/logger.ts` with structured JSON logging (pino). Route structured logs to Axiom/Logflare from Edge Functions + Supabase logs. Replace the Vercel Analytics script with Lovable a
  - note: @sentry/nextjs + wizard + 'Next.js logging' + 'Vercel Analytics script'.
- **Task #8 testStrategy (line 102)**
  - FROM: `Verify Vercel Analytics collecting data.`
  - TO: Verify Lovable analytics / Supabase logs are collecting data.
  - note: Keep surrounding Sentry/Axiom/error-boundary assertions.
- **Task #5 details (line 58)**
  - FROM: `Create `app/(dashboard)/ngo/profile/page.tsx` with form fields`
  - TO: Create the TanStack Start route `src/routes/dashboard/ngo/profile.tsx` (via Lovable MCP) with form fields
  - note: App-Router path. ALSO change later in this detail: 'Create server action for document submission that updates ngos.verification_state' → 'call a Supabase Edge Function (submit-verification-doc) that u
- **Task #6 details (line 72)**
  - FROM: `Build `app/(dashboard)/volunteer/profile/page.tsx` with skill tag input`
  - TO: Build the TanStack Start route `src/routes/dashboard/volunteer/profile.tsx` (via Lovable MCP) with skill tag input
  - note: App-Router path. Move the GitHub /users + /repos enrichment into a Supabase Edge Function (github-profile-import); UI never calls GitHub/DB directly.
- **Task #7 details (line 87)**
  - FROM: `Create `app/(admin)/verification-queue/page.tsx` restricted to platform_admin role.`
  - TO: Create the TanStack Start route `src/routes/admin/verification-queue.tsx` (via Lovable MCP) restricted to platform_admin role.
  - note: App-Router path. Implement approve/reject/request-changes through a Supabase Edge Function (review-verification) that mutates ngos.verification_state + writes audit_events.
- **Task #9 details (line 114)**
  - FROM: `Build `app/(dashboard)/ngo/projects/new/page.tsx` with form`
  - TO: Build the TanStack Start route `src/routes/dashboard/ngo/projects/new.tsx` (via Lovable MCP) with form
  - note: App-Router path. ALSO: 'Implement autosave every 5 seconds using debounced server action' → 'debounced autosave calling a Supabase Edge Function (save-project-draft) every 5s'; UI never writes project
- **Task #10 details (line 128)**
  - FROM: `Implement streaming responses via Server-Sent Events. Build chat UI at `app/(dashboard)/ngo/projects/[id]/discovery/page.tsx`.`
  - TO: Move the Anthropic Discovery agent + SSE streaming into a Supabase Edge Function (discovery-stream, Deno — Deno natively supports SSE). Build chat UI as the TanStack Start route `src/routes/dashboard/ngo/projects/$id/discovery.tsx` (via Lovable MCP), consuming the Edge Function's SSE stream.
  - note: App-Router dynamic path + SSE Next endpoint. #74 reuses this discovery-stream Edge Function.
- **Task #11 details (line 142)**
  - FROM: `Create `app/(dashboard)/ngo/projects/[id]/scope/page.tsx`.`
  - TO: Create the TanStack Start route `src/routes/dashboard/ngo/projects/$id/scope.tsx` (via Lovable MCP).
  - note: App-Router path. ALSO: 'Implement save functionality via server action' → 'save + publish-to-triage via a Supabase Edge Function (save-scope / publish-scope)'.
- **Task #12 details (line 157)**
  - FROM: `Create `app/(admin)/triage/page.tsx` with queue sorted by triage_submitted_at ASC.`
  - TO: Create the TanStack Start route `src/routes/admin/triage.tsx` (via Lovable MCP) with queue sorted by triage_submitted_at ASC.
  - note: App-Router path. Triage approve/reject/request-changes via a Supabase Edge Function (decide-triage) writing the transition + audit_events + notify().
- **Task #13 details (line 171)**
  - FROM: `Build `app/api/stripe/checkout/route.ts` POST handler that creates Checkout Session with: line_items, mode='payment', success_url, cancel_url, metadata (ngo_id, project_id). Add idempotency_key per checkout attempt. Create `app/(dashboard)/ngo/projects/[id]/fund/page.tsx` with funding form`
  - TO: Implement the Stripe Checkout Session creation as a Supabase Edge Function (stripe-checkout, Deno) with: line_items, mode='payment', success_url, cancel_url, metadata (ngo_id, project_id), idempotency_key per checkout attempt. Build the fund page as the TanStack Start route `src/routes/dashboard/ngo/projects/$id/fund.tsx` (via Lovable MCP) that calls the Edge Function.
  - note: app/api/.../route.ts + App-Router dynamic page.
- **Task #14 details (line ~183)**
  - FROM: `(implied: Stripe checkout.session.completed webhook handler runtime unnamed)`
  - TO: Add to details: implemented as a Supabase Edge Function (stripe-webhook, Deno) verifying the Stripe signature; the outbox enqueue path is shared with #21/#27. testStrategy unchanged (Stripe CLI → the deployed Edge Function URL).
  - note: Implied Next webhook host; pin to Edge Function. No literal-string deletion needed — append the runtime clause.
- **Task #18 title (line 239)**
  - FROM: `Bootstrap PM Tree as a Server-Side Git Commit`
  - TO: Bootstrap PM Tree as an Edge-Function Git Commit
  - note: 'Server-Side' implies Next runtime. Add to details: implemented as a Supabase Edge Function (bootstrap-pm-tree, Deno), invoked on the in_progress transition (DB trigger/webhook), authoring the first t
- **Task #19 details (line 254)**
  - FROM: `Build app/api/webhooks/github/route.ts for push events on ai4good-projects/*. Verify HMAC once`
  - TO: Build the `github-webhook` Supabase Edge Function (Deno) for push events on ai4good-projects/*. Verify HMAC once
  - note: Next route handler. ALSO in same detail: 'Add a low-frequency HEAD-SHA reconciliation cron (pg_cron/Vercel Cron)' → 'Add a low-frequency HEAD-SHA reconciliation job scheduled by pg_cron → Edge Functio
- **Task #20 details (line 265)**
  - FROM: `(implied: UsageMeteringProvider write methods + twice-daily ops_task scheduler runtime unnamed)`
  - TO: Add: the UsageMeteringProvider write methods (createWorkspace, createKey, deactivateKey, reactivateKey) run inside Supabase Edge Functions (Deno); the twice-daily key-creation ops_task enqueue is pg_cron-scheduled → Edge Function.
  - note: Implied host; append clause, no literal deletion.
- **Task #21 details (line 278)**
  - FROM: `Cursored idempotent usage poller (usage_poll_state cursor + per-consumption-bucket unique index + job_runs heartbeat)`
  - TO: Cursored idempotent usage poller as a Supabase Edge Function (usage-poller, Deno) on a pg_cron schedule (usage_poll_state cursor + per-consumption-bucket unique index + job_runs heartbeat)
  - note: Host-less periodic poller; pin to pg_cron→Edge Function.
- **Task #23 details (line 292)**
  - FROM: `NGO can append task_comments + raise blockers (REST); cannot edit task content/status.`
  - TO: Project page = TanStack Start route `src/routes/projects/$id.tsx` (via Lovable MCP); reads via @supabase/ssr + Supabase Realtime. NGO can append task_comments + raise blockers via Supabase Edge Functions (project-comments / raise-blocker), not in-app REST routes; cannot edit task content/status. UI writes only through Edge Functions.
  - note: App-Router page + in-app REST append → Edge Function.
- **Task #24 details (line 310)**
  - FROM: `Create Lovable Setup page at `/projects/[id]/lovable-setup` with: scope summary copy button, MCP server URL copy, workspace token reveal`
  - TO: Create the Lovable Setup page as the TanStack Start route `src/routes/projects/$id/lovable-setup.tsx` (via Lovable MCP) with: scope summary copy button, MCP server URL copy, workspace token reveal
  - note: App-Router dynamic path. ALSO: '14-day nightly job auto-skips undecided' → '14-day auto-skip via a pg_cron → Supabase Edge Function (lovable-setup-autoskip)'. Keep the Lovable-MCP orchestration conten
- **Task #25 details (line 321)**
  - FROM: `schedule 30-day-alive check) and Reject with comments`
  - TO: the 30-day-alive check is a pg_cron → Supabase Edge Function (deployment-alive-check)) and Reject with comments
  - note: Handoff Accept/Reject via a Supabase Edge Function (decide-handoff) doing the transition + credit_release; UI writes only via Edge Functions. (Track-B free-tier host examples are NON-GOALS — leave ver
- **Task #27 details (line 354)**
  - FROM: `Keep outbox_events table + SELECT FOR UPDATE SKIP LOCKED drain on pg_cron.`
  - TO: Keep outbox_events table + a SELECT FOR UPDATE SKIP LOCKED drain in a Supabase Edge Function (outbox-drain, Deno) invoked by pg_cron (~1m); the handler registry runs inside it. Match-expiry stays a pg_cron DB-only nightly transition.
  - note: Already pg_cron, but drain WORKER + registry runtime unnamed.
- **Task #28 details (line 367)**
  - FROM: `Build nightly cron that: (1) Balance control total`
  - TO: Build a pg_cron-scheduled nightly job that invokes a Supabase Edge Function (control-total, Deno) which: (1) Balance control total
  - note: Host-less 'nightly cron'. Keep the rest; add job_runs heartbeat.
- **Task #29 details (line 377)**
  - FROM: `Detection cron verifies every active volunteer holds exactly their project's repo role`
  - TO: Detection runs as a pg_cron → Supabase Edge Function (base-permission-assert, Deno) that verifies every active volunteer holds exactly their project's repo role
  - note: Host-less 'Detection cron'; remediation enqueues #27 outbox or idempotent PATCH /orgs inline from the Edge Function.
- **Task #30 details (line 390)**
  - FROM: `Create 30-day-alive check cron job that pings deployment_url and records result.`
  - TO: Create a pg_cron-scheduled deployment-alive-check Supabase Edge Function (Deno) that pings deployment_url and records the result + job_runs heartbeat.
  - note: Host-less 'cron job'. (Track-B free-tier host examples are NON-GOALS.)
- **Task #32 details (line 417)**
  - FROM: `Create `app/(dashboard)/ngo/page.tsx`.`
  - TO: Create the TanStack Start route `src/routes/dashboard/ngo/index.tsx` (via Lovable MCP).
  - note: App-Router dashboard path. Aggregation reads via @supabase/ssr (RLS) or an ngo-dashboard Edge Function; writes only via Edge Functions.
- **Task #33 details (line 431)**
  - FROM: `Create `app/(dashboard)/volunteer/page.tsx`.`
  - TO: Create the TanStack Start route `src/routes/dashboard/volunteer/index.tsx` (via Lovable MCP).
  - note: App-Router path. The Anthropic-key reveal is minted by a Supabase Edge Function (reveal-anthropic-key) reading Vault — UI never reads Vault directly.
- **Task #34 details (line 445)**
  - FROM: `Project-page comment-stream UI: load on page open + post (NO Realtime); posting emits notify(...,'project_comment') to the other party.`
  - TO: Render the comment stream in the TanStack Start project route (via Lovable MCP): load on page open + post (NO Realtime). The post action calls a Supabase Edge Function (post-project-comment) that inserts task_comments + calls the shared notify() Deno module; UI writes only through Edge Functions.
  - note: Implied App-Router page + server-action post.
- **Task #35 details (line 459)**
  - FROM: `notify(recipientIds, event_type, payload) is the sole writer of `notifications``
  - TO: notify(recipientIds, event_type, payload) is a shared Deno module under supabase/functions/_shared/notify.ts, imported by every Edge Function as the sole writer of `notifications`
  - note: Implied Next server module → shared Deno module. Email via one Resend call from Deno; in-app via Supabase Realtime.
- **Task #36 details (line 473)**
  - FROM: `Display badge on volunteer public profile at `/volunteers/[handle]`.`
  - TO: Display badge on the volunteer public profile = TanStack Start route `src/routes/volunteers/$handle.tsx` (via Lovable MCP).
  - note: App-Router dynamic path. Badge-award write runs inside the handoff-accept Edge Function (#25).
- **Task #37 details (line 487)**
  - FROM: `Build `app/(admin)/audit/page.tsx` restricted to platform_admin.`
  - TO: Build the TanStack Start route `src/routes/admin/audit.tsx` (via Lovable MCP) restricted to platform_admin.
  - note: App-Router path. CSV export via a Supabase Edge Function (export-audit-csv).
- **Task #38 details (line 501)**
  - FROM: `Build admin dashboard at `/admin/observability``
  - TO: Build the observability dashboard = TanStack Start route `src/routes/admin/observability.tsx` (via Lovable MCP)
  - note: App-Router page. The job_runs heartbeat monitor itself runs as a pg_cron → Edge Function; all named jobs are pg_cron Edge Functions. Keep PagerDuty.
- **Task #39 details (line 515)**
  - FROM: `Build `app/(admin)/ops/incidents/page.tsx` for incident commander entry.`
  - TO: Build the ops console = TanStack Start route `src/routes/admin/ops/incidents.tsx` (via Lovable MCP) for incident commander entry.
  - note: App-Router path. Money corrections (paired rows) post through a Supabase Edge Function (post-ledger-correction) — never a direct UI ledger write.
- **Task #41 details (line 542)**
  - FROM: `Single hourly handler, three isolated branches`
  - TO: Single hourly handler = a pg_cron → Supabase Edge Function (hourly-aging / aging-scan, Deno) with a job_runs heartbeat; three isolated branches
  - note: Host-less 'single hourly handler'. Branches call shared notify(); 21d saga enqueues #27 outbox handlers.
- **Task #42 details (line 556)**
  - FROM: `a daily scan HARD-RESETS to the tier grant at 00:00 UTC with NO rollover`
  - TO: a pg_cron daily scan (optionally → a reset-discovery-credits Edge Function or pure SQL) HARD-RESETS to the tier grant at 00:00 UTC with NO rollover
  - note: Host-less 00:00 UTC daily scan. Per-turn credit accounting stays in discovery-stream Edge Function (#10). Credit math is NOT a leftover.
- **Task #43 details (line 571)**
  - FROM: `fuel-poller + Lovable auto-raise hooks; project-page badge + panel`
  - TO: fuel-poller + Lovable auto-raise hooks; project-page badge + panel rendered in the TanStack Start project route (via Lovable MCP); Raise/Resolve call a Supabase Edge Function (raise-blocker / resolve-blocker) that writes project_blockers + calls notify(); UI writes only through Edge Functions
  - note: Implied App-Router UI + server-action raise/resolve.
- **Task #44 details (line 585)**
  - FROM: `on Accept, call #26's server-side bootstrap-commit path to add a`
  - TO: the 'Request a Change' form = TanStack Start route (via Lovable MCP); Request/Accept/Decline call a Supabase Edge Function (change-request) that emits notify() and, on Accept, invokes the bootstrap-commit Edge Function (#18) via the GitHub App to add a
  - note: server-side bootstrap-commit → Edge Function.
- **Task #15 details (line 198)**
  - FROM: `Create `app/marketplace/page.tsx` as a public route.`
  - TO: Create the TanStack Start route `src/routes/marketplace.tsx` as a public route (via Lovable MCP).
  - note: MISSED by inventory (task #15 absent). Reads via @supabase/ssr (RLS) or a marketplace-list Edge Function with SSR-with-HTTP-cache to hold the <500ms p95; skill/cause overlap computed server-side.
- **Task #16 details (line 213)**
  - FROM: `Create `app/(dashboard)/ngo/projects/[id]/applicants/page.tsx` showing pending applications with volunteer profile preview.`
  - TO: Create the TanStack Start route `src/routes/dashboard/ngo/projects/$id/applicants.tsx` (via Lovable MCP) showing pending applications with volunteer profile preview.
  - note: MISSED by inventory (task #16 absent). Apply/Accept/Decline call a Supabase Edge Function (apply-to-project / decide-application) that writes project_applications, does the transition + auto-decline s
- **Task #26 details (line 338)**
  - FROM: `Session bootstrap calls REST GET /api/projects/:id/context (no MCP server to register). Slash commands: /ai4good:next-task (local task-master), /ai4good:fuel + /ai4good:blockers + /ai4good:raise-blocker (REST)`
  - TO: Session bootstrap calls the ai4good Supabase Edge Function GET {ai4good_api_base}/projects/:id/context (Edge Functions base per REQ-028 ai4good_api_base; no MCP server to register). Slash commands: /ai4good:next-task (local task-master), /ai4good:fuel + /ai4good:blockers + /ai4good:raise-blocker calling the Supabase Edge Functions under /functions/v1/projects/:id/{context,blockers}
  - note: MISSED by inventory (no tasks.json #26 entry). Keep .ai4good/config.json {project_id, ai4good_api_base}; ensure ai4good_api_base resolves to the Edge Functions base URL.
- **Task #48 details (line 601)**
  - FROM: `Set up GitHub Actions workflow: run lint, type-check, test on PR. Add Codecov integration for coverage reporting.`
  - TO: Set up GitHub Actions workflow (test/lint only — framework-agnostic): run lint, type-check, test on PR. Integration tests run against Supabase local Edge Functions (supabase functions serve) + the TanStack Start app; seed via Supabase local. No Vercel deploy step (deploy = Lovable deploy_project + Supabase CLI functions deploy / db push). Add Codecov integration.
  - note: GitHub Actions for test/lint is a NON-GOAL (keep). Re-point the test harness to Edge Functions + TanStack Start.
- **Task #49 details (line 615)**
  - FROM: `Configure playwright.config.ts with staging environment. ... Run on staging environment with test data isolation. Integrate with GitHub Actions to run on deploy to staging.`
  - TO: Configure playwright.config.ts to target the staging environment = Lovable preview_url (frontend) + a Supabase staging project with deployed Edge Functions. ... Run with test-data isolation. Trigger E2E after Lovable deploy_project + Supabase functions deploy (not a Vercel deploy).
  - note: Playwright is a NON-GOAL (keep). ALSO Task #49 testStrategy (line ~616/619): 'Run E2E suite against staging' → inherits the GLOBAL staging definition.
- **Task #50 details (line 628)**
  - FROM: `Run OWASP ZAP baseline scan against staging environment.`
  - TO: Run OWASP ZAP baseline scan against the staging deployment — the Lovable preview_url (TanStack Start) fronting a Supabase staging project with deployed Edge Functions + RLS (provisioned via Lovable deploy_project + Supabase CLI functions deploy / db push, not a single Vercel staging deploy).
  - note: MISSED by inventory. ZAP/Snyk are NON-GOALS (keep); only re-point staging.
- **Task #53 title (line 668)**
  - FROM: `Performance — next/image + ISR + Supabase pooler (v1)`
  - TO: Performance — TanStack image handling + SSR-with-HTTP-cache + Supabase pooler (v1)
  - note: next/image + ISR are Next-only.
- **Task #53 description (line 670)**
  - FROM: `Rank-6 right-size — v1 keeps next/image + Next ISR revalidate + Supabase connection pooler.`
  - TO: Rank-6 right-size — v1 keeps TanStack Start image handling + SSR-with-HTTP-cache (stale-while-revalidate) + Supabase connection pooler.
  - note: Keep the deferred-to-v1.5 clause.
- **Task #53 details (line 671)**
  - FROM: `next/image optimization; Next ISR with revalidate on marketplace/project pages; Supabase transaction pooler.`
  - TO: TanStack Start image handling (optimized loader); SSR-with-HTTP-cache (cache-control / stale-while-revalidate, in lieu of ISR revalidate) on marketplace/project routes; Supabase transaction pooler.
  - note: next/image + Next ISR revalidate.
- **Task #53 testStrategy (line 672)**
  - FROM: `Run k6 load test, verify p95 < 500ms at 100 RPS. Verify cache hits for repeated requests. Run Lighthouse, achieve score > 90 for Performance.`
  - TO: Run k6 load test, verify p95 < 500ms at 100 RPS under TanStack Start SSR + HTTP caching. Verify SSR-cache hits for repeated marketplace/project requests. Run Lighthouse, score > 90.
  - note: Cache-hit assertion implicitly tests ISR; re-validate p95 under TanStack Start. NOTE: this is the REAL tasks.json line 672 — NOT a 'Nightly job' state-machine table (the misfiled inventory entry is dr
- **Task #54 details (line 681)**
  - FROM: `Create `/help` route with markdown-based content`
  - TO: Create the TanStack Start route `src/routes/help.tsx` (via Lovable MCP) with markdown-based content
  - note: Implied App-Router route. Resend templates unaffected.
- **Task #55 details (line 694)**
  - FROM: `Create `app/page.tsx` as the public landing page.`
  - TO: Create the landing page = TanStack Start index route `src/routes/index.tsx` (via Lovable MCP).
  - note: App-Router root page. Waitlist email-capture posts to a Supabase Edge Function (waitlist-signup).
- **Task #59 details (line 722)**
  - FROM: `Document architecture: Cloudflare Workers / Vercel Edge deployment, request flow from Claude Code → proxy → Anthropic.`
  - TO: Document architecture: Cloudflare Workers / Supabase Edge Functions (Deno) deployment, request flow from Claude Code → proxy → Anthropic.
  - note: 'Vercel Edge' deploy target. Cloudflare Workers stays.
- **Task #73 details (line 900)**
  - FROM: `ALL access via short-TTL signed URLs minted by an ai4good edge function POST /api/projects/:id/files/:fileId/signed-url that re-checks membership + visibility`
  - TO: ALL access via short-TTL signed URLs minted by a Supabase Edge Function (sign-project-file, Deno) — POST {SUPABASE_URL}/functions/v1/sign-project-file with {projectId,fileId} — that re-checks membership + visibility
  - note: In-app /api route shape despite 'edge function'. R2 + 'never hold creds' kept; upload UI = TanStack Start routes via Lovable MCP.
- **Task #74 details (line 915)**
  - FROM: `chat calls an edge function, never the DB directly.`
  - TO: chat reuses the discovery-stream Supabase Edge Function (#10) with mode='assistant' (read-only context assembler, no write tools); per-turn fuel debit written from that Edge Function; never the DB directly.
  - note: Mostly correct; align with #10's Edge-Function rewrite.
- **Task #75 details (line 931)**
  - FROM: `Stack: Next.js 14 App Router + Tailwind + shadcn/ui primitives (Card, Table, Tabs, Dialog/Sheet, Badge, Progress, Toast, Command...).`
  - TO: Stack: TanStack Start (SSR, React 18) + TanStack Router + Tailwind + shadcn/ui primitives (Card, Table, Tabs, Dialog/Sheet, Badge, Progress, Toast, Command...).
  - note: Design-system anchor — seeds the framework into all 25 UI tasks. Keep the trailing 'Per CLAUDE.md … via an edge function' clause.
- **DROP — misfiled duplicate inventory entry (file=tasks.json, 'Task #16 application-state-machine table line 672, Nightly **
  - FROM: `(inventory entry asserting this text lives at tasks.json line 672)`
  - TO: DELETE this inventory entry — broken pointer. tasks.json:672 is Task #53's k6/Lighthouse testStrategy. The 'Nightly job runs after fuel_deadline_at' text exists ONLY in prd.md:672 (covered by the REQ-005.5 prd.md edit above). tasks.json's match-expiry host is Task #27 (line 354, covered).
  - note: Coherence-verifier finding: do NOT attempt an edit at tasks.json:672 for a 'Nightly job' — it would target the wrong line.

### design (4)

- **design-brief.md §5 Tech mapping (lines 49-50, wraps)**
  - FROM: `Build stack: **Next.js 14 App Router + Tailwind CSS + shadcn/ui**; Track-A apps deploy
  on **Lovable**; data on **Supabase**; payments via **Stripe Checkout**.`
  - TO: Build stack: **TanStack Start (SSR) — React 18 + Tailwind CSS + shadcn/ui** (TanStack Router + TanStack Query; Lovable owns the frontend repo); heavy backend = **Supabase Edge Functions (Deno) + pg_cron** hand-written by Claude Code; Track-A apps deploy
  on **Lovable**; data on **Supabase**; payments via **Stripe Checkout**.
  - note: Replace only the framework clause; Tailwind/shadcn/Lovable/Supabase/Stripe kept verbatim. Physical line wrap — match both lines.
- **claude-md-augmentation.md session bootstrap (line 28)**
  - FROM: `**Session bootstrap:** REST `GET /api/projects/:id/context` primes scope summary, blockers, fuel runway, recent NGO comments. Banner shows on start.`
  - TO: **Session bootstrap:** the Skill calls the ai4good **Supabase Edge Function** `GET {AI4GOOD_API_BASE}/projects/:id/context` (Edge Functions base per REQ-028 `ai4good_api_base`) to prime scope summary, blockers, fuel runway, recent NGO comments. Banner shows on start.
  - note: Paste-ready block seeded into every project repo CLAUDE.md — propagates if not fixed.
- **claude-md-augmentation.md enforcement-split context fetch (line 63)**
  - FROM: `Session bootstrap + project context fetch (REST `GET /api/projects/:id/context`) on Claude Code launch`
  - TO: Session bootstrap + project context fetch via the ai4good **Supabase Edge Function** (`GET {AI4GOOD_API_BASE}/projects/:id/context`) on Claude Code launch
  - note: Second occurrence — keep consistent with line 28.
- **claude-md-augmentation.md LOUD/QUIET table raise-blocker (line 39)**
  - FROM: `| `/ai4good:raise-blocker --task=X` (REST → `project_blockers`) | banner + email + 48h / 7d aging |`
  - TO: | `/ai4good:raise-blocker --task=X` (Supabase Edge Function → `project_blockers`) | banner + email + 48h / 7d aging |
  - note: Write-side of the same REST surface; re-host the implicit runtime only.

## Full leftover inventory (raw)

| # | file | category | anchor | exact_text | → replacement |
|---|---|---|---|---|---|
| 1 | prd.md | framework | Technology Stack — Frontend (~line 2608) | **Frontend:** Next.js 14 (App Router, Server Components, Server Action | **Frontend:** TanStack Start (SSR) — React 18, TanStack Router + TanStack Query, |
| 2 | prd.md | framework | Technology Stack — Backend (~line 2609) | **Backend:** Next.js Route Handlers (Node + Edge), Supabase Postgres,  | **Backend:** Supabase Edge Functions (Deno) for webhooks / mutations / REST / SS |
| 3 | prd.md | infra-deploy | Technology Stack › Infra line (~line 2614): "Infra: Vercel ( | - **Infra:** Vercel (app), Supabase (data + auth), Upstash Redis (rate | - **Infra:** Lovable hosting (frontend, TanStack Start SSR), Supabase (data + au |
| 4 | prd.md | infra-deploy | Technology Stack › Observability line (~line 2615): "...Verc | - **Observability:** Sentry (errors), Axiom or Logflare (logs), Vercel | - **Observability:** Sentry (errors), Axiom or Logflare (logs), Lovable analytic |
| 5 | prd.md | infra-deploy | Technology Stack › CI/CD line (~line 2616): "CI/CD: GitHub A | - **CI/CD:** GitHub Actions → Vercel. | - **CI/CD:** GitHub Actions for test/lint; deploy = Lovable `deploy_project` (fr |
| 6 | prd.md | framework | System Architecture diagram — Next.js App (Vercel) (~lines 2 | │   Next.js App         │ │   (Vercel)            │ | Replace the box with 'Lovable app — TanStack Start (SSR)' for the frontend; add  |
| 7 | prd.md | framework | Key Components item 1 (~line 2181): "Next.js 14 App (Vercel) | 1. **Next.js 14 App (Vercel):** Server Components + Server Actions for | 1. **Lovable App — TanStack Start (SSR):** SSR loaders + TanStack Query for read |
| 8 | prd.md | framework | NFR › Performance › Response Time (~line 2068): "Marketplace |   - Marketplace page: < 500ms p95 (with Next.js streaming). |   - Marketplace page: < 500ms p95 (with TanStack Start SSR streaming + Lovable e |
| 9 | prd.md | infra-deploy | NFR › Performance › Throughput (~line 2073): "...well within |   - Up to 1000 concurrent marketplace viewers in year 1 (well within V |   - Up to 1000 concurrent marketplace viewers in year 1 (well within Lovable hos |
| 10 | prd.md | infra-deploy | NFR › Performance › Resource Usage (~line 2076): "Stay withi |   - Stay within Vercel Pro + Supabase Pro tier for year 1 (~$45/mo). |   - Stay within Lovable Pro ($25/mo) + Supabase Pro tier for year 1 (~$70/mo); r |
| 11 | prd.md | infra-deploy | NFR › Security › Secrets (~line 2082): "...stored in Supabas | - **Secrets:** All API keys (Stripe, Anthropic, GitHub) stored in Supa | - **Secrets:** All API keys (Stripe, Anthropic, GitHub) stored in Supabase Vault |
| 12 | prd.md | framework | NFR › Scalability › Horizontal scaling (~line 2095): "Vercel | - **Horizontal scaling:** Vercel auto-scaling for the Next.js app; Sup | - **Horizontal scaling:** Lovable hosting auto-scales the TanStack Start SSR fro |
| 13 | prd.md | api-route | API Specifications — Discovery Agent Start (~line 2192) | POST /api/discovery/start Auth: Bearer <Supabase JWT>  (ngo_admin) | Supabase Edge Function `discovery-start` (Deno): POST https://<project>.supabase |
| 14 | prd.md | api-route | API Specifications — Discovery Agent Continue / SSE (~line 2 | POST /api/discovery/{conversationId}/message Body: { "content": "We us | Supabase Edge Function `discovery-message` (Deno) streaming SSE via a ReadableSt |
| 15 | prd.md | api-route | API Specifications — Stripe Webhook (~line 2217), REQ-006 | POST /api/webhooks/stripe Headers: Stripe-Signature | Supabase Edge Function `stripe-webhook` (Deno): POST /functions/v1/stripe-webhoo |
| 16 | prd.md | api-route | API Specifications — GitHub Webhook (~line 2229), REQ-008/RE | POST /api/webhooks/github Headers: X-Hub-Signature-256, X-GitHub-Event | Supabase Edge Function `github-webhook` (Deno): POST /functions/v1/github-webhoo |
| 17 | prd.md | implied | REQ-026 dev-side bootstrap (~line 1572), Acceptance Criteria | On project `in_progress` transition, the **bootstrap-from-Discovery se | Supabase Edge Function `bootstrap-from-discovery` (Deno), invoked on the matched |
| 18 | prd.md | framework | REQ-026 Task Breakdown Hint Task 26.2 (~line 1655): "Bootstr | Task 26.2: **Bootstrap-from-Discovery server action** — read scope doc | Task 26.2: Bootstrap-from-Discovery Supabase Edge Function (Deno) — read scope d |
| 19 | prd.md | api-route | REQ-026 REST endpoints block (~lines 1573-1574, 1630-1631, 1 | REST endpoints (`POST /api/projects/:id/tasks/:task_key/comments`, `PO | Re-host all `/api/projects/:id/*` endpoints (comments, blockers, context, export |
| 20 | prd.md | api-route | REQ-028 Skill slash-command REST calls (~lines 1693-1696, 17 | `/ai4good:fuel` → calls `GET /api/projects/:id/context` (REST) ... `/a | Update the Skill's REST targets to the Supabase Edge Functions base (`/functions |
| 21 | prd.md | infra-deploy | Open Questions / Q2 — line ~3102-3105: "Q2: Worker layer — S | - **Options:** (A) Supabase Edge Fns only, (B) Fly.io worker, (C) Verc | Mark Q2 RESOLVED: worker layer = Supabase Edge Functions (Deno) scheduled via pg |
| 22 | prd.md | infra-deploy | System Architecture Background Workers box (~line 2164) + Ke | │  Background Workers            │ │  (Supabase Edge Fns / Fly.io)  │  | State the worker layer as resolved: Supabase Edge Functions (Deno) scheduled by  |
| 23 | prd.md | framework | Appendix › Phase 1 task list (~line 2657) + Suggested Taskma | - Task 1.2: Next.js app scaffold (App Router, Tailwind, shadcn/ui) — S | Both occurrences → "Scaffold app shell — Lovable creates the TanStack Start (SSR |
| 24 | prd.md | framework | Appendix › Phase 2 Task 2.10 (~line 2682) + Suggested struct | Task 2.10: **Bootstrap-from-Discovery + NGO REST API** (REQ-026 decisi | Both → "Bootstrap-from-Discovery Supabase Edge Function (Deno) commits initial t |
| 25 | prd.md | framework | Appendix › Phase 4 Task 4.8 (~line 2733): "Performance pass  | - Task 4.8: Performance pass (caching, edge runtime, image opt) — Medi | Task 4.8: Performance pass (SSR-with-cache / Lovable edge caching, TanStack imag |
| 26 | prd.md | framework | §11 Out-of-Scope decision row 24, Upstash-cache bullet (~lin | **Upstash cache + k6/Lighthouse CI gates** (performance right-size) —  | Rewrite to: "v1 keeps TanStack Start image handling + SSR-with-cache (Lovable ed |
| 27 | prd.md | infra-deploy | §11 Out-of-Scope decision row 24, Rate-limiting bullet (~lin | **Rate-limiting / Upstash** (task #47, removed) — v1 ceiling is a Verc | Replace "Vercel WAF rule" with a Lovable/Supabase-native ceiling — e.g. Supabase |
| 28 | prd.md | implied | NFR › Performance › throughput note also references Anthropi |   - Up to 50 concurrent discovery conversations (Anthropic API quota-b | No change. (Boundary note: only the sibling "Vercel + Supabase free/pro tiers" l |
| 29 | prd.md | infra-deploy | NFR Performance / Response Time — line ~2068: "Marketplace p | Marketplace page: < 500ms p95 (with Next.js streaming). | Marketplace page: < 500ms p95 (with TanStack Start SSR streaming + Lovable edge  |
| 30 | prd.md | infra-deploy | NFR Throughput — line ~2073: "Up to 1000 concurrent marketpl | Up to 1000 concurrent marketplace viewers in year 1 (well within Verce | Up to 1000 concurrent marketplace viewers in year 1 (well within Lovable hosting |
| 31 | prd.md | infra-deploy | NFR Resource Usage — line ~2076: "Stay within Vercel Pro + S | Stay within Vercel Pro + Supabase Pro tier for year 1 (~$45/mo). | Stay within Lovable Pro ($25/mo) + Supabase Pro tier for year 1 (~$50/mo). (Lova |
| 32 | prd.md | infra-deploy | NFR Security — Secrets (~line 2082) | All API keys (Stripe, Anthropic, GitHub) stored in Supabase Vault / Ve | Store all API keys in Supabase Vault + Supabase Edge Function secrets (no Vercel |
| 33 | prd.md | infra-deploy | NFR Scalability — heavy work host (~lines 2095-2096) | Vercel auto-scaling for the Next.js app; Supabase provides managed Pos | Reword: 'Lovable hosting auto-scales the TanStack Start app; Supabase manages Po |
| 34 | prd.md | infra-deploy | NFR Scalability / Heavy work — line ~2096: "runs on Supabase | **Heavy work** (usage polling, webhook fanout) runs on **Supabase Edge | Heavy work (usage polling, webhook fanout, periodic jobs) runs on Supabase Edge  |
| 35 | prd.md | infra-deploy | System Architecture diagram — line ~2164: worker box "(Supab | │  (Supabase Edge Fns / Fly.io)  │ | Relabel to "Supabase Edge Functions + pg_cron" (Fly.io noted only as an escape h |
| 36 | prd.md | framework | Key Components #1 — Next.js 14 App (Vercel) (~line 2181) | **Next.js 14 App (Vercel):** Server Components + Server Actions for mo | Replace with: 'TanStack Start (SSR) app (Lovable-owned) for reads/marketplace vi |
| 37 | prd.md | infra-deploy | Key Components #6 — line ~2186: "Worker layer: Either Supaba | **Worker layer:** Either Supabase Edge Functions (preferred for simpli | Worker layer: Supabase Edge Functions (Deno), pg_cron-scheduled for periodic job |
| 38 | prd.md | api-route | API Specifications / Discovery start — line ~2192: "POST /ap | POST /api/discovery/start | Supabase Edge Function endpoint, e.g. POST {SUPABASE_FUNCTIONS_URL}/discovery-st |
| 39 | prd.md | api-route | API Specifications / Stripe Webhook — line ~2217: "POST /api | POST /api/webhooks/stripe | stripe-webhook Supabase Edge Function: POST {SUPABASE_FUNCTIONS_URL}/stripe-webh |
| 40 | prd.md | api-route | API Specifications / GitHub Webhook — line ~2229: "POST /api | POST /api/webhooks/github | github-webhook Supabase Edge Function: POST {SUPABASE_FUNCTIONS_URL}/github-webh |
| 41 | prd.md | infra-deploy | Technology Stack / Infra — line ~2614: "Infra: Vercel (app), | **Infra:** Vercel (app), Supabase (data + auth), Upstash Redis (rate l | Infra: Lovable hosting (TanStack Start frontend), Supabase (data + auth + Edge F |
| 42 | prd.md | infra-deploy | Technology Stack / Observability — line ~2615: "Observabilit | **Observability:** Sentry (errors), Axiom or Logflare (logs), Vercel A | Observability: Sentry (errors), Axiom or Logflare (logs), Lovable analytics (fro |
| 43 | prd.md | infra-deploy | Technology Stack / CI/CD — line ~2616: "CI/CD: GitHub Action | **CI/CD:** GitHub Actions → Vercel. | CI/CD: GitHub Actions for test/lint; deploy = Lovable (deploy_project, frontend) |
| 44 | prd.md | infra-deploy | Out of Scope / v1.5 AI Proxy effort note — line ~2812: "Buil | Built on Cloudflare Workers / Vercel Edge for low-latency global edge  | Built on Cloudflare Workers / Supabase Edge Functions for low-latency global edg |
| 45 | prd.md | infra-deploy | §11 decision-10 rate-limiting row — line ~2837: "v1 ceiling  | v1 ceiling is a Vercel WAF rule + per-surface caps (Discovery caps own | v1 ceiling is a Lovable/Cloudflare edge WAF-equivalent rule (whatever the Lovabl |
| 46 | prd.md | infra-deploy | §11 decision-10 performance right-size row — line ~2844: "v1 | v1 keeps next/image + ISR + the Supabase pooler. | v1 keeps TanStack Start image handling + SSR-with-cache (Lovable edge caching in |
| 47 | prd.md | api-route | REQ-026 NGO context REST endpoint (~line 1573) | `get_project_context` is a **REST endpoint** (`GET https://ai4good.dev | Supabase Edge Function `project-context` (Deno): GET /functions/v1/project-conte |
| 48 | prd.md | api-route | REQ-026 NGO comments + blocker raise REST (~line 1574) | also REST endpoints (`POST /api/projects/:id/tasks/:task_key/comments` | Supabase Edge Functions: `task-comment` (POST /functions/v1/projects/:id/tasks/: |
| 49 | prd.md | implied | REQ-026 Acceptance Criteria — webhook ingest worker (~line 1 | **GitHub webhook receiver** for `push` events on `ai4good-projects/*`  | Implemented inside the `github-webhook` Supabase Edge Function (Deno) as the sin |
| 50 | prd.md | infra-deploy | REQ-026 AC — push retry / catch-up cron (~line 1639); Task 2 | a low-frequency cron polls each active project's `main` HEAD SHA and r | pg_cron schedule (low frequency, e.g. every 15-30 min) invoking a Supabase Edge  |
| 51 | prd.md | api-route | REQ-026 AC — Realtime + tasks.json export proxy (~line 1641, | `GET /api/projects/:id/tasks/tasks.json` proxies to the repo's current | Supabase Edge Function route GET /functions/v1/projects/:id/tasks/tasks.json pro |
| 52 | prd.md | implied | REQ-006 AC — Stripe webhook handler (~line 747) | Stripe webhook (`checkout.session.completed`) creates **a single `fuel | Stated as the `stripe-webhook` Supabase Edge Function (Deno) creating the single |
| 53 | prd.md | infra-deploy | REQ-006 AC — nightly control-total job (~line 756) | A nightly **control-total job** verifies two global invariants and **p | pg_cron nightly schedule invoking a Supabase Edge Function `control-total` (Deno |
| 54 | prd.md | infra-deploy | REQ-006 AC — match-expiry nightly job (~line 762); REQ-016 f | Background job nightly: any `matched_pending_fuel` project older than  | pg_cron schedule (e.g. hourly or nightly) invoking a Supabase Edge Function `mat |
| 55 | prd.md | infra-deploy | REQ-006 schema — outbox drain worker (~line 870) | Worker: SELECT ... FOR UPDATE SKIP LOCKED; idempotent handlers; termin | pg_cron schedule (~every 1 min) invoking a Supabase Edge Function `outbox-drain` |
| 56 | prd.md | infra-deploy | REQ-009 AC — 5-minute Usage poller (~line 1056); Task 9.6 (~ | per Anthropic org, ONE Usage Report call every 5 minutes ... The whole | pg_cron schedule (every 5 min) invoking a Supabase Edge Function `usage-poller`  |
| 57 | prd.md | infra-deploy | REQ-009 AC — daily reconciliation job 02:00 UTC (~line 1069) | **Daily reconciliation job:** at 02:00 UTC, fetch yesterday's Cost Rep | pg_cron schedule (daily 02:00 UTC) invoking a Supabase Edge Function `daily-reco |
| 58 | prd.md | implied | REQ-009 AC — hybrid key reactivation via Stripe webhook (~li | (a) Stripe webhook handler fires immediate reactivation ... on `checko | On checkout.session.completed, the `stripe-webhook` Supabase Edge Function enque |
| 59 | prd.md | framework | REQ-016 Decision-10 override (~line 1973) | implement as a single `notify(recipientIds, event_type, payload, chann | Re-word to: 'a shared Deno module `notify()` imported by every Supabase Edge Fun |
| 60 | prd.md | infra-deploy | REQ-027 inactivity job (hourly) (~line 1756); Decision-10 me | Inactivity job (hourly) computes inactivity **only for projects curren | pg_cron schedule (hourly) invoking a Supabase Edge Function `aging-scan` (Deno)  |
| 61 | prd.md | infra-deploy | REQ-029 AC — job_runs heartbeats + overdue-run pager (~line  | every scheduled job (5-min usage poll, daily reconciliation, nightly a | State that every scheduled job is a pg_cron→Supabase Edge Function pair recordin |
| 62 | prd.md | infra-deploy | REQ-008 AC — continuous base-permission invariant (~line 101 | an assertion runs continuously (on a short interval + on org-webhook e | pg_cron short-interval schedule invoking a Supabase Edge Function `base-permissi |
| 63 | prd.md | implied | REQ-008 AC — backend mints GitHub App installation tokens (~ | Backend mints short-lived installation tokens on demand via the GitHub | Reword 'Backend' → 'the Supabase Edge Functions (Deno) mint short-lived GitHub A |
| 64 | prd.md | infra-deploy | System Architecture — Background Workers box (~lines 2162-21 | │  Background Workers            │ │  (Supabase Edge Fns / Fly.io)  │  | Relabel to 'Supabase Edge Functions (Deno) + pg_cron' as the decided backend; ke |
| 65 | prd.md | infra-deploy | Technology Stack — Infra / Observability / CI-CD (~lines 261 | **Infra:** Vercel (app), Supabase (data + auth), Upstash Redis ... **O | **Infra:** Lovable hosting (frontend) + Supabase (data/auth/edge functions/pg_cr |
| 66 | prd.md | infra-deploy | Open Questions — Q2 worker layer (~lines 3102-3108) | **Options:** (A) Supabase Edge Fns only, (B) Fly.io worker, (C) Vercel | Resolve Q2: 'Resolved — Supabase Edge Functions (Deno) + pg_cron for all periodi |
| 67 | prd.md | infra-deploy | §11 Decision-10 Rank-6 right-size (~line 2888) | **Rate-limiting/Upstash** (v1 ceiling = a Vercel WAF rule + per-surfac | Replace 'a Vercel WAF rule' with the Lovable/Supabase-edge rate-limit ceiling (S |
| 68 | tasks.json | framework | Task #1 title (line 6): "Initialize Next.js 14 Project with  | Initialize Next.js 14 Project with App Router | Retitle to "Scaffold App Shell — Lovable creates the TanStack Start (SSR) projec |
| 69 | tasks.json | framework | Task #1 description (line 7): "Set up the foundational Next. | Set up the foundational Next.js 14 project with App Router, TypeScript | "Stand up the foundational TanStack Start (SSR) project (React 18 + TanStack Rou |
| 70 | tasks.json | framework | Task #1 details (line 8): "Create Next.js 14 project using ` | Create Next.js 14 project using `npx create-next-app@latest ai4good -- | Replace with Lovable create_project (no create-next-app). Routes live under src/ |
| 71 | tasks.json | framework | Task #1 testStrategy (line 9): "Run `npm run dev` and confir | Verify project builds without errors. Run `npm run dev` and confirm ho | "Verify the Lovable-created TanStack Start project builds and the Lovable previe |
| 72 | tasks.json | dep | Task #3 description (line 31): "session management using @su | Implement authentication flows and session management using @supabase/ | "Implement authentication flows and session management using @supabase/ssr with  |
| 73 | tasks.json | framework | Task #3 details (line 32): "createServerClient ... Implement | Create `src/lib/supabase/client.ts` for browser client and `src/lib/su | Use @supabase/ssr createServerClient/createBrowserClient with TanStack Start. Re |
| 74 | tasks.json | infra-deploy | Task #8 description (line 100): "Vercel Analytics for perfor | Set up Sentry error tracking, structured logging to Axiom/Logflare, an | "Set up Sentry error tracking, structured logging to Axiom/Logflare, and Lovable |
| 75 | tasks.json | infra-deploy | Task #8 details (line 101): "Install `@sentry/nextjs` ... `n | Install `@sentry/nextjs` and run `npx @sentry/wizard@latest -i nextjs` | Install @sentry/react (or the generic @sentry/browser + @sentry/node for Edge Fu |
| 76 | tasks.json | infra-deploy | Task #8 testStrategy (line 102): "Verify Vercel Analytics co | Throw test error, verify appears in Sentry with source maps. Check log | "... Verify Lovable analytics / Supabase logs are collecting data. Test error bo |
| 77 | tasks.json | framework | Task #5 details (line 58): "Create `app/(dashboard)/ngo/prof | Create `app/(dashboard)/ngo/profile/page.tsx` with form fields ... Cre | Build as a TanStack Start route (src/routes/dashboard/ngo/profile.tsx) via Lovab |
| 78 | tasks.json | framework | Task #6 details (line 72): "Build `app/(dashboard)/volunteer | Build `app/(dashboard)/volunteer/profile/page.tsx` with skill tag inpu | TanStack Start route src/routes/dashboard/volunteer/profile.tsx via Lovable MCP. |
| 79 | tasks.json | framework | Task #7 details (line 87): "Create `app/(admin)/verification | Create `app/(admin)/verification-queue/page.tsx` restricted to platfor | TanStack Start route src/routes/admin/verification-queue.tsx via Lovable MCP. Im |
| 80 | tasks.json | framework | Task #9 details (line 114): "Build `app/(dashboard)/ngo/proj | Build `app/(dashboard)/ngo/projects/new/page.tsx` with form ... Implem | TanStack Start route src/routes/dashboard/ngo/projects/new.tsx via Lovable MCP.  |
| 81 | tasks.json | framework | Task #10 details (line 128): "Build chat UI at `app/(dashboa | Create `src/lib/discovery/agent.ts` with Anthropic SDK client. ... Imp | Move the Anthropic Discovery agent + SSE streaming into a Supabase Edge Function |
| 82 | tasks.json | framework | Task #11 details (line 142): "Create `app/(dashboard)/ngo/pr | Create `app/(dashboard)/ngo/projects/[id]/scope/page.tsx`. ... Impleme | TanStack Start route src/routes/dashboard/ngo/projects/$id/scope.tsx via Lovable |
| 83 | tasks.json | framework | Task #12 details (line 157): "Create `app/(admin)/triage/pag | Create `app/(admin)/triage/page.tsx` with queue sorted by triage_submi | TanStack Start route src/routes/admin/triage.tsx via Lovable MCP. Triage approve |
| 84 | tasks.json | api-route | Task #13 details (line 171): "Build `app/api/stripe/checkout | Build `app/api/stripe/checkout/route.ts` POST handler that creates Che | Implement the Stripe Checkout Session creation as a Supabase Edge Function (stri |
| 85 | tasks.json | api-route | Task #14 testStrategy (line 186): "Use Stripe CLI to send te | Build Fuel Ledger Schema and Webhook Handler ... Stripe checkout.sessi | Add to details: "Implemented as a Supabase Edge Function (stripe-webhook, Deno)  |
| 86 | tasks.json | implied | Task #18 title/description (lines 239-241): "Bootstrap PM Tr | Decision-9 — on project in_progress, generate the initial tasks.json f | Add: "Implemented as a Supabase Edge Function (bootstrap-pm-tree, Deno), invoked |
| 87 | tasks.json | api-route | Task #19 details (line 254): "Build app/api/webhooks/github/ | Build app/api/webhooks/github/route.ts for push events on ai4good-proj | Replace with: "Build the github-webhook Supabase Edge Function (Deno) for push e |
| 88 | tasks.json | implied | Task #20 (lines 267-269): UsageMeteringProvider write side — | Implement the UsageMeteringProvider port (anti-corruption seam) with w | Add: "The UsageMeteringProvider write methods run inside Supabase Edge Functions |
| 89 | tasks.json | implied | Task #21 details (line 281): "Cursored idempotent usage poll | Cursored idempotent usage poller (usage_poll_state cursor + per-consum | Add: "The usage poller runs as a Supabase Edge Function (usage-poller, Deno) on  |
| 90 | tasks.json | framework | Task #23 details (line 295): "All SELECT from project_tasks  | All SELECT from project_tasks / task_comments / project_blockers via S | Project page = TanStack Start route src/routes/projects/$id.tsx via Lovable MCP. |
| 91 | tasks.json | framework | Task #24 details (line 310): "Create Lovable Setup page at ` | Create Lovable Setup page at `/projects/[id]/lovable-setup` with: scop | TanStack Start route src/routes/projects/$id/lovable-setup.tsx via Lovable MCP.  |
| 92 | tasks.json | framework | Task #25 details (line 324): "Create 'Ready for Handoff' but | Build NGO review page showing: repo URL, deployment URL, checklist res | Handoff UI = TanStack Start route via Lovable MCP. Accept/Reject via a Supabase  |
| 93 | tasks.json | implied | Task #27 details (line 354): "Keep outbox_events table + SEL | Keep outbox_events table + SELECT FOR UPDATE SKIP LOCKED drain on pg_c | Add: "The outbox drain worker + handler registry are a Supabase Edge Function (o |
| 94 | tasks.json | implied | Task #28 details (line 367): "Build nightly cron that: (1) B | Create `job_runs` table per schema for heartbeat tracking. Build night | Replace "Build nightly cron" with "Build a pg_cron-scheduled nightly job that in |
| 95 | tasks.json | implied | Task #29 details (line 380): "Detection cron verifies every  | Detection cron verifies every active volunteer holds exactly their pro | Add: "The detection cron is a pg_cron → Supabase Edge Function (base-permission- |
| 96 | tasks.json | implied | Task #30 details (line 393): "Create 30-day-alive check cron | Create 30-day-alive check cron job that pings deployment_url and recor | Replace with: "Create a pg_cron-scheduled deployment-alive-check Supabase Edge F |
| 97 | tasks.json | framework | Task #32 details (line 420): "Create `app/(dashboard)/ngo/pa | Create `app/(dashboard)/ngo/page.tsx`. Query all projects for the NGO  | TanStack Start route src/routes/dashboard/ngo/index.tsx via Lovable MCP. The das |
| 98 | tasks.json | framework | Task #33 details (line 434): "Create `app/(dashboard)/volunt | Create `app/(dashboard)/volunteer/page.tsx`. Query assigned projects . | TanStack Start route src/routes/dashboard/volunteer/index.tsx via Lovable MCP. T |
| 99 | tasks.json | framework | Task #34 details (line 448): "Project-page comment-stream UI | Project-page comment-stream UI: load on page open + post (NO Realtime) | Render the comment stream in the TanStack Start project route via Lovable MCP. T |
| 100 | tasks.json | implied | Task #35 details (line 462): "notify() ... Email via one Res | notify(recipientIds, event_type, payload) is the sole writer of `notif | Add: "notify() is a shared Deno module under supabase/functions/_shared/notify.t |
| 101 | tasks.json | framework | Task #36 details (line 476): "Display badge on volunteer pub | Display badge on volunteer public profile at `/volunteers/[handle]`. S | Public profile = TanStack Start route src/routes/volunteers/$handle.tsx via Lova |
| 102 | tasks.json | framework | Task #37 details (line 490): "Build `app/(admin)/audit/page. | Build `app/(admin)/audit/page.tsx` restricted to platform_admin. Displ | TanStack Start route src/routes/admin/audit.tsx via Lovable MCP. CSV export via  |
| 103 | tasks.json | framework | Task #38 details (line 504): "Build admin dashboard at `/adm | Create `job_runs` table heartbeat monitor: for each scheduled job (usa | Observability dashboard = TanStack Start route src/routes/admin/observability.ts |
| 104 | tasks.json | framework | Task #39 details (line 518): "Build `app/(admin)/ops/inciden | Build `app/(admin)/ops/incidents/page.tsx` for incident commander entr | Ops console = TanStack Start route src/routes/admin/ops/incidents.tsx via Lovabl |
| 105 | tasks.json | implied | Task #41 details (line 545): "Single hourly handler, three i | Single hourly handler, three isolated branches ... Each branch calls n | Add: "The hourly aging scan is a pg_cron → Supabase Edge Function (hourly-aging, |
| 106 | tasks.json | implied | Task #42 details (line 559): "a daily scan HARD-RESETS to th | DAILY free allowance — grant 10/day unverified, 30/day verified; a dai | Add: "The daily 00:00 UTC hard-reset scan is a pg_cron job (optionally → a reset |
| 107 | tasks.json | implied | Task #43 details (line 574): "fuel-poller + Lovable auto-rai | project_blockers schema + RLS + unique partial index; '🚩 Raise a flag' | Blocker UI = TanStack Start (project route) via Lovable MCP. Raise/Resolve call  |
| 108 | tasks.json | implied | Task #44 details (line 588): "'Request a Change' 3-field for | change_requests schema + RLS; 'Request a Change' 3-field form (in_prog | CR form = TanStack Start (project route) via Lovable MCP. Request/Accept/Decline |
| 109 | tasks.json | implied | Task #48 details (line 604): "Set up GitHub Actions workflow | Set up GitHub Actions workflow: run lint, type-check, test on PR. Add  | Keep GitHub Actions (test/lint only — framework-agnostic). Note in details: inte |
| 110 | tasks.json | infra-deploy | Task #49 details (line 618): "Configure playwright.config.ts | Configure playwright.config.ts with staging environment. ... Integrate | Keep Playwright. Re-point the staging environment to the Lovable preview_url (fr |
| 111 | tasks.json | framework | Task #53 title (line 669): "Performance — next/image + ISR + | Performance — next/image + ISR + Supabase pooler (v1) | Retitle: "Performance — TanStack image handling + SSR-with-cache + Supabase pool |
| 112 | tasks.json | framework | Task #53 description (line 670): "v1 keeps next/image + Next | Rank-6 right-size — v1 keeps next/image + Next ISR revalidate + Supaba | "v1 keeps TanStack Start image handling + SSR-with-cache (Lovable edge caching)  |
| 113 | tasks.json | framework | Task #53 details (line 671): "next/image optimization; Next  | next/image optimization; Next ISR with revalidate on marketplace/proje | "TanStack Start image handling (optimized loader); SSR-with-cache on marketplace |
| 114 | tasks.json | framework | Task #53 testStrategy (line 672): "Run k6 load test, verify  | Run k6 load test, verify p95 < 500ms at 100 RPS. Verify cache hits for | "Run k6 load test, verify p95 < 500ms at 100 RPS under TanStack Start SSR + Lova |
| 115 | tasks.json | framework | Task #54 details (line 684): "Create `/help` route with mark | Create `/help` route with markdown-based content ... Add 'Need Help?'  | TanStack Start route src/routes/help.tsx via Lovable MCP (markdown-based content |
| 116 | tasks.json | framework | Task #55 details (line 697): "Create `app/page.tsx` as the p | Create `app/page.tsx` as the public landing page. Design hero section  | Landing page = TanStack Start index route src/routes/index.tsx via Lovable MCP.  |
| 117 | tasks.json | framework | Task #55 dependencies (line 700-703): depends on #1 | "dependencies": [ 1, "75" ] | Keep the dependency on #1, but ensure #1 is the retitled "Scaffold app shell — L |
| 118 | tasks.json | infra-deploy | Task #59 details (line 725): "Cloudflare Workers / Vercel Ed | Document architecture: Cloudflare Workers / Vercel Edge deployment, re | "Document architecture: Cloudflare Workers / Supabase Edge Functions (Deno) depl |
| 119 | tasks.json | api-route | Task #73 details (line 903): "signed URLs minted by an ai4go | ALL access via short-TTL signed URLs minted by an ai4good edge functio | Mint signed URLs from a Supabase Edge Function (sign-project-file, Deno) — e.g.  |
| 120 | tasks.json | implied | Task #74 details (line 918): "chat calls an edge function, n | Reuse the Discovery conversation store (REQ-004) ... v1 = on-demand te | Confirm the assistant reuses the discovery-stream Supabase Edge Function (#10) w |
| 121 | tasks.json | framework | Task #75 details (line 934): "Stack: Next.js 14 App Router + | Stack: Next.js 14 App Router + Tailwind + shadcn/ui primitives (Card,  | "Stack: TanStack Start (SSR, React 18) + TanStack Router + Tailwind + shadcn/ui  |
| 122 | design | framework | design/design-brief.md §5 'Tech mapping' (line ~49): "Build  | Build stack: **Next.js 14 App Router + Tailwind CSS + shadcn/ui**; Tra | Replace only the framework clause, keep the rest: "Build stack: **TanStack Start |
| 123 | design | implied | design/claude-md-augmentation.md, paste-ready block 'Everyth | **Session bootstrap:** REST `GET /api/projects/:id/context` primes sco | "**Session bootstrap:** the Skill calls the ai4good **Supabase Edge Function** ` |
| 124 | design | implied | design/claude-md-augmentation.md, 'Enforcement split (decisi | Session bootstrap + project context fetch (REST `GET /api/projects/:id | "Session bootstrap + project context fetch via the ai4good **Supabase Edge Funct |
| 125 | design | implied | design/claude-md-augmentation.md, LOUD/QUIET table (line ~39 | \| `/ai4good:raise-blocker --task=X` (REST → `project_blockers`) \| bann | "\| `/ai4good:raise-blocker --task=X` (Supabase Edge Function → `project_blockers |
| 126 | tasks.json | framework | Task #15 "Build Marketplace Listing with Skill/Cause Badges" | Create `app/marketplace/page.tsx` as a public route. | TanStack Start route `src/routes/marketplace.tsx` (public route) via Lovable MCP |
| 127 | tasks.json | framework | Task #16 "Implement Volunteer Apply and NGO Accept/Decline F | Create `app/(dashboard)/ngo/projects/[id]/applicants/page.tsx` showing | TanStack Start route `src/routes/dashboard/ngo/projects/$id/applicants.tsx` via  |
| 128 | prd.md | api-route | REQ-032 storage decision block "Where the bytes live (decide | short-TTL signed URLs minted by an ai4good edge function** (`POST /api | Re-host as a Supabase Edge Function `sign-project-file` (Deno): `POST {SUPABASE_ |
| 129 | prd.md | infra-deploy | REQ-024 Task Breakdown Hint, Task 24.6 (line 1455): "Aging-b | Task 24.6: Aging-blocker job (hourly cron) + notifications (~5h) | Task 24.6: Aging-blocker branch of the pg_cron -> Supabase Edge Function (aging- |
| 130 | prd.md | infra-deploy | REQ-026 Task Breakdown Hint, Task 26.5 (line 1658): "Cron re | Task 26.5: **Cron reconciliation worker** — periodic poll of each acti | Task 26.5: HEAD-SHA reconciliation worker = pg_cron (low frequency, e.g. every 1 |
| 131 | prd.md | api-route | REQ-026 export endpoint (line 1631) + Task 26.6 (line 1659): | `GET /api/projects/:id/tasks/export.json` → returns full task tree in  | Either drop the export.json endpoint per decision-9 (the repo IS the export) OR  |
| 132 | prd.md | infra-deploy | Risks & Mitigation table, Stripe-webhook-failure row (line 3 | Stripe handles retries; we make webhook handler idempotent; reconcilia | Reword the mitigation cell: 'Stripe handles retries; the stripe-webhook Supabase |
| 133 | prd.md | infra-deploy | Testing Strategy, E2E line (line 2642): "Run on staging on e | **E2E:** Playwright. Two scripted journeys: (a) NGO end-to-end happy p | 'Run against the Lovable preview_url (frontend) + a Supabase staging project wit |
| 134 | tasks.json | api-route | Task id=26 "Build ai4good Claude Code Skill Package" details | Session bootstrap calls REST GET /api/projects/:id/context (no MCP ser | Reword the #26 details: "Session bootstrap calls the ai4good Supabase Edge Funct |
| 135 | prd.md | infra-deploy | REQ-010 Cadence stats panel (line 1118): "computed from GitH | **Cadence stats panel** (computed from GitHub commits via webhooks + h | State the cadence ingestion as: primary path is the github-webhook Supabase Edge |
| 136 | tasks.json | infra-deploy | Task id=19 details (line 254): cadence stats computed inside | (c) compute cadence stats (commits this/last week + delta, last-activi | In #19, drop 'Vercel Cron' (keep pg_cron) for the HEAD-SHA reconciliation -> Sup |
| 137 | prd.md | implied | REQ-009 provisioning flow (line ~1046): "Platform calls Anth | **Automated:** Platform calls Anthropic Admin API `POST /v1/organizati | Reword 'Platform calls the Anthropic Admin API' → 'a Supabase Edge Function (Den |
| 138 | prd.md | implied | REQ-005.5 kickoff provisioning (line ~678): "Anthropic works | 1. **Anthropic workspace** auto-created via Admin API (REQ-009). On fa | Kickoff side-effects (Anthropic workspace create, GitHub repo create, PM-tree bo |
| 139 | prd.md | implied | REQ-009 fuel-low key deactivation (line ~1075): "at 0% → key | at 0% → key programmatically deactivated via Admin API (`POST /v1/orga | Reword so the at-0% deactivation is executed by the usage-poller Supabase Edge F |
| 140 | prd.md | infra-deploy | REQ-024 Acceptance Criteria (line 1444): "Aging job runs hou | Aging job runs hourly; fires `blocker_aging_48h` and `blocker_aging_7d | State the hourly blocker-aging as the blocker branch of the pg_cron -> Supabase  |
| 141 | tasks.json | infra-deploy | Task #16 application-state-machine table (line 672): "Nightl | Nightly job runs after `fuel_deadline_at` passes without fuel payment  | Reword to: 'pg_cron match-expiry job (nightly/hourly) runs after fuel_deadline_a |
| 142 | prd.md | infra-deploy | Appendix Phase 2 Task 2.20 (line 2692) + Suggested structure | Task 2.20: Ledger integrity — pair-sum **control-total** nightly job ( | Reword both (2692, 3266): 'Ledger integrity — pair-sum control-total pg_cron ->  |
| 143 | prd.md | infra-deploy | Appendix Phase 2 Task 2.11 (line 2683) + Suggested structure | GitHub webhook receiver + Postgres projection worker (REQ-026 decision | Reword both (2683, 3257): 'github-webhook Supabase Edge Function (Deno) + Postgr |
| 144 | prd.md | infra-deploy | REQ-016 EVENT_MAP, Lovable row (line 2004): `lovable_decisio | `lovable_decision_auto_skipped` (14-day nightly job auto-skip per REQ- | State the 14-day Lovable-decision auto-skip as a pg_cron -> Supabase Edge Functi |
| 145 | prd.md | infra-deploy | REQ-008 AC — one-time platform setup, Organization-members:w | risk mitigations: audit_events log + nightly reconciliation job + max- | Reword the mitigation to: 'audit_events log + a pg_cron -> Supabase Edge Functio |
| 146 | tasks.json | infra-deploy | Task #50 "Perform Security Audit and RLS Review" details (li | Run OWASP ZAP baseline scan against staging environment. | Reword to: 'Run OWASP ZAP baseline scan against the staging deployment — the Lov |
| 147 | prd.md | infra-deploy | Testing Strategy, Security line (line 2644): "OWASP ZAP base | **Security:** Snyk or GitHub Advanced Security on dependencies; manual | Re-ground 'staging' in the two-target deploy: ZAP runs before launch against a S |
| 148 | prd.md | implied | REQ-008 AC — App credential least-privilege + rotation (line | the GitHub App credential is scoped to the minimum needed, rotated on  | State the App-credential rotation as a pg_cron -> Supabase Edge Function (Deno)  |
| 149 | prd.md | framework | REQ-009 AC — ops queue UI route (line 1052): "Ops queue UI a | Ops queue UI at `/admin/anthropic-ops` lists pending key-creation task | TanStack Start route src/routes/admin/anthropic-ops.tsx via Lovable MCP (platfor |
| 150 | prd.md | infra-deploy | REQ-009 Task Breakdown Hint 9.2 (line 1088) + 9.6 (line 1092 | Task 9.2: Workspace auto-creation on `in_progress` transition (~4h) .. | Task 9.2: Workspace auto-creation runs inside the provisioning Supabase Edge Fun |
| 151 | prd.md | infra-deploy | REQ-007/011 application-status side-effects table (line 672) | \| `accepted` → `expired` \| Nightly job runs after `fuel_deadline_at` p | Reword to: 'pg_cron match-expiry job (nightly/hourly) runs after fuel_deadline_a |