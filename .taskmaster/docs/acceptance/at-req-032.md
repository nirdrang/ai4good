# AT-REQ-032 — Project Need Attachments (NGO reference files for Discovery + build)

Source: requirements/req-032.md (prd-mvp.md REQ-032). Dependencies: REQ-004, REQ-005, REQ-010, REQ-028, REQ-030.

**Boundary note:** REQ-032 owns upload moments, types/caps, the access model, the disclosure posture, Discovery/build usage semantics, and the file lifecycle (listing, deletion, audit). Discovery's chat mechanics are REQ-004's; the Skill download helper AT-028.16's; the credential-compromise freeze AT-030.05's; tier definitions REQ-003's — `[cross:]` here.

## A. Upload moments & constraints

- **AT-032.01 (P0)** — Given the three upload moments — intake, during Discovery (on the agent's ask), and the project page before completion — When a file is uploaded at each, Then each upload succeeds and the file is attached to the project; and Given a COMPLETED project, When an upload is attempted from its page, Then it is rejected — pre-completion is the boundary.
- **AT-032.02 (P0)** — Given one file of each supported type (PDF, an image, CSV, TSV, TXT, DOCX, XLSX), When each is uploaded, Then each is accepted; and Given a sentinel unsupported type, Then it is rejected with no file attached.
- **AT-032.03 (P0)** — Given the configured per-file and per-project size caps, When a file just under the per-file cap is uploaded, Then it succeeds; just over, Then it is rejected; and When an upload would push the project's aggregate just over the per-project cap, Then it is rejected while the just-under aggregate stands — both caps discriminate independently.

## B. Access model

- **AT-032.04 (P0)** — Given the full actor matrix, When each requests a file: the project's NGO account, the ASSIGNED volunteer, and the platform admin succeed; a different NGO, a non-assigned volunteer, and an unauthenticated request are each rejected — the repo is public but the files are restricted.
- **AT-032.05 (P0)** — Given an authorized short-lived link, When used fresh, Then the file downloads; when used after its expiry (controlled clock), Then it is rejected; and When the UI/client bundle and its requests are inspected, Then no storage credential is present anywhere — authorized links are the only access path.

## C. PII posture (governance by disclosure)

- **AT-032.06 (P0)** — Given every upload surface, When it renders, Then the disclosure is present: redacted/sample data only — no real beneficiary records — and that ai4good and the volunteer will see the files; and Given a Tier-2 project, When an upload is attempted BEFORE the hard fixtures-only acknowledgment is recorded, Then the upload does not proceed; after it is recorded once, uploads proceed; a Tier-1 project requires no hard acknowledgment. [cross: REQ-003 owns tier assignment]
- **AT-032.07 (P0)** — Given the v1 posture, When an upload flows, Then NO content scanning step exists in the path (absence probe) — the risk sits with the NGO under the data-responsibility acknowledgment, and the upload is not delayed or blocked on any analysis.

## D. Discovery & build usage

- **AT-032.08 (P0)** — Given files with sentinel names and one-line descriptions, When Discovery runs, Then the names + descriptions ride the agent's context (sentinels observable), and a Discovery question and the scope doc CAN cite a file (fixture produces a citation).
- **AT-032.09 (P0)** — Given the FREE Discovery phase, When the agent reads a file, Then the NGO's credit balance is unchanged (file reads never consume credits) and the session is not interrupted; and Given a FUNDED project, When a file is read in a turn, Then that turn's fuel consumption reflects it like any other turn — metered as fuel, never as credits. [cross: REQ-004 owns the credit meter; REQ-006 the fuel meter]
- **AT-032.10 (P0)** — Given the assigned volunteer, When they download files, Then the download succeeds from the project page path under their authorization [cross: AT-028.16 owns the Skill helper]; and the default download flow places files OUTSIDE the repo's normal contents (the seeded ignore rules cover the download location) — an accidental-commit residual is accepted at pilot scale and NOT asserted against beyond the default-flow protection. [cross: AT-008.16 owns the seeded ignore/hygiene]

## E. Listing, deletion & audit

- **AT-032.11 (P0)** — Given uploaded files, When the project page lists them, Then each shows name, type, uploader, and description; When a file is deleted, Then it leaves the listing but remains RECOVERABLE, and after recovery the deletion history is still auditable; and every upload and delete carries an audit record (actor + timestamp).

## Coverage map

| REQ-032 clause | Tests |
|---|---|
| Three upload moments; pre-completion boundary | 01 |
| Supported types accepted; unsupported rejected | 02 |
| Per-file + per-project caps (both discriminate) | 03 |
| Access limited to NGO/assigned volunteer/admin; others rejected | 04 |
| Short-lived authorized links; no storage credentials in the UI | 05 |
| Disclosure everywhere; Tier-2 hard fixtures-only ack gates upload; Tier-1 no hard ack | 06 |
| No upload scanning in v1 (NGO owns the risk) | 07 |
| Discovery cites files; names + descriptions ride context | 08 |
| File reads: never credits, never interrupt; fuel on funded projects | 09 |
| Volunteer download from page; kept out of repo contents (default flow; residual accepted) | 10 |
| Page listing metadata; delete → recoverable; deletion history auditable; uploads/deletes audited | 11 |
