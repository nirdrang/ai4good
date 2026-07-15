# AT-REQ-003 — Project Need Creation (free-text intake)

Source: prd-mvp.md REQ-003 (+ REQ-005.5 draft→Discovery gate; REQ-032 attachments at its boundary). Dependencies: REQ-001, REQ-002, REQ-032.

## A. Intake capture

- **AT-003.01 (P0)** — Given an NGO admin (any tier, including unvetted), When they start a Project Need with a title and free-text problem description, Then a draft is created and both fields persist.
- **AT-003.02 (P0)** — Given the intake form, When cause tags and urgency are set, Then both persist and render on the draft.
- **AT-003.03 (P0)** — Given an intake attempt missing the free-text problem description, When submitted to Discovery, Then submission is blocked with the missing input named.
- **AT-003.04 (P1)** — Given a non-admin account (volunteer, other NGO, visitor), When it attempts to start a Project Need, Then the attempt is rejected [cross: REQ-001].

## B. Draft autosave

- **AT-003.05 (P0)** — Given an NGO admin typing intake content, When they navigate away or close the session WITHOUT any explicit save action, Then returning shows the draft with the typed content intact — drafts persist automatically.
- **AT-003.06 (P1)** — Given an interrupted session (browser crash / network drop mid-typing), When the NGO returns, Then the draft reflects the last autosaved state and no error blocks resuming.

## C. Reference-file upload at intake [cross: REQ-032]

- **AT-003.07 (P0)** — Given the intake surface, When the NGO uploads a reference file of a supported type (PDF, image, CSV/TSV, TXT, DOCX/XLSX), Then the upload succeeds, is listed with its metadata, and is attached to the draft.
- **AT-003.08 (P0)** — Given an upload, When it violates the per-file or per-project size caps or is an unsupported type, Then it is rejected with the constraint stated.
- **AT-003.09 (P0)** — Given any intake upload, When the upload surface renders, Then the data-responsibility disclosure is shown (redacted/sample data only; ai4good and the volunteer will see the files).
- **AT-003.10 (P0)** — Given a project later classified Tier-2 [cross: REQ-004], When the NGO uploads further files, Then the disclosure is hardened to the Tier-2 form (hard acknowledgment restating fixtures-only).
- **AT-003.11 (P1)** — Given intake without any upload, When submitted, Then Discovery proceeds — the upload is optional.

## D. Submission → Discovery

- **AT-003.12 (P0)** — Given a complete draft by an email-verified NGO admin with Discovery capacity (free credits or funded fuel), When submitted, Then Discovery begins and the project state moves `draft → discovery_in_progress` [cross: REQ-005.5].
- **AT-003.13 (P0)** — Given a draft submitted by an email-unverified account or one with no Discovery capacity, When submitted, Then the transition is blocked and the NGO is shown its remedies (verify, fund now, or return later) [cross: REQ-005.5].
- **AT-003.14 (P0)** — Given a submitted intake, When Discovery or later edits alter the working content, Then the raw original intake remains retained for audit, unmodified and retrievable by the platform.

## E. Isolation

- **AT-003.15 (P0)** — Given NGO A's draft, When NGO B or an unassigned volunteer requests it by UI or direct ID, Then access is denied — drafts are visible only to their own NGO [cross: REQ-001].

## Coverage map

| REQ-003 clause | Tests |
|---|---|
| Intake captures title, problem description, cause tags, urgency | 01–03 |
| Free-text description begins Discovery | 12 |
| Optional reference upload, shown with data-responsibility disclosure | 07–09, 11 |
| Disclosure hardened once Tier-2 known | 10 |
| Drafts persist automatically, no explicit save | 05, 06 |
| On submission Discovery begins | 12, 13 |
| Raw intake retained for audit | 14 |
| Creator/permission boundary + isolation | 01, 04, 15 |
