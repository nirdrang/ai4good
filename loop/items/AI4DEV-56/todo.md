# AI4DEV-56 (admin operations, lifecycle gates, audit) - the lead's todo list

Playbook: Feature, with units. Steps copied from `playbooks/feature.md`. Skips carry a reason.

- [x] 0. Read the Principles section of poteto-mode in full (done before this list was written).
- [ ] 1. `how` over the affected subsystem, critique mode: explorers (grok), explainer (fable low), critics (astra, fable, grok, opus). Blocked on grok login.
- [ ] 1b. Founder question before the arena (brief fact 7): AT-001.30/.31 virtual keys, declared `capability-pending` or built as a stub.
- [ ] 1c. Unit 6 measurement before unit 3 design: does the local GoTrue honour `sign_in_sign_ups = 30`.
- [ ] 1d. Unit 4 measurement on the reset stack: do TRUNCATE, TRIGGER, REFERENCES survive on the four tables.
- [ ] 2. `architect`: design arena, one sketch for the whole subtree, four runners each on a distinct structural direction (astra medium, fable low, grok xhigh, opus xhigh), cross-judge from the pool.
- [ ] 3. Throughput checkpoint, four items:
  - [ ] Blocking first steps.
  - [ ] Independent workstreams.
  - [ ] Shared mutable state.
  - [ ] Smallest safe decomposition.
- [ ] 4. Delegate code-writing per unit, in order, each unit green before the next: unit 1 (contact transfer, recovery, escalation contact), unit 2 (lifecycle gate on every write), unit 3 (append-only audit, sign-in rate limit), unit 4 (leftover table privileges), unit 5 (volunteer GitHub unlink refused), unit 6 (local email rate limit). Lane per unit named in decisions.tsv.
- [ ] 5. Verify on the matching surface: typecheck, at:check, at:selftest, loop and integration verify, the verify-ai4good drive. Mechanical agent captures evidence.
- [ ] 6. Rebase into ordered commits, one group per unit (mechanical agent).
- [ ] 7. `interrogate` the diff before shipping (four reviewers).
- [ ] 8. Opening a PR: /deslop, comment audit on the mechanical model with the comment-sicko prompt, /technical-writing + /unslop on the body. Body: Why, Scope, Tradeoffs, Blast Radius, Verification, Not done here. No other item's id.
- [ ] 9. Closing: CI green on the head AND founder says merge; mechanical runs `gh pr merge <n> --squash`; ExitWorktree keep; `/controller done AI4DEV-56`.
- [ ] 10. Audit decisions.tsv against the transcript; cross-model review of the trail; reply ends with Attention.
