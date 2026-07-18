# AT-REQ-032 — Project Need Attachments (NGO reference files for Discovery + build)

Source: requirements/req-032.md (prd-mvp.md REQ-032). Dependencies: REQ-004, REQ-005, REQ-010, REQ-028, REQ-030.

**Boundary note:** REQ-032 owns upload moments, types/caps, the access model, the disclosure posture, Discovery/build usage semantics, and the file lifecycle (listing, deletion, audit). Discovery's chat mechanics are REQ-004's; the Skill download helper AT-028.16's; the credential-compromise freeze AT-030.05's; tier definitions REQ-003's — `[cross:]` here.

## A. Upload moments & constraints

- **AT-032.01 (P0)** — Given the three upload moments — intake, during Discovery (on the agent's ask), and the project page before completion — When a file is uploaded at each, Then each upload succeeds and the file is attached to the project; and Given a COMPLETED project, When an upload is attempted from its page, Then it is rejected — pre-completion is the boundary.
- **AT-032.02 (P0)** — Given one file of each named supported type (PDF, an image, CSV, TSV, TXT, DOCX, XLSX), When each is uploaded, Then each is accepted. No unsupported-type rejection is asserted — the requirement says supported types "include" these; it defines no exhaustive allow-list. [cx r2: the rejection assertion added behavior]
- **AT-032.03 (P0)** — Given the configured per-file and per-project size caps, When a file just under the per-file cap is uploaded, Then it succeeds; just over, Then it is rejected; and When an upload would push the project's aggregate just over the per-project cap, Then it is rejected while the just-under aggregate stands — both caps discriminate independently.

## B. Access model

- **AT-032.04 (P0)** — Given the full actor matrix, When each requests a file: the project's NGO account, the ASSIGNED volunteer, and the platform admin succeed; a different NGO, a non-assigned volunteer, and an unauthenticated request are each rejected — the repo is public but the files are restricted; and Given a volunteer whose assignment is REMOVED (release fixture), When they request a file after the removal, Then the request is rejected — "assigned" is current, not historical. [cx: the stale-access negative added — a never-assigned rejection did not prove revocation]
- **AT-032.05 (P0)** — Given an authorized short-lived link, When used fresh, Then the file downloads; when used after its expiry (controlled clock), Then it is rejected; and When the UI/client bundle and its requests are inspected, Then no storage credential is present anywhere — authorized links are the only access path.

## C. PII posture (governance by disclosure)

- **AT-032.06 (P0)** — Given the upload flow, When the NGO engages it, Then the disclosure is observably delivered: redacted/sample data only — no real beneficiary records — and that ai4good and the volunteer will see the files; and Given a Tier-2 project, When an upload is attempted BEFORE the hard acknowledgment is recorded, Then the upload does not proceed, and the RENDERED acknowledgment text is inspected to carry all three statements — fixtures-only, the NGO connects real data ITSELF in its OWN environment AFTER completion, and NGO risk ownership — with the recorded acknowledgment auditable; and When the SAME Tier-2 upload is retried after the acknowledgment is recorded, Then it succeeds and attaches — the acknowledgment enables the governed flow, not a permanent block. A Tier-1 project requires no REQ-032-SPECIFIC fixtures-only upload acknowledgment (the separate REQ-004/Promise data-responsibility acknowledgments at their own gates are untouched). Neither per-surface repetition nor a once-only cadence is asserted — the requirement defines neither. [cx: content verified, cadence removed] [cx r2: post-ack retry added; Tier-1 negation scoped — the unqualified form contradicted REQ-004/Promise §9] [cross: REQ-003 owns tier assignment]
- **AT-032.07 (P0)** — Given instrumented scan-service calls and the background-job queue, When a sentinel file is uploaded and all post-upload work drains, Then ZERO content-scan invocations and zero scan jobs occurred (synchronous or asynchronous) and the upload was not delayed or blocked on any analysis — the risk allocation itself is proven by the acknowledgment content in AT-032.06. [cx] [cx r2: oracle defined — an async post-upload scanner could have passed the in-path-only check]

## D. Discovery & build usage

- **AT-032.08 (P0)** — Given files with sentinel names and one-line descriptions, When Discovery runs, Then the names + descriptions ride the agent's context (sentinels observable), and a Discovery question and the scope doc CAN cite a file (fixture produces a citation).
- **AT-032.09 (P0)** — Given two equivalent FREE-phase Discovery turns — one with a file read, one without (differential fixture) — When credit consumption is compared, Then the file read adds NO incremental credit charge (the turn itself still meters per REQ-004) and the session is not interrupted by the read; and Given a FUNDED project, When a file is read in a turn, Then that turn's fuel consumption reflects it like any other turn — metered as fuel, never as credits. [cx: zero-credit-turn over-assertion corrected — REQ-004 meters the turn; only the READ is free] [cross: REQ-004 owns the credit meter; REQ-006 the fuel meter]
- **AT-032.10 (P0)** — Given the assigned volunteer, When they download files, Then the download succeeds from the project page path under their authorization [cross: AT-028.16 owns the Skill helper]; and after the default download flow completes, the files are NOT part of the repo's normal/tracked contents (outcome only — the mechanism, ignore rules or a location outside the repo, is unprescribed) — an accidental-commit residual is accepted at pilot scale and NOT asserted against beyond the default-flow outcome. [cx r2: the seeded-ignore-rules mechanism was an implementation prescription] [cross: AT-008.16 owns seeded hygiene]

## E. Listing, deletion & audit

- **AT-032.11 (P0)** — Given uploaded files, When the project page lists them, Then each shows name, type, uploader, and description; When a file is deleted, Then it leaves the listing; When it is RECOVERED, Then it reappears in the listing with its original metadata AND an authorized download returns the original sentinel content — recovery proven, not asserted; after recovery the deletion history is still auditable; and every upload and delete carries an audit record (actor + timestamp). [cx: a no-op recovery could have passed]
- **AT-032.12 (P0)** — Given content-only sentinels embedded INSIDE one file of EVERY named supported format — a PDF phrase, an image-rendered sentinel, a CSV cell, a TSV cell, a TXT line, a DOCX paragraph, and an XLSX cell (none present in any file name or description), When Discovery engages the files, Then an observable Discovery question or scope-doc output derives content from EACH — the files are READ multimodally across all seven formats, not merely listed. [cx: added] [cx r2: extended from three formats to all seven — TSV/TXT/DOCX/XLSX read-paths were uncovered]

## Coverage map

| REQ-032 clause | Tests |
|---|---|
| Three upload moments; pre-completion boundary | 01 |
| Named supported types accepted (no exhaustive allow-list asserted) | 02 [cx r2] |
| Per-file + per-project caps (both discriminate) | 03 |
| Access limited to NGO/CURRENTLY-assigned volunteer/admin; others + former volunteer rejected | 04 [cx] |
| Short-lived authorized links; no storage credentials in the UI | 05 |
| Disclosure delivered; Tier-2 hard ack gates upload with CONTENT verified + auditable + post-ack retry succeeds; Tier-1 = no REQ-032-specific ack (other PRD ack gates untouched); no invented cadence | 06 [cx r2] |
| No upload scanning in v1 (instrumented: zero scan calls/jobs, sync or async) | 07 [cx r2] |
| Discovery cites files; names + descriptions ride context; contents READ multimodally across ALL seven formats | 08, 12 [cx r2] |
| File reads: no incremental credit charge (differential), never interrupt; fuel on funded projects | 09 [cx] |
| Volunteer download from page; kept out of repo tracked contents (outcome only, mechanism unprescribed; residual accepted) | 10 [cx r2] |
| Page listing metadata; delete → RECOVERY PROVEN (metadata + original content); deletion history auditable; uploads/deletes audited | 11 [cx] |
