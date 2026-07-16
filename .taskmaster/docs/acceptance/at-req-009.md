# AT-REQ-009 — LLM Gateway: Virtual Keys, Caps & Inline Fuel Metering

Source: requirements/req-009.md (prd-mvp.md REQ-009). Dependencies: REQ-006, REQ-024, REQ-034, REQ-012/027/007 (key-termination hooks). Only provider surface: the model API through the gateway.

**Boundary note:** REQ-009 owns the gateway (auth, binding, injection, proxying, privacy), key lifecycle, the provider-workspace money path, and the fuel-threshold monitor. Money bookkeeping is owned by REQ-006; the attribution log's schema and writers by REQ-034; repo-side seeding of the marker and env hygiene by REQ-008; deactivation triggers by REQ-007/012/027 — `[cross:]` here.

## A. Keys & authentication

- **AT-009.01 (P0)** — Given kickoff fires, When keys are minted, Then exactly one workspace-scoped virtual key exists for the (volunteer, project) pair, its value is retrievable exactly once (a second retrieval is impossible), and a sentinel scan of all platform logs finds no key material.
- **AT-009.02 (P0)** — Given a standard unmodified Claude Code session configured with only the gateway base URL and the virtual key, When the volunteer runs a request, Then it completes — standard Claude Code works unchanged.
- **AT-009.03 (P0)** — Given a sentinel provider credential, When every platform-controlled surface is scanned — gateway responses (headers + body), platform logs, traces, dashboard diagnostics, client-visible configuration, and persistent stores — Then the sentinel appears nowhere outside the authorized gateway secret store — the real credential is never exposed on any surface. [cx r2: widened from response-only to all platform surfaces]
- **AT-009.04 (P0)** — Given three keys — revoked, never-existed, and malformed — When each is used, Then each rejection is exactly HTTP 401, the rejections are externally identical (same status, same body shape, no revoked-vs-nonexistent distinction), and a provider-side capture shows ZERO upstream calls for all three — invalid keys are rejected before forwarding. [cx r2: exact 401 + no-upstream-call assertions added]
- **AT-009.05 (P0)** — Given a project at 0% fuel, When a request is made with a valid key, Then the proxied rejection states its cause (fuel exhaustion) — the one exception to flat rejections.
- **AT-009.06 (P0)** — Given an active key and a revoked key, When the authenticated dashboard is read, Then it shows each existing key's status detail that the external surface withholds — diagnostics live only on the dashboard. [cx: narrowed — no per-key records exist for never-existed/malformed credentials]
- **AT-009.07 (P0)** — Given a rejected request and a failed setup, When the messaging renders, Then it contains remediation instructions and no accusatory language — instructs, never accuses (semantic oracle over the copy).

## B. Project binding & injected governance

- **AT-009.08 (P0)** — Given a session whose committed project-binding marker matches the key's project, When a substantive request is made, Then it passes; Given the marker names a different project, Then the request is rejected with an instructive message naming the KEY's project.
- **AT-009.09 (P0)** — Given the substantive-request threshold configuration (OD-4), When a below-threshold request is made without a valid marker, Then it reaches the provider (upstream capture shows the call); When an at/above-threshold request is made without a valid marker, Then it receives the defined instructive rejection and produces NO upstream call — threshold enforcement observable at the provider boundary, not claimed internally. [cx r2: both branches given observable outcomes]
- **AT-009.10 (P0)** — Given two consecutive forwarded requests (provider-side capture fixture), When their payloads are inspected, Then each carries the injected project-scope rule (decline/redirect unrelated requests) and the never-change-Linear-status rule — injected on every request, not once per session. [cross: REQ-026]
- **AT-009.11 (P0)** — Given a session whose repo-side files are altered (marker deleted, third-party settings changed), When requests flow, Then governance injection and provider limits still apply unchanged — enforcement lives only on the gateway and provider surfaces; repo files are never trusted to enforce; only the binding tripwire reacts to the marker.

## C. Money path & fuel thresholds

> **PRD tension flag [needs founder ruling — cx round 2]:** REQ-009 sets the workspace spend limit "to the prepaid fuel", but Promise §3 / REQ-006 recognize a 15% platform share on the provider-billed cost at consumption. If $100 of fuel sets a $100 provider limit, the provider can bill the full $100 and the share has no funded source. The spend-limit formula needs a ruling (e.g., limit = fuel ÷ 1.15 so billed cost + share = fuel; or fuel is provider-cost-only and the share is recognized on top). AT-009.12 asserts limit-tracks-fuel mechanically pending the formula.

- **AT-009.12 (P0)** — Given a project funded, When the provider workspace is read, Then its spend limit equals the value the ruling's formula assigns to the prepaid fuel, and after a top-up the limit rises by the formula-consistent amount — the workspace spend limit tracks prepaid fuel. [cx r2: exact dollar figures suspended pending the spend-limit-formula ruling]
- **AT-009.13 (P0)** — Given a workspace at its spend limit, When the next request is made, Then the provider's rejection is proxied to the user stating the cause; after a top-up raises the limit, Then the next request passes with no reactivation step by anyone.
> **Resolved [founder, d67]:** the blocking boundary is exactly 0%, and "blocking" is a STATUS on the project surface — the blocker mirrors the provider's stop, it never enforces anything. Enforcement = provider spend limit only; gateway = proxy only. REQ-009's "nears zero" reworded to "at 0% the blocker's state flips to blocking". AT-009.13/14 stand as written.

- **AT-009.14 (P0)** — Given sentinel spend fixtures crossing the thresholds, When the platform monitor reads the provider's Admin/usage API, Then at 20% remaining the NGO receives a warning blocker, at 5% the volunteer is warned, and at 0% the blocker is blocking — all driven from the provider read, not gateway math. [cx: blocking boundary pinned to 0% per REQ-024, pending ruling] [cross: REQ-016/024]
- **AT-009.15 (P0)** — Given the project's money records, When the spend-of-record is compared to the provider's billed cost for its workspace, Then they are equal, and no locally-reconstructed token total participates in any money value. [cross: REQ-006]
- **AT-009.16 (P0)** — Given the per-request usage rows the gateway captures, When their schema and consumers are inspected, Then the rows carry no money fields, feed only attribution (REQ-034), and no gate or ledger reads them. [cx r2: prd-mvp Out-of-Scope item 21 still lists "cost" in per-request metadata — a stale leftover contradicting the d64-r money-never-derived rule; PRD scrub flagged, test unchanged (token-only is the ruled invariant)] [cross: REQ-034]
- **AT-009.17 (P0)** — Given the gateway's configuration surface AND a project with sentinel-high accumulated usage still inside its provider spend/rate limits, When the config is inspected and the next request is made, Then no custom usage-cap setting exists and the request is still forwarded — no gateway decision path consults a local usage counter; budget and velocity are provider-native only. [cx: behavioral half added — config absence alone could hide a hard-coded cap]
- **AT-009.18 (P0)** — Given a request burst exceeding the workspace's provider rate limit (fixture), When the provider rejects, Then the gateway proxies the rate-limit rejection to the caller unchanged in meaning.

## D. Streaming & interactivity

- **AT-009.19 (P0)** — Given a streaming request through the gateway, When the response is consumed, Then chunks arrive incrementally (more than one chunk, first chunk before generation completes) — streaming is preserved end to end, not buffered.
- **AT-009.20 (P0)** — Given ≥30 paired requests (identical payloads, gateway vs direct-to-provider) in the test environment, When p95 timings are compared, Then the gateway's added overhead is ≤300ms per request and the first streamed chunk's added delay is ≤500ms. [cx: P1→P0, values pinned] [cx r2: the numbers are PROVISIONAL AT-defined stand-ins — REQ-009 states only the qualitative bound; escalated for a founder-owned SLO to be written into the REQ, see open items]

## E. Revocation & key lifecycle

- **AT-009.21 (P0)** — Given the NGO clicks "revoke access now", When the next request with the old key arrives, Then it is rejected and stays rejected; and the instant replacement key is revealed exactly once (a second retrieval impossible), absent from all logs (sentinel scan), and works immediately with the same (volunteer, project) workspace binding. [cx: replacement inherits the shown-once/never-logged/binding invariants]
- **AT-009.22 (P0)** — Given admin enforcement (AUP deactivation), When it lands, Then the project's keys are revoked with the same immediacy. [cross: REQ-007]
- **AT-009.23 (P0)** — Given a project completing, When completion lands, Then every key for the project is terminated and the provider workspace is archived, freeing a workspace slot (active-workspace count decrements). [cross: REQ-012/005.5]
- **AT-009.24 (P0)** — Given a project cancelled AFTER workspace provisioning, When cancellation lands, Then the same termination + archival occurs; Given a project cancelled BEFORE kickoff (no workspace or key ever existed), Then nothing is terminated and archival is a no-op — no error, no phantom records. [cx r2: scoped — REQ-005.5 permits cancellation from pre-provisioning states] [cross: REQ-005.5]

> **PRD tension flag [needs founder ruling — cx round 2]:** REQ-009 says on abandonment "the workspace persists so the successor volunteer inherits it", while REQ-006 says "Cancellation or volunteer release ... the workspace is archived (freeing its slot)". Release cannot both persist and archive the workspace. AT-009.25 follows REQ-009 (persist + successor inherits — consistent with fuel-stays-on-project); if that ruling holds, REQ-006's "or volunteer release" wording needs the scrub.

- **AT-009.25 (P0)** — Given an abandonment release, When it lands, Then the ex-volunteer's key is terminated and the workspace persists (not archived); and Given a LATER successor kickoff (rematch → consent → funding), Then the successor's newly minted key binds to that same preserved workspace — the successor inherits it. [cx r2: split into release-time and successor-time assertions — no successor key exists at release] [cross: REQ-027/005.5]

## E2. Workspace isolation & threat posture [cx: added round 1]

- **AT-009.32 (P0)** — Given two projects kicked off, When their provisioning is read, Then each has a DISTINCT provider-workspace ID and each virtual key is scoped only to its own project's workspace — requests via key A are billed only to workspace A. [cross: REQ-006.46 owns the ledger side]
- **AT-009.33 (P0)** — Given project A's binding marker copied into a different machine/session using key A, When a substantive request is made, Then it passes the binding check (the marker is copyable — it detects cross-project misuse, it is not an origin lock) and the request still lands exactly one attribution row — attribution, not the marker, is the accountability bound. [cross: REQ-034]

## F. Privacy invariants (load-bearing)

- **AT-009.26 (P0)** — Given requests carrying a sentinel string in their bodies, When all persistent stores are scanned afterward (usage log, ledger, any gateway store), Then the sentinel appears nowhere — bodies are inspected transiently and never persisted; the log holds token counts and metadata only.
- **AT-009.27 (P0)** — Given a binding-mismatch event, When its stored record is read, Then the derived signal is a score or boolean only — no paths, no content fragments.

## G. Onboarding, hygiene & posture

- **AT-009.28 (P0)** — Given volunteer onboarding, When its copy renders, Then it states that usage is attributed and reviewed — the deterrence disclosure is explicit.
- **AT-009.29 (P0)** — Given the org's GitHub configuration is read, Then it contains the platform key pattern with BOTH secret scanning and push protection enabled; and When a sentinel key-shaped string is pushed to an org repo, Then the push is blocked — registration asserted, then behavior exercised. [cx r2: registration promoted from Given to assertion] [cross: REQ-008 owns env-file seeding]
- **AT-009.30 (P0)** — Given sentinel org contents — an active-project repo, an inactive-project repo, and an orphan — over two consecutive days (controlled clock), When the daily review runs, Then each day's recorded comparison output classifies exactly those repos correctly (orphan flagged, active matched), a founder-attributed review acknowledgment is recorded per day, and a missed day is detectable as an absent record. [cx: cadence asserted] [cx r2: exact comparison output + founder attribution — an artifact merely named "comparison" proves nothing] [cross: REQ-008.23 owns orphan flagging]
- **AT-009.34 (P0)** — Given one of each metered request outcome — successful non-streaming, successful streaming, spend-limit-rejected at the provider, and rate-limit-rejected at the provider — When the attribution log is read, Then each FORWARDED request yields exactly one usage row (no more, no less); gateway-rejected requests that never reach the provider follow REQ-034's log spec for pre-forward rejections. [cx r2: added — attribution-of-every-request was claimed but only a single success case was proven] [cross: REQ-034 owns the row schema]
- **AT-009.35 (P0)** — Given a freshly seeded project repo, When sentinel `.env` variants (`.env`, `.env.local`, `.env.production`) are created in the working tree, Then none is trackable by default (git status/commit excludes them) — env files are ignored by default, behaviorally proven. [cx r2: added — AT-008.16 asserts the hygiene element exists; this asserts it works] [cross: REQ-008.16 owns the seeding]
- **AT-009.31 (P0)** — Given the escalation ladder, When v1 is inspected, Then it exists as a document and no enforcement automation implements it — documented, not built. [cx: P1→P0 — an explicit REQ clause must gate completion]

## Coverage map

| REQ-009 clause | Tests |
|---|---|
| Per-project workspace ISOLATION; per (volunteer, project) workspace-scoped key; standard Claude Code unchanged | 01, 02, 12, 32 [cx: isolation proven two-project] |
| Request path: authenticated (exact 401, no upstream call on invalid), status + binding checked, governed, forwarded; credential never exposed (all surfaces); provider response proxied | 02–05, 08, 10, 13 |
| Streaming preserved; latency budget (provisional p95 numbers — founder SLO pending) | 19, 20 [cx: P0] |
| Enforcement placement: gateway + provider only; repo files never trusted | 11 |
| Threat posture: marker detects not prevents (copyable, no origin lock); bounds = spend/rate/attribution-of-every-request (outcome matrix)/revocation; onboarding disclosure | 08, 11–14, 16, 18, 21, 28, 33, 34 [cx r2: per-outcome attribution proven] |
| One key per pair, shown once, minted at kickoff, never logged | 01 |
| Onboarding minimal; messaging instructs never accuses | 02, 07 |
| Provider-native budget + velocity; no custom gateway caps (config absence + behavioral pass-through) | 12, 17, 18 |
| Binding check on substantive requests (OD-4 threshold); instructive mismatch rejection | 08, 09 |
| Injected governance on every request (project scope + Linear-status) | 10 |
| Money path: spend-of-record = provider billed cost; limit tracks fuel (FORMULA PENDING FOUNDER RULING vs the 15% share); share on billed cost [cross REQ-006.07]; gateway usage attribution-only ("cost" leftover in Out-of-Scope 21 flagged for scrub) | 12, 15, 16 |
| Thresholds 20/5/0 from Admin API (0% blocking, resolved d67 — blocker is a mirroring status, never enforcement); gateway proxies 0% rejection; top-up → passes, no reactivation | 13, 14 |
| 401 semantics: flat externally; fuel-exhaustion exception; dashboard diagnostics | 04–06 |
| Revocation instant + replacement; termination at completion/abandonment/AUP; workspace archived (post-provisioning; pre-kickoff no-op) vs persists on release (REQ-006 wording flagged); successor inherits at later kickoff | 21–25 |
| Privacy: bodies transient; metadata-only log; signals as score/boolean | 26, 27 |
| Key-leak hygiene: env files ignored by default (behavioral); secret scanning + push protection (registration asserted + exercised); daily review (cadence + content + founder attribution); org-namespace guard | 29, 30, 35 [guard: cross → AT-REQ-008.21/22/27] |
| Escalation ladder documented, not built | 31 [cx: P0] |
