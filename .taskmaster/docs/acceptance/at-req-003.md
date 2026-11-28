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

## E. Intake screen [d106: screen design 2026-11-27]

These tests drive the intake screen through its `data-testid` handles, at phone size (390 by 844) and at desktop size (1280 by 900). The design copy is `design/canvas/project-intake/project/`.

- **AT-003.19 (P0)** — Given an NGO admin with no project and no draft, When they open Your projects, Then `projects-empty` and `projects-start-button` show; and When they press it, Then the intake form shows `project-title-input`, `problem-description-input`, the three `urgency-option` items (`urgent`, `soon`, `flexible`) and `intake-public-notice`, and no file control. [d101]
- **AT-003.20 (P0)** — Given the intake form, When the admin types, Then `draft-save-state` shows that the draft is saving and then saved, with no save button; When they go back to Your projects, Then `project-draft-card` shows the draft title and `projects-start-button` is absent (one draft at a time); When they press `project-draft-continue`, Then the step they left (the form, or the preview if they left from there) shows the typed content; and When the title and description are both cleared, Then no draft remains.
- **AT-003.21 (P0)** — Given a draft, When the admin presses `project-draft-discard`, Then `project-draft-discard-confirm` names the draft with keyboard focus on `project-draft-discard-no`; `project-draft-discard-no` or Escape keeps the draft and returns focus to `project-draft-discard`, and `project-draft-discard-yes` deletes it, shows `project-draft-discarded` with focus on the Your projects heading, and brings back `projects-start-button`.
- **AT-003.22 (P0)** — Given the intake form with the title or description empty, only spaces, or over its limit (80 and 2,000 characters, counted as the person sees them), or no urgency chosen, When the admin presses `intake-review-button`, Then the screen stays on the form, shows `title-error`, `description-error` or `urgency-error` for each problem and `intake-error-summary` naming them, and moves focus to the first field with a problem, with its error message in view.
- **AT-003.23 (P0)** — Given a title or description that holds an email address, a phone number or a street address (a time such as 09.00 - 11.30, a range such as 1000 - 2000, a year range, a date or a plain 7 to 9 digit number is not a phone number), When it is typed, Then `personal-detail-hint` shows beside that field; When the admin opens the preview, Then `intake-personal-block` names what was found, the confirmation checkbox and `intake-submit-button` are disabled, and `intake-personal-fix` opens the form with focus on that field. Given text that only looks like a person's name or a health detail, Then `personal-detail-hint` and `intake-personal-warning` show, and posting stays possible; the words of a street address never count as a name.
- **AT-003.24 (P0)** — Given a complete draft, When the admin presses `intake-review-button`, Then `public-card-preview` shows the title, description, urgency, NGO name and the state "Intake", with the title and description trimmed exactly as they will be published, and the page says the card is not posted yet; When they press `intake-submit-button` before ticking `intake-confirm-no-personal`, Then `intake-confirm-error` shows and nothing is posted; and While the post is running, Then `intake-edit-button`, `intake-name-fix`, the checkbox, `account-button` and the navigation are disabled.
- **AT-003.25 (P0)** — Given a confirmed preview, When the admin posts, Then the Discovery chat opens with `intake-posted-banner`; `intake-card-link` opens the public list with the new `public-intake-card` first and `list-back-to-chat` returns to the chat; Your projects shows a `project-card` for the project and no draft, and its `project-continue-discovery` reopens the chat with `project-card-link`, which opens the public list at that project's `public-intake-card` with focus on its title, and the next Tab reaches `list-back-to-chat`. [cross: AT-003.12, AT-003.18]
- **AT-003.26 [retired — founder 2026-11-28, "Members can wait post pilot": the pilot NGO is a single admin account, so there is no member notice; re-add with the multi-member roadmap item. AT-003.04 still rejects a non-admin at the backend]**
- **AT-003.27 (P0)** — Given the intake screens at phone size, Then every control is at least 44 px high and nothing scrolls sideways; Given the Account dialog, When it opens, Then focus moves into it, Tab and Shift+Tab stay inside it (also after a click on its text), and Escape closes it and returns focus to `account-button`; and Given a signed-out visitor, Then `account-button` is absent, the public list still opens, and `header-sign-in` on the list opens the sign-in screen.

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
| The intake screen: start, autosave and one draft, discard, checks, contact-detail block, preview and confirmation, post into Discovery, phone and keyboard use [d106] | 19–25, 27 |
