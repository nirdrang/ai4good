# AT-REQ-031 — Content Moderation, Takedown & Secret Scanning

Source: requirements/req-031.md (prd-mvp.md REQ-031, incl. d75). Dependencies: REQ-005.5, REQ-008, REQ-011, REQ-023.

**Boundary note:** REQ-031 owns the org-wide scanning posture and the break-glass visibility switch. The credential-lifetime invariant on seeded repos is AT-008.18's; the push-protection mechanism AT-009.29's; the lifecycle states themselves REQ-005.5's; the erroneous-approval fixture pair AT-023.17's — `[cross:]` here.

## A. Secret scanning (org-wide)

- **AT-031.01 (P0)** — Given a FRESHLY created project repo (no per-repo setup step), When its protection settings are read, Then secret scanning AND push protection are active — inherited org-wide, not configured per repo; and Given a push carrying a sentinel secret, Then it is blocked. [cross: AT-008.18/AT-009.29 own the credential-pattern specifics]
- **AT-031.02 (P0)** — Given EVERY bounded execution registry — routes/APIs, scheduled jobs, queue consumers, event/webhook handlers, and background workers — When each is enumerated, Then none contains an entry that can initiate a takedown or visibility change; and Given a controlled report-like event (sentinel complaint fixture), When it lands, Then NO automatic visibility change occurs on the target project — break-glass is the only EMERGENCY, non-lifecycle takedown action (the NGO's ordinary unpublish/cancel lifecycle paths, REQ-005.5, are separate and untouched). [cx: deterministic observables] [cx r2: all execution registries enumerated (a queue/webhook takedown could have passed); "only takedown mechanism" scoped to emergency non-lifecycle — it contradicted the NGO's ordinary paths]

## B. Break-glass — one action, four surfaces

- **AT-031.03 (P0)** — Given an `in_progress` project WITH a repo, When the founder fires break-glass as ONE action and it completes, Then all four surfaces are hidden: the marketplace listing is absent, the showcase card is absent, the public project page is unreachable/hidden, and the repository is no longer publicly visible — one action, four outcomes. [cx: mid-action atomicity removed] **[TENSION T6 → codex pass: hiding the repository collides with Promise §2 "every repo is public MIT" and REQ-008's public-repo invariant (AT-008.27 already carves out the authorized emergency hide at the AT layer, but the PRD text itself carries no carve-out). Reconciling candidate: name the active founder break-glass hide (REQ-031) as the one authorized temporary exception in Promise §2 and REQ-008 — d75 already decided the behavior; the wording lacks the carve-out. Held for the adversarial evaluation.]**
- **AT-031.04 (P0)** — Given an `open` project WITHOUT a repo, When break-glass fires, Then the three platform surfaces hide and the action completes without error — the repo hide applies only when a repo exists.
- **AT-031.05 (P0)** — Given a project, When its lifecycle state is read immediately before and after the HIDE, and again immediately before and after the UN-HIDE (four reads), Then all four are IDENTICAL and no lifecycle event is emitted by either action — a visibility switch in both directions, never a transition. [cx: the un-hide direction previously checked only event absence — a silent state change could have passed]
- **AT-031.06 (P0)** — Given hidden projects, When each normal follow-up path is exercised with its defined fixture and actor, Then each lands its exact outcome: a hidden `open` pre-consent project + NGO unpublish → `scoped`; a hidden pre-completion project + NGO cancel → `cancelled`; and founder un-hide → lifecycle unchanged with state-appropriate public visibility restored on every hidden surface (listing, showcase, page, repo) — hiding introduces no special-state machinery, and the follow-up actors are the ORDINARY ones (NGO for lifecycle paths, founder for un-hide). [cx: three follow-ups] [cx r2: fixtures/actors/outcomes pinned — "ordinary path, normal outcome" was not judgeable; actor attribution corrected per REQ-005.5]
- **AT-031.07 (P0)** — Given the hide and the un-hide, When the audit record is read, Then each action carries the actor, the timestamp, and the target project — both directions audited, and the un-hide is the SAME action in reverse (same audit record type, inverse effect).
- **AT-031.08 (P0)** — Given every non-founder role (NGO admin, the assigned volunteer, an unrelated authenticated account) AND an UNAUTHENTICATED caller, When each attempts break-glass or un-hide, Then each is rejected with NO visibility change and NO audit mutation — founder-only in both directions, including against anonymous requests. [cx r2: the unauthenticated case was missing]
- **AT-031.09 (P0)** — Given a project hidden while `in_progress`, When the build-side surfaces are probed, Then the NGO and assigned volunteer retain their authenticated project access (dashboard, thread, Linear/mirror) — break-glass hides PUBLIC surfaces, it does not revoke participant access. 
- **AT-031.10 (P0)** — Given an erroneously APPROVED project now `open`, When break-glass fires, Then it is hidden pending the founder's follow-up through normal paths — the recovery path for a wrong triage approval exists. [cross: AT-023.17 owns the triage-side fixtures]

## Coverage map

| REQ-031 clause | Tests |
|---|---|
| Secret scanning + push protection org-wide (fresh repo inherits; sentinel push blocked) | 01 |
| No automated takedown in v1 (ALL execution registries + no-op report fixture); break-glass = only EMERGENCY non-lifecycle takedown | 02 [cx r2] |
| One action hides listing + showcase + page + repo-when-exists — repo-hide-vs-public-Promise tension HELD (T6) | 03 [cx, T6], 04 |
| Visibility switch, never a lifecycle transition (state identical around BOTH directions; no event) | 05 [cx] |
| Follow-up via normal paths with pinned fixtures/actors/outcomes (NGO unpublish → scoped; NGO cancel → cancelled; founder un-hide → restored) | 06 [cx r2] |
| Audited both directions; un-hide = same action in reverse | 07 |
| Founder-only (incl. unauthenticated rejection, no visibility/audit mutation) | 08 [cx r2] |
| Public surfaces only — participant access retained | 09 |
| Recovers erroneous triage approval | 10 |
