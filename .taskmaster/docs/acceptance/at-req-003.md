# AT-REQ-003 — Project Need Creation (free-text intake)

Source: prd-mvp.md REQ-003 (isolated: requirements/req-003.md). Dependencies: REQ-001, REQ-002.

**Boundary note [cx]:** REQ-003 owns intake capture, autosave, submission-begins-Discovery, and raw-intake retention. Intake takes no file uploads [d101]; reference files, their disclosure and its Tier-2 hardening are REQ-032's (AT-REQ-032). Tested in their owning suites (setup only here): the **email-verification/capacity submission gate + remedies** → AT-REQ-005.5; **cross-NGO isolation** → AT-REQ-001.

## A. Intake capture

- **AT-003.01 (P0)** — Given an NGO admin (any tier, including unvetted), When they start a Project Need with a title and free-text problem description, Then a draft is created and both fields persist.
- **AT-003.02 (P0)** — Given the intake form, When urgency is set, Then it persists and renders on the draft. [d90: cause tags removed from intake capture — no cause field exists here; the taxonomy is machine-generated post-Discovery, REQ-004]
- **AT-003.03 (P0)** — Given an otherwise-complete draft by an email-verified NGO admin WITH Discovery capacity, missing ONLY the free-text problem description, When submitted, Then submission is blocked — isolating the missing-description gate from the verification/capacity gate. [cx r2: isolated so an unrelated gate can't produce the block]
- **AT-003.04 (P0)** — Given an NGO member WITHOUT the admin role (or a volunteer/visitor), When it attempts to start a Project Need for its own NGO, Then the attempt is rejected — an NGO admin starts the Need. [cx: reworded — "any NGO incl. unvetted can create a draft" (REQ-005.5) means the gate is the admin *role*, not the NGO; cross-org isolation is AT-REQ-001] [cross: REQ-001]
- **AT-003.17 (P0)** — Given a freshly created draft (pre-Discovery), When its cause labels are read through any supported UI/API, Then none are shown — a draft legitimately carries zero cause labels until Discovery runs and generates them (REQ-004). [d90]

- **AT-003.18 (P0)** — Given the intake form, When it renders before submission, Then it states plainly that the title and description will be public on submission and must not contain names, health details, or other personal details of beneficiaries; and When the intake is submitted, Then its intake card is public at once (title, description, urgency) [cross: AT-011.15]. [d96] [d101: the reference-file clause left with intake uploads]

- **AT-003.05 (P0)** — Given an NGO admin typing intake content, When they navigate away or close the session WITHOUT any explicit save action, Then returning shows the draft with the typed content intact — drafts persist automatically.
- **AT-003.06 [retired — cx: crash/network-recovery is not a REQ-003 clause; AT-003.05 already covers deterministic autosave→restore]**

## C. Reference-file upload at intake [retired — d101: intake takes no file uploads; files are added during Discovery or from the project page (REQ-032)]

- **AT-003.07 [retired — d101: intake takes no file uploads]**
- **AT-003.08 [retired — cx: size caps / unsupported-type rejection are REQ-032 obligations → AT-REQ-032]**
- **AT-003.09 [retired — d101: no intake upload surface, so no intake disclosure; the upload disclosure is AT-032.06]**
- **AT-003.10 [retired — d101: no intake upload surface; Tier-2 hardening of the upload disclosure is AT-032.06]**
- **AT-003.11 [retired — d101: with no intake upload, submission without a file is AT-003.12]**

## D. Submission → Discovery

- **AT-003.12 (P0)** — Given a complete draft by an email-verified NGO admin with Discovery capacity (free credits or funded fuel), When submitted, Then Discovery begins and the project state moves `draft → discovery_in_progress` [cross: REQ-005.5].
- **AT-003.13 [retired — cx: the email-verification/capacity rejection + remedies is a REQ-005.5 lifecycle obligation → AT-REQ-005.5]**
- **AT-003.14 (P0)** — Given an intake submitted, When submission completes, Then a retained audit snapshot equal to the submitted raw intake is created at that moment. [cx: split — snapshot-at-submission]
- **AT-003.16 (P0)** — Given a submitted intake later altered by Discovery or NGO edits, When the working content changes, Then the raw-intake audit snapshot stays unmodified and retrievable by the platform. [cx: split — later-edit immutability]

- **AT-003.15 [retired — cx: cross-NGO draft isolation is a REQ-001 obligation → AT-REQ-001.21]**

## Coverage map

| REQ-003 clause | Tests |
|---|---|
| Intake captures title, problem description, urgency — no cause field at intake | 01–03 |
| Pre-Discovery draft shows zero cause labels | 17 [d90] |
| An NGO admin starts the Need (admin role required) | 01, 04 |
| Drafts persist automatically, no explicit save | 05 |
| On submission Discovery begins | 12 |
| Raw intake retained for audit (snapshot at submission + later immutability) | 14, 16 |
| Intake form warns the description is public; card public on submission [d96] | 18 |
