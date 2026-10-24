# Change order 017: Intake takes no file uploads

Date: 2026-10-24. Decision d101.

## Founder ruling, in the founder's words

In the project thread, the founder asked why the attachments requirement includes uploads at intake. They were told that Discovery now asks for files and reads them itself, and asked whether intake still needs its own upload. The founder answered: "No file uploads on intake update prd and items".

## What changes

REQ-003, in `loop/out/pure-s3-req-001-006.md` (assembled into `.taskmaster/docs/prd-mvp.md` and `.taskmaster/docs/requirements/req-003.md`). Before:

> An optional reference-file upload (screenshot, spreadsheet, blank form, mockup, requirements doc) is available for Discovery and the volunteer, shown with the data-responsibility disclosure, which is hardened once Tier-2 sensitivity becomes known (REQ-032).

After:

> Intake takes no file uploads. Reference files are added during Discovery, when the agent asks for them, or from the project page before completion (REQ-032).

The sentence "Reference files stay private." leaves the intake-card bullet, and REQ-032 leaves REQ-003's dependency line.

REQ-032, in `loop/out/pure-s6-req-027-036.md`. Before:

> Files can be uploaded at intake, during Discovery (the agent may ask), or from the project page pre-completion. [...] While the project is not funded, the NGO can add at most three files during Discovery; intake files do not count toward this limit.

After:

> Files can be uploaded during Discovery (the agent may ask) or from the project page pre-completion; intake takes no files. [...] While the project is not funded, the NGO can add at most three files during Discovery.

Acceptance: AT-003.07, AT-003.09, AT-003.10 and AT-003.11 are retired. AT-003.18, AT-032.01, AT-032.13 and AT-004.70 lose their intake-file clauses, tagged `[d101]`. The upload disclosure and its Tier-2 hardening stay in AT-032.06.

Manifests: `loop/decomp/req-003.md` retires deliverable D2 and drops REQ-032 from `depends-on`. `loop/decomp/req-032.md` makes D1.L3 a two-moment integration.

## The screens

- Project intake (`design/ui-ux-instructions.md` row 5): no upload control. The intake screen has no canvas yet, so nothing else changes.
- Reference files (row 7): upload mid-Discovery or from the project page, never at intake.
- Discovery (`design/discovery-ui-contract.md`): every file in the file panel was added during Discovery. The approved canvas in `design/canvas/discovery/project/` still shows one intake file in its sample data. It is not revised here; the next Discovery screen design pass removes it.

## Code

The intake attach action, the intake file list on the need, and the intake origin in the Discovery file panel are still in the code. A follow-up change removes them.
