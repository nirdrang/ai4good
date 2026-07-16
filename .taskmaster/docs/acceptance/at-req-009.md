# AT-REQ-009 — LLM Gateway: Virtual Keys, Caps & Inline Fuel Metering

Source: requirements/req-009.md (prd-mvp.md REQ-009). Dependencies: REQ-006, REQ-024, REQ-034, REQ-012/027/007 (key-termination hooks). Only provider surface: the model API through the gateway.

**Boundary note:** REQ-009 owns the gateway (auth, binding, injection, proxying, privacy), key lifecycle, the provider-workspace money path, and the fuel-threshold monitor. Money bookkeeping is owned by REQ-006; the attribution log's schema and writers by REQ-034; repo-side seeding of the marker and env hygiene by REQ-008; deactivation triggers by REQ-007/012/027 — `[cross:]` here.

## A. Keys & authentication

- **AT-009.01 (P0)** — Given kickoff fires, When keys are minted, Then exactly one workspace-scoped virtual key exists for the (volunteer, project) pair, its value is retrievable exactly once (a second retrieval is impossible), and a sentinel scan of all platform logs finds no key material.
- **AT-009.02 (P0)** — Given a standard unmodified Claude Code session configured with only the gateway base URL and the virtual key, When the volunteer runs a request, Then it completes — standard Claude Code works unchanged.
- **AT-009.03 (P0)** — Given any gateway response (success and rejection), When headers and body are scanned, Then no real provider credential material appears — the real credential is never exposed.
- **AT-009.04 (P0)** — Given three keys — revoked, never-existed, and malformed — When each is used, Then the gateway's rejections are externally identical (same status, same body shape, no revoked-vs-nonexistent distinction).
- **AT-009.05 (P0)** — Given a project at 0% fuel, When a request is made with a valid key, Then the proxied rejection states its cause (fuel exhaustion) — the one exception to flat rejections.
- **AT-009.06 (P0)** — Given the same key states as AT-009.04, When the authenticated dashboard is read, Then it shows the rich per-key status the external surface withholds — diagnostics live only on the dashboard.
- **AT-009.07 (P0)** — Given a rejected request and a failed setup, When the messaging renders, Then it contains remediation instructions and no accusatory language — instructs, never accuses (semantic oracle over the copy).

## B. Project binding & injected governance

- **AT-009.08 (P0)** — Given a session whose committed project-binding marker matches the key's project, When a substantive request is made, Then it passes; Given the marker names a different project, Then the request is rejected with an instructive message naming the KEY's project.
- **AT-009.09 (P0)** — Given the substantive-request threshold configuration (OD-4), When requests below the threshold are made without a valid marker, Then they are not binding-checked; at or above it, they are — the check applies to substantive requests per the configured threshold.
- **AT-009.10 (P0)** — Given two consecutive forwarded requests (provider-side capture fixture), When their payloads are inspected, Then each carries the injected project-scope rule (decline/redirect unrelated requests) and the never-change-Linear-status rule — injected on every request, not once per session. [cross: REQ-026]
- **AT-009.11 (P0)** — Given a session whose repo-side files are altered (marker deleted, third-party settings changed), When requests flow, Then governance injection and provider limits still apply unchanged — enforcement lives only on the gateway and provider surfaces; repo files are never trusted to enforce; only the binding tripwire reacts to the marker.

## C. Money path & fuel thresholds

- **AT-009.12 (P0)** — Given a project funded $100, When the provider workspace is read, Then its spend limit is $100; after a $50 top-up, Then the limit is $150 — the workspace spend limit tracks prepaid fuel.
- **AT-009.13 (P0)** — Given a workspace at its spend limit, When the next request is made, Then the provider's rejection is proxied to the user stating the cause; after a top-up raises the limit, Then the next request passes with no reactivation step by anyone.
- **AT-009.14 (P0)** — Given sentinel spend fixtures crossing the thresholds, When the platform monitor reads the provider's Admin/usage API, Then at 20% remaining the NGO receives a warning blocker, at 5% the volunteer is warned, and near zero the blocker turns blocking — all driven from the provider read, not gateway math. [cross: REQ-016/024]
- **AT-009.15 (P0)** — Given the project's money records, When the spend-of-record is compared to the provider's billed cost for its workspace, Then they are equal, and no locally-reconstructed token total participates in any money value. [cross: REQ-006]
- **AT-009.16 (P0)** — Given the per-request usage rows the gateway captures, When their schema and consumers are inspected, Then the rows carry no money fields, feed only attribution (REQ-034), and no gate or ledger reads them. [cross: REQ-034]
- **AT-009.17 (P0)** — Given the gateway's configuration surface, When inspected, Then no custom usage-cap setting exists — budget and velocity are provider-native only.
- **AT-009.18 (P0)** — Given a request burst exceeding the workspace's provider rate limit (fixture), When the provider rejects, Then the gateway proxies the rate-limit rejection to the caller unchanged in meaning.

## D. Streaming & interactivity

- **AT-009.19 (P0)** — Given a streaming request through the gateway, When the response is consumed, Then chunks arrive incrementally (more than one chunk, first chunk before generation completes) — streaming is preserved end to end, not buffered.
- **AT-009.20 (P1)** — Given the configured per-request gateway overhead budget, When request timing is measured against a direct-to-provider baseline in the test environment, Then the added overhead is within the budget — the concrete stand-in for "must not degrade the interactive experience".

## E. Revocation & key lifecycle

- **AT-009.21 (P0)** — Given the NGO clicks "revoke access now", When the next request with the old key arrives, Then it is rejected, and an instant replacement key has been issued.
- **AT-009.22 (P0)** — Given admin enforcement (AUP deactivation), When it lands, Then the project's keys are revoked with the same immediacy. [cross: REQ-007]
- **AT-009.23 (P0)** — Given a project completing, When completion lands, Then every key for the project is terminated and the provider workspace is archived, freeing a workspace slot (active-workspace count decrements). [cross: REQ-012/005.5]
- **AT-009.24 (P0)** — Given a project cancelled, When cancellation lands, Then the same termination + archival occurs. [cross: REQ-005.5]
- **AT-009.25 (P0)** — Given an abandonment release, When it lands, Then the ex-volunteer's key is terminated but the workspace persists, and the successor volunteer's new key binds to that same workspace — the successor inherits it. [cross: REQ-027]

## F. Privacy invariants (load-bearing)

- **AT-009.26 (P0)** — Given requests carrying a sentinel string in their bodies, When all persistent stores are scanned afterward (usage log, ledger, any gateway store), Then the sentinel appears nowhere — bodies are inspected transiently and never persisted; the log holds token counts and metadata only.
- **AT-009.27 (P0)** — Given a binding-mismatch event, When its stored record is read, Then the derived signal is a score or boolean only — no paths, no content fragments.

## G. Onboarding, hygiene & posture

- **AT-009.28 (P0)** — Given volunteer onboarding, When its copy renders, Then it states that usage is attributed and reviewed — the deterrence disclosure is explicit.
- **AT-009.29 (P0)** — Given the platform key pattern is registered with GitHub secret scanning + push protection, When a sentinel key-shaped string is pushed to an org repo, Then the push is blocked. [cross: REQ-008 owns env-file seeding]
- **AT-009.30 (P0)** — Given the founder's daily review surface, When it renders, Then it compares org repos against active projects. [cross: REQ-008.23 owns orphan flagging]
- **AT-009.31 (P1)** — Given the escalation ladder, When v1 is inspected, Then it exists as a document and no enforcement automation implements it — documented, not built.

## Coverage map

| REQ-009 clause | Tests |
|---|---|
| Per-project workspace; per (volunteer, project) workspace-scoped key; standard Claude Code unchanged | 01, 02, 12 |
| Request path: authenticated, status + binding checked, governed, forwarded; credential never exposed; provider response proxied | 02–05, 08, 10, 13 |
| Streaming preserved; latency budget | 19, 20 (P1) |
| Enforcement placement: gateway + provider only; repo files never trusted | 11 |
| Threat posture: marker detects not prevents; bounds = spend/rate/attribution/revocation; onboarding disclosure | 08, 11–14, 18, 21, 28 |
| One key per pair, shown once, minted at kickoff, never logged | 01 |
| Onboarding minimal; messaging instructs never accuses | 02, 07 |
| Provider-native budget + velocity; no custom gateway caps | 12, 17, 18 |
| Binding check on substantive requests (OD-4 threshold); instructive mismatch rejection | 08, 09 |
| Injected governance on every request (project scope + Linear-status) | 10 |
| Money path: spend-of-record = provider billed cost; limit = prepaid fuel; share on billed cost [cross REQ-006.07]; gateway usage attribution-only | 12, 15, 16 |
| Thresholds 20/5/0 from Admin API; gateway proxies 0% rejection; top-up → passes, no reactivation | 13, 14 |
| 401 semantics: flat externally; fuel-exhaustion exception; dashboard diagnostics | 04–06 |
| Revocation instant + replacement; termination at completion/abandonment/AUP; workspace archived vs persists | 21–25 |
| Privacy: bodies transient; metadata-only log; signals as score/boolean | 26, 27 |
| Key-leak hygiene: secret scanning + push protection; daily review; org-namespace guard | 29, 30 [guard: cross → AT-REQ-008.21/22] |
| Escalation ladder documented, not built | 31 (P1) |
