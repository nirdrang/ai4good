# PHASE-STATE — AI4DEV-65 (who signed fields)

## Where the item stands

- Phase completed: PLAN. `loop/items/AI4DEV-65/plan.md` is written and is the goal spec.
- Branch: `nirdrang/ai4dev-65-who-signed-name-title-and-authority-on-every-acknowledgment`.
- Database slot: 1, reserved under this item by the coordinator. Integration runs use
  `AT_DB_SLOT=1`, serially.
- Slicing decision (recorded per contract): ONE slice. Three ids, one deliverable, one coherent
  diff. The code gate runs once.
- A mechanical opens the pull request after the plan push, body as handed, non-closing
  references only.

## What completes the next phase (gate 1)

- Gate-1 prompt: `loop/items/AI4DEV-65/gate1-prompt.md`, assembled and ready to send as-is.
- Subject: `loop/items/AI4DEV-65/plan.md` at the head this state file rides in.
- The phase is complete when the reviewer-runner's distillate for this gate has landed in
  `loop/items/AI4DEV-65/artifacts/` and the runner has reported. The DRAFT sitting then reads
  this file, the distilled findings, and `plan.md`, and rules on every finding before any code
  changes.

## Open questions

- For the founder: none. Nothing found contradicts ratified text, and scope matches the leaf.

## Notes for the next sitting

- The plan's riskiest claims, in order: the validation-ordering claim (decision B — pinned
  refusal reasons in green tests must keep firing first), the ripple over every existing
  `completeSignup` request literal (step 11), and the drop-and-recreate migration with its
  grants tail (decision E / step 6).
- AT-001.19's integration green is deliberately narrowed to the email/Google path; the GitHub
  path is loop-proved only (plan decision F). The merge ruling must carry this narrowing.
- AT-001.20's green claims copy content, never display (plan decision D). The merge ruling must
  carry this too.
- Anomaly, recorded for the record: this sitting's birth certificate named one id
  (a7a18f91794ecd452) as both the conductor's address and this sitting's own. That id is the
  conductor's (the worktree folder carries it). Harmless this sitting — a PLAN sitting spawns
  only a mechanical — but the DRAFT sitting spawns an executor, whose escalation path needs the
  sitting's OWN bare id. The conductor should issue the DRAFT sitting an unambiguous birth
  certificate: "your own address is <that sitting's id>", distinct from the report-to address.
