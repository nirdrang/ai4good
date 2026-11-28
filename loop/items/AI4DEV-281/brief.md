# Brief for AI4DEV-281 (create organization and home design)

Chain: AI4DEV-49 (design work) > AI4DEV-281 (create organization and home design)
Branch: claude/project-thread-9ywpot (cloud project thread; the Linear branch name is nirdrang/ai4dev-281-screen-design-create-organization-and, and the pull request links the item with one line `Closes AI4DEV-281`)
PRD slice: loop/out/pure-s3-req-001-006.md, line 16, "REQ-002: NGO Organization Profile & Founder Vetting", verbatim:

#### REQ-002: NGO Organization Profile & Founder Vetting

NGOs sign up (email-verified) and complete an org profile. v1 trust is a founder-vetted flag applied during concierge onboarding; the verification machinery is deferred (→ RM-6). Two tiers:

1. **Unverified** — email-verified, the Discovery access floor. May draft projects and use an enrolled project's daily allowance or paid fuel. Cannot publish.
2. **Vetted** — one audited admin action at concierge onboarding. May publish and fund. The default for admitted pilot NGOs. Vetting raises the daily Discovery grant from 10 to 30 free turns.

- The NGO admin creates and edits the profile (name, mission, country, website, logo).
- The profile's mission text is one input the Discovery pass reads to generate cause labels (REQ-004); there is no separate cause-category field or admin taxonomy surface here.
- Email verification precedes any Discovery message; vetting gates publishing, never Discovery.
- **The vetting action is audited:** it records who vetted and when, the NGO legal/display name, a public reference link, the contact's name + title + authority attestation, the evidence type, and a note; unvet/revoke exists; vet/unvet emits the verification-outcome notification through the normal event path (REQ-016).
- **Evidence rule (PII-minimizing):** public evidence is preferred (registry, website, EIN); emailed registration documents have only their metadata recorded and the copy deleted after vetting; no sensitive personal identity documents in v1; nothing may imply a document review that did not occur.
- **No public "verified" claim in v1** — the flag may show only as "founder-vetted" (→ RM-6).
- **Pilot enrollment:** the initial cohort contains at most 20 NGOs, with one sponsored project per NGO. Each enrolled project receives 10 free turns per UTC day, or 30 when its NGO is vetted. There is no lifetime turn cap. Enrollment records the NGO and project. Additional projects receive no new grant. Vetting raises the daily grant from 10 to 30 without resetting consumed turns. Re-vetting, project recreation, or reopening Discovery never resets consumed turns or creates another sponsorship.
- Only vetted NGOs publish; an unvetted NGO may reach `scoped` with publishing disabled.
- The daily allowance resets at 00:00 UTC without rollover to 10 free turns, or 30 when the NGO is vetted. Free capacity is the daily grant minus turns used today. Existing v1 membership remains single-seat; future members share the sponsored project's daily allowance.
- A paid "Discovery wallet" is excluded in v1 and v1.5 (→ RM-6).

Dependencies: REQ-001.

---

Also read: .taskmaster/docs/requirements/req-013.md (NGO dashboard; the pilot takes only the project list) and req-001.md (org membership).

Screen rows: design/ui-ux-instructions.md, row 3 "NGO org profile" and row 10 "NGO dashboard". No screen contract exists yet. Row 5 (intake, d106) already has a "Your projects" list; this screen must agree with it.
Item text: see the Linear item AI4DEV-281. In short: create the organization after sign-up (name, mission, country, website, logo), then the home page with the organization's project cards and a way to start a new project. Backend exists: create-organization, set-organization-profile, update-organization, organization-dashboard edge functions. Screen wiring adds an edge function that returns the caller's own organizations. Done when the canvas copy is in design/canvas/org-home/project/ and the new acceptance tests are pending stubs.
Acceptance tests: .taskmaster/docs/acceptance/at-req-002.md; tests/at/suites/req-002/. None turn green in this stage. New ids register as pending.

Founder direction for this run (2026-11-27, project chat, Nir answered "Yes" to starting create organization and the home page). The coordinator relayed: make the product calls, list them for the founder; persona reviews with outside models (Codex gpt-6.2 Sol and Gemini via agy); phone and desktop (1280x900); keep the visual language of the intake and sign-in designs; pilot ends at the Discovery brief; platform funds AI in the pilot; keep d96 as written.

## The ask
Follow the ui-design skill. It opens the pull request and closes the item.
