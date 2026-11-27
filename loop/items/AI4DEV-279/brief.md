# Brief for AI4DEV-279 (sign-in screen design)

Chain: AI4DEV-49 (screen design items) > AI4DEV-279 (sign-in screen design). Requirement: REQ-001 (accounts and sign-in), dev root AI4DEV-50 (auth root). Screen build is AI4DEV-280; screen wiring is AI4DEV-61.
Branch: claude/project-thread-igkbbt (cloud thread branch; the item's own Linear branch name is nirdrang/ai4dev-279-screen-design-sign-up-and-sign-in, and the pull request body carries `Closes AI4DEV-279` instead).
PRD slice: `loop/out/pure-s3-req-001-006.md`, lines 1-13:

> #### REQ-001: User Authentication & Org Membership
>
> Two-layer authorization: a global account type (NGO / volunteer / platform admin) plus a per-NGO role (admin / member, NGO accounts only); "NGO admin" means the admin role in that NGO. NGO users may belong to multiple NGOs; volunteers are individual accounts.
>
> - Sign-in by email/password, GitHub, or Google. A GitHub link is mandatory at volunteer signup; linking runs volunteer GitHub onboarding (REQ-007). Once volunteer signup is complete, that GitHub link is permanent: the volunteer cannot unlink the GitHub identity.
> - **Single-seat NGO in v1:** one NGO is one account performing every NGO-side action — funding, acknowledgments, scope edits, volunteer offboarding — without precluding later multi-member support (→ RM-12). Guards: every acknowledgment captures the acting person's name, title, and authority attestation (to bind the NGO, fund non-refundable fuel, accept no-SLA); an org email is preferred and shared credentials are prohibited (acknowledgments are per named human); an audited platform-admin contact-transfer/recovery path moves ownership to a new account, deactivates the old one, and preserves history; one non-login escalation contact is captured at concierge onboarding.
> - **Single-dev projects in v1:** one volunteer per project; no collaborator seats or co-volunteers (→ RM-13). (OD-1's "peer volunteer" is a bench reviewer, not a second project member.)
> - NGO data is visible only to its own account and the assigned volunteer, plus the platform admin (whose role spans all accounts for operations and support).
> - Password reset, email verification, and session management.
> - Lifecycle state (active/deactivated) gates every write (REQ-007 AUP) (→ RM-14).
>
> Dependencies: none.

Item text: see the board item AI4DEV-279; verbatim:

The screen design stage of the Sign-up and sign-in screen, for REQ-001. The ui-design skill runs this item.

It makes the screen on a Claude Design canvas from the PRD, in desktop and phone sizes. The canvas is a design, not app code, and this stage commits nothing under src/ or supabase/. The founder changes it in chat, and Codex reviews it as the screen's user until every interaction works. When the founder agrees the screen is complete, it updates the PRD for contract changes and big changes or additions, and it writes the acceptance tests. It adds their ids to the `verify:` field of the screen wiring leaf of D2 in the manifest (loop/decomp/req-001.md). That field lists the acceptance tests that leaf must turn green.

Where it comes from: the pilot plan's entry pieces (sign-up and sign-in, email first, Google after one proven round trip). No sign-up, sign-in, verification or reset screen exists; the only form is the email and password box inside the Discovery page. The backend for accounts, verification, sessions and reset (D1, D2.L1, D2.L2) is built and green; the complete-signup edge function exists. The screen covers sign-up with account type, sign-in, email verification, password reset, and the Google and GitHub buttons that REQ-001 requires. The founder delegated this design run on 2026-11-27 (Codex personas review it, the lead makes the calls, the founder reviews on the pull request).

Done when: the founder agrees the screen is complete, the canvas copy is in design/canvas/sign-in/project/, and the new acceptance tests are pending stubs.
Acceptance tests: none turn green in this stage. New ids register as pending, under `tests/at/suites/req-001/`.

## The ask
Follow the ui-design skill. It opens the pull request and closes the item.
The founder delegated the run (2026-11-27, decision card "Three stages, design delegated"): the lead makes the design calls, records each as a lead call in the review record, and the founder reviews them on the pull request. Before the pull request, run deslop, the comment audit and interrogate (project instruction).
