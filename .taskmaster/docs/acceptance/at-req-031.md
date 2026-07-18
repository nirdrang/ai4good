# AT-REQ-031 — Content Moderation, Takedown & Secret Scanning

Source: requirements/req-031.md (prd-mvp.md REQ-031, incl. d75). Dependencies: REQ-005.5, REQ-008, REQ-011, REQ-023.

**Boundary note:** REQ-031 owns the org-wide scanning posture and the break-glass visibility switch. The credential-lifetime invariant on seeded repos is AT-008.18's; the push-protection mechanism AT-009.29's; the lifecycle states themselves REQ-005.5's; the erroneous-approval fixture pair AT-023.17's — `[cross:]` here.

## A. Secret scanning (org-wide)

- **AT-031.01 (P0)** — Given a FRESHLY created project repo (no per-repo setup step), When its protection settings are read, Then secret scanning AND push protection are active — inherited org-wide, not configured per repo; and Given a push carrying a sentinel secret, Then it is blocked. [cross: AT-008.18/AT-009.29 own the credential-pattern specifics]
- **AT-031.02 (P0)** — Given the platform's route/API registry and its scheduled-job registry, When each is enumerated, Then neither contains an automated takedown entry (bounded inventories, not a vague sweep); and Given a controlled report-like event (sentinel complaint fixture), When it lands, Then NO automatic visibility change occurs on the target project — the founder break-glass action is the only takedown mechanism. [cx: "probed" given deterministic observables — registries + a no-op report fixture]

## B. Break-glass — one action, four surfaces

- **AT-031.03 (P0)** — Given an `in_progress` project WITH a repo, When the founder fires break-glass as ONE action and it completes, Then all four surfaces are hidden: the marketplace listing is absent, the showcase card is absent, the public project page is unreachable/hidden, and the repository is no longer publicly visible — one action, four outcomes. [cx: the mid-action atomicity assertion removed — the requirement says one action hides everything, not that the changes are observably atomic across an external system]
- **AT-031.04 (P0)** — Given an `open` project WITHOUT a repo, When break-glass fires, Then the three platform surfaces hide and the action completes without error — the repo hide applies only when a repo exists.
- **AT-031.05 (P0)** — Given a project, When its lifecycle state is read immediately before and after the HIDE, and again immediately before and after the UN-HIDE (four reads), Then all four are IDENTICAL and no lifecycle event is emitted by either action — a visibility switch in both directions, never a transition. [cx: the un-hide direction previously checked only event absence — a silent state change could have passed]
- **AT-031.06 (P0)** — Given hidden projects, When each normal follow-up path is exercised (three fixtures: return to the NGO via its ordinary path; cancel via the normal cancellation path; un-hide), Then each works through its ORDINARY path with its normal outcome — hiding introduces no special-state machinery; and the un-hide restores every hidden surface to its prior visibility (listing, showcase, page, repo). [cx: the return-to-NGO fixture added — the clause names all three follow-ups]
- **AT-031.07 (P0)** — Given the hide and the un-hide, When the audit record is read, Then each action carries the actor, the timestamp, and the target project — both directions audited, and the un-hide is the SAME action in reverse (same audit record type, inverse effect).
- **AT-031.08 (P0)** — Given every non-founder role (NGO admin, the assigned volunteer, an unrelated authenticated account), When each attempts break-glass or un-hide, Then each is rejected — founder-only in both directions.
- **AT-031.09 (P0)** — Given a project hidden while `in_progress`, When the build-side surfaces are probed, Then the NGO and assigned volunteer retain their authenticated project access (dashboard, thread, Linear/mirror) — break-glass hides PUBLIC surfaces, it does not revoke participant access. 
- **AT-031.10 (P0)** — Given an erroneously APPROVED project now `open`, When break-glass fires, Then it is hidden pending the founder's follow-up through normal paths — the recovery path for a wrong triage approval exists. [cross: AT-023.17 owns the triage-side fixtures]

## Coverage map

| REQ-031 clause | Tests |
|---|---|
| Secret scanning + push protection org-wide (fresh repo inherits; sentinel push blocked) | 01 |
| No automated takedown surface in v1 (registry inventories + no-op report fixture) | 02 [cx] |
| One action hides listing + showcase + page + repo-when-exists | 03 [cx], 04 |
| Visibility switch, never a lifecycle transition (state identical around BOTH directions; no event) | 05 [cx] |
| Follow-up via normal paths (return-to-NGO, cancel, un-hide); un-hide restores; reversible | 06 [cx] |
| Audited both directions; un-hide = same action in reverse | 07 |
| Founder-only | 08 |
| Public surfaces only — participant access retained | 09 |
| Recovers erroneous triage approval | 10 |
