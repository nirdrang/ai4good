# PHASE-STATE — AI4DEV-65 (who signed fields)

## Where the item stands

- Phase completed: DRAFT. Gate 1 ruled (7 findings: 5 accepted in some form, 1 rejected, 1
  part-accepted with a terminal narrowing — `loop/items/AI4DEV-65/gate1-rulings.md`), the plan
  amended, and the full draft written by the executor.
- Code head (the reviewers' pinned commit): `0c389c633b9867b93b1466a77c75d5bc9df66f56`. The
  commit after it is record-only (gate 2 prompts, this file, one plan verification-table
  repair); the code is identical at both.
- Draft evidence, from the executor's report: steps 1–12 at their done-criteria;
  `bun run typecheck` exit 0; `bun run at:check req-001` and `req-016` exit 0 (37 and 12 ids in
  bijection); `bun run build` exit 0. The verify suite was NOT run at any tier, by design.
  Database slot 1 reserved, untouched this sitting.
- Branch: `nirdrang/ai4dev-65-who-signed-name-title-and-authority-on-every-acknowledgment`.
  Branch base for diffs: `ea4f3453ed59081a3e24c035e6d321d1f2ebaa45`.

## What completes the next phase (gate 2)

- TWO readers per the pins in `.claude/skills/work/reviewers.md` (the panel, both blind to each
  other): reader one codex `gpt-5.6-terra` effort max, prompt
  `loop/items/AI4DEV-65/gate2-prompt-terra.md`; reader two opencode flash variant max, agent
  `reviewer-flash`, prompt `loop/items/AI4DEV-65/gate2-prompt-flash.md`. The two prompt files
  are byte-identical (SHA256 verified); the model pin is the only difference and lives with the
  conductor, never in the prompt.
- Subject: the branch diff `ea4f345...0c389c6`. Both prompts pin that commit.
- The phase is complete when BOTH distillates have landed in `loop/items/AI4DEV-65/artifacts/`
  and both runners have reported. The FIX AND GOAL sitting then rules on every finding from
  both readers, pushes rulings BEFORE code changes, and spawns the executor: verify-first
  claims and removal conditions first, ruled fixes second, then the goal — every plan step at
  its done-criterion and the verification table green (integration runs use `AT_DB_SLOT=1`,
  serially), at most three iterations. That sitting also writes the audit brief with the CLAIM
  CHECKLIST and commits both readers' full evidence into the record.

## Rulings on the executor's reported deviations and proposals (DRAFT sitting, on the record)

1. Bare `bun run at:check` does not run (takes one requirement per run) — the plan's
   verification table now names `req-001` and `req-016` runs. Repaired this sitting.
2. AT-001.04's request object carries the three fields — accepted; the file reuses one object
   for refusal and later success, and the plan's byte-identity rule governs.
3. AT-001.20 keeps the default `backend` surface mark — ruled. The auth-screens wiring leaf's
   scope is the four auth screens, none of which shows acknowledgment copy; the future
   acknowledgment UI item re-marks the id under its own review if display wiring lands there.
   The pending ledger carries the reasoning.
4. The executor's ordering-pin assertions (the six non-mismatch refusal variants assert the
   refusal is NOT the mismatch reason) — kept; they pin decision B's load-bearing check order.
5. `bun run build` locally rewrites `src/routeTree.gen.ts` (pre-existing generator drift, the
   other ownership territory; the executor reverted it). Noted for every later sitting: any
   local build dirties that file — do not commit it under this item.

## Open questions

- For the founder: none.

## Notes for the next sitting

- The riskiest claims for gate 2 to test, restated: the recreated `complete_signup` body's
  fidelity to the previous definition; validation-order preservation for every pinned refusal;
  the three-way whitespace semantics (JS `trim()`, POSIX `\s` constraints, explicit `btrim`
  sets); the ripple's completeness over completion literals.
- The merge ruling must carry: AT-001.19's integration green narrowed to the email/Google path;
  AT-001.20's green claiming copy content and runtime enforcement of the authority statement,
  never display — with sol's gate-1 claim on the display clause quoted verbatim (it is a
  dismissed unearned-green tag, terminal per contract; text in `gate1-rulings.md` finding 2).
- Anomaly closed: this sitting received a proper birth certificate (own address distinct from
  the conductor's). The plan sitting's recorded anomaly is resolved.
