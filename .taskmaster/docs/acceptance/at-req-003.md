# AT-REQ-003 — Project Need Creation (free-text intake)

Source: prd-mvp.md REQ-003 (isolated: requirements/req-003.md). Dependencies: REQ-001, REQ-002, REQ-032.

**Boundary note [cx]:** REQ-003 owns intake capture, the upload being *available at intake* + its disclosure + Tier-2 hardening, autosave, submission-begins-Discovery, and raw-intake retention. Tested in their owning suites (setup only here): file **format/size caps + metadata listing** → AT-REQ-032; **Discovery/volunteer access** to uploaded files → AT-REQ-004 / AT-REQ-032; the **email-verification/capacity submission gate + remedies** → AT-REQ-005.5; **cross-NGO isolation** → AT-REQ-001.

## A. Intake capture

- **AT-003.01 (P0)** — Given an NGO admin (any tier, including unvetted), When they start a Project Need with a title and free-text problem description, Then a draft is created and both fields persist.
- **AT-003.02 (P0)** — Given the intake form, When cause tags and urgency are set, Then both persist and render on the draft.
- **AT-003.03 (P0)** — Given an intake attempt missing the free-text problem description, When submitted to Discovery, Then submission is blocked. [cx: dropped the invented "missing input named" assertion]
- **AT-003.04 (P0)** — Given an NGO member WITHOUT the admin role (or a volunteer/visitor), When it attempts to start a Project Need for its own NGO, Then the attempt is rejected — an NGO admin starts the Need. [cx: reworded — "any NGO incl. unvetted can create a draft" (REQ-005.5) means the gate is the admin *role*, not the NGO; cross-org isolation is AT-REQ-001] [cross: REQ-001]

## B. Draft autosave

- **AT-003.05 (P0)** — Given an NGO admin typing intake content, When they navigate away or close the session WITHOUT any explicit save action, Then returning shows the draft with the typed content intact — drafts persist automatically.
- **AT-003.06 [retired — cx: crash/network-recovery is not a REQ-003 clause; AT-003.05 already covers deterministic autosave→restore]**

## C. Reference-file upload at intake [cross: REQ-032]

- **AT-003.07 (P0)** — Given the intake surface, When the NGO uploads a reference file, Then the upload is available at intake and the file is attached to the draft. [cx: scoped to REQ-003 ownership — format matrix + metadata listing are AT-REQ-032]
- **AT-003.08 [retired — cx: size caps / unsupported-type rejection are REQ-032 obligations → AT-REQ-032]**
- **AT-003.09 (P0)** — Given any intake upload, When the upload surface renders, Then the data-responsibility disclosure is shown (redacted/sample data only; ai4good and the volunteer will see the files).
- **AT-003.10 (P0)** — Given a project later classified Tier-2 [cross: REQ-004], When the NGO uploads further files, Then the disclosure is hardened to the Tier-2 form (hard acknowledgment restating fixtures-only).
- **AT-003.11 (P0)** — Given intake without any upload, When submitted, Then Discovery proceeds — the upload is optional. [cx: promoted P1→P0]

## D. Submission → Discovery

- **AT-003.12 (P0)** — Given a complete draft by an email-verified NGO admin with Discovery capacity (free credits or funded fuel), When submitted, Then Discovery begins and the project state moves `draft → discovery_in_progress` [cross: REQ-005.5].
- **AT-003.13 [retired — cx: the email-verification/capacity rejection + remedies is a REQ-005.5 lifecycle obligation → AT-REQ-005.5]**
- **AT-003.14 (P0)** — Given an intake submitted, When submission completes, Then a retained audit snapshot equal to the submitted raw intake is created at that moment. [cx: split — snapshot-at-submission]
- **AT-003.16 (P0)** — Given a submitted intake later altered by Discovery or NGO edits, When the working content changes, Then the raw-intake audit snapshot stays unmodified and retrievable by the platform. [cx: split — later-edit immutability]

- **AT-003.15 [retired — cx: cross-NGO draft isolation is a REQ-001 obligation → AT-REQ-001.21]**

## Coverage map

| REQ-003 clause | Tests |
|---|---|
| Intake captures title, problem description, cause tags, urgency | 01–03 |
| An NGO admin starts the Need (admin role required) | 01, 04 |
| Optional reference upload available at intake, shown with data-responsibility disclosure | 07, 09, 11 |
| Disclosure hardened once Tier-2 known | 10 |
| Drafts persist automatically, no explicit save | 05 |
| On submission Discovery begins | 12 |
| Raw intake retained for audit (snapshot at submission + later immutability) | 14, 16 |

