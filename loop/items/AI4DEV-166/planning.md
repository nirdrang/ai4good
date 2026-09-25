# PRD implementation planning record

The founder requested this update after the PRD conversation review on 2026-09-21.
The final clarification makes topic headings a progress overview and a way to focus shared chat.
This record is planning only. It is not a controller brief and does not pick up implementation work.

## Recorded development items

[AI4DEV-166 (PRD workspace)](https://linear.app/testnir/issue/AI4DEV-166) is the planning parent under the PM requirement.
All items remain in Backlog. These are implementation tasks, not completed features.

| Manifest unit | Board item | Acceptance |
| --- | --- | --- |
| D1.L1 | [AI4DEV-167 (shared PRD record)](https://linear.app/testnir/issue/AI4DEV-167/persist-the-shared-prd-actors-drafts-and-discovery-sources) | AT-036.01 and AT-036.02 |
| D2.L1 | [AI4DEV-168 (dependency questions)](https://linear.app/testnir/issue/AI4DEV-168/progress-prd-questions-by-dependency-and-recommend-semantic-handoff) | AT-036.03 |
| D2.L2 | [AI4DEV-169 (human turn authority)](https://linear.app/testnir/issue/AI4DEV-169/enforce-one-prd-human-turn-and-current-handoff-recommendations) | AT-036.09 |
| D3.L1 | [AI4DEV-170 (PRD topic navigator)](https://linear.app/testnir/issue/AI4DEV-170/show-prd-topic-progress-and-focus-the-shared-chat-by-topic) | AT-036.08 |
| D4.L1 | [AI4DEV-171 (PRD USD settlement)](https://linear.app/testnir/issue/AI4DEV-171/route-prd-requests-through-openrouter-and-settle-usd-once) | AT-036.05 and AT-036.07 |
| D5.L1 | [AI4DEV-172 (PRD completion check)](https://linear.app/testnir/issue/AI4DEV-172/recommend-prd-completion-only-from-current-resolved-scope-coverage) | AT-036.04 |
| D6.L1 | [AI4DEV-173 (PRD materialization)](https://linear.app/testnir/issue/AI4DEV-173/close-the-prd-and-resume-planning-package-materialization-before) | AT-036.06 |
| D7.L1 and D7.LW | [AI4DEV-174 (PRD interface wiring)](https://linear.app/testnir/issue/AI4DEV-174/wire-prd-chat-topic-navigation-actor-bookmarks-and-inline-actions) | AT-036.10 plus the wired re-run of the existing UI-bearing cases |

[AI4DEV-162 (Design screen inventory)](https://linear.app/testnir/issue/AI4DEV-162) depends on [AI4DEV-173 (PRD materialization)](https://linear.app/testnir/issue/AI4DEV-173).
Keep the existing Design items and reuse planned UI item identities during sign-off.

## Sources and verification

The accepted contract is design/prd-ui-contract.md.
The requirement, acceptance scenarios, and decomposition are synchronized through the editable PRD sources.
The existing Design extension is preserved.

Document assembly reproduces the PRD. The decomposition check maps all ten PRD cases exactly once and finds no requirement dependency cycle.
The executable PRD suite does not exist yet. The at:check command therefore reports its missing suite directory.
Implementation must add real atTest registrations and an honest expected-result manifest.
No production, integration, or wired acceptance pass is claimed.

The source changes remain local and uncommitted. The board records that condition.
Start implementation through the normal controller workflow and reuse these items.
