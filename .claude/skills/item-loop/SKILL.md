---
name: item-loop
description: Run one board item through the orchestrated build loop — brief, two adversarial gates, bounded fix loops, verified merge tail. The operational form of the ratified Item Loop playbook (revision 2, 2026-07-30, codex-max-reviewed).
---

# /item-loop — the orchestrated item loop

Run ONE board item end to end: brief → plan → Gate 1 → implement → Gate 2 (panel) →
verify → audit → merge ruling → publish → merge → report. The session that invokes this
skill IS the orchestrator. Usage: `/item-loop AI4DEV-NN` (foundation items; a PM-tree
requirement is pulled by `/pm-next` first and then run with `/item-loop AI4PM-NN`).

**Design record:** the ratified playbook artifact "The Item Loop, revision 2"
(2026-07-30), itself hardened by a codex max-effort adversarial round (15 findings,
8 blockers folded). This file is its operational distillation; on any gap, the
playbook's principles decide: nothing crosses an actor boundary except as a file;
delegate the hands, never the verdict; one judgment context per item; every loop
bounded, every early exit with a written reason.

## Roles — four actors, three memory models

| actor | does | memory model |
|---|---|---|
| ORCHESTRATOR (this session, Fable) | brief, advice, two checkpoints (amended plan; merge authorization), rulings, report. Writes no implementation code. | accumulates everything — one judgment context per item; advisor = this session, NEVER a spawned agent |
| EXECUTOR (Opus subagent) | plans, implements, triages critiques first-hand, fixes. Never pushes, never touches the PR, never decides judgment calls. | one instance per item, spawned once, resumed never respawned |
| REVIEWERS (codex `gpt-5.6-terra` @ max at BOTH gates and both Gate 2 iterations; + Kimi `k3` @ high alongside at Gate 2) | adversarial critique + confirmation of own findings | stateless — context rebuilt from files each invocation; verdicts replayable ONLY if the pins are exact |
| SONNET subagents | housekeeping, courier runs, pre-merge audit + independent re-run, publish, merge execution, post-merge check | disposable |

FOUNDER sits above, reached only through the escalation matrix. Pending founder
escalation = Blocked label + comment (never a status change), merge can never proceed.

## Item files (committed on the branch — the paper trail IS the protocol)

`loop/items/<ITEM>/` : `brief.md` · `plan.md` (+ appended dispositions) ·
`gate1-critique.txt` · `gate2-critique-codex.txt` · `gate2-critique-kimi.txt` ·
`finding-manifest.json` · `disposition-log.md` · `ledger.jsonl` (append-only decisions)
· `premerge-audit.md` · `merge-decision.md`. Every gate artifact records the head SHA
it examined.

## The founder's surface is TWO verbs (founder ruling 2026-08-01)

**`/pm-next`** pulls the next piece of work — a requirement, a bring-up item
(`/pm-next bringup AI4DEV-NN`), or exploration — and hands over here. **`/item-loop`** builds
it. That is the whole surface the founder types.

`/dev-start` and `/dev-end` are INTERNAL to this loop — phase 0 and the merge tail — invoked
BY the loop, never by the founder. They exist so there is one place to change how an item is
opened and closed, not so there is a second way to do either.

## Session discipline (founder ruling 2026-07-31, AI4DEV-32)

- **`/dev-start` and `/dev-end` are this loop's phases**, not alternative paths and not
  founder-facing: `/dev-start` is phase 0; `/dev-end` is the merge tail. No other closing
  path exists; "verification assumed" is dead.
- **The ORCHESTRATOR session works IN the item worktree** — not the shared main folder.
  Bindings are per-worktree; orchestrating from a shared folder means another session can
  overwrite the binding mid-item and every message stamps against the wrong work (observed,
  not hypothetical).
- **One session, one item.** A session with a live binding finishes or explicitly abandons
  it before opening another.
- **The merge tail ends by CLEARING THE PATH:** `Clear-ItemState` drops the worktree's
  binding and its PM acknowledgment together, so the next item starts unbound and the stamp
  hook's PM question fires again exactly once. A stale binding mis-attributes the next
  item's work.
- **The stamp hook is the disclaimer:** every prompt shows `WORKING ON - PM: … | DEV: …`.
  When no PM requirement is bound and the dev has not confirmed working without one, the
  hook demands the question be put to the dev IMMEDIATELY — no counting. Record the answer
  with `Set-PmAck`.

## The loop

0. **Housekeeping — sonnet subagent** (`<ITEM> · housekeeping`): dedicated worktree on
   the item's branch, `/bind bringup <ITEM>` (or the task binding), item → In Progress
   with a comment. Then the **ORCHESTRATOR, in this exact order**: `cd` into the new
   worktree ITSELF — a subagent's working directory dies with the subagent, so a session
   that only *ordered* a worktree is still sitting in the old one — re-read the binding,
   **print the WORKING-ON line immediately** so the founder sees the change at the moment
   it happens, and verify the skill checkout serving `.claude/skills/` is current (a stale
   checkout serves superseded rules, which has already cost one real under-run). Skipping
   the `cd` is what let another session overwrite AI4DEV-24's binding mid-item.
1. **Read the authorities — orchestrator, main session**: the Linear item, the ratified
   spec sections, the code. The item's done-criterion is supreme in scope disputes.
2. **Write the brief — orchestrator**: every decision pre-made; work items numbered;
   the verification expected state declared exactly (which AT ids green, which red with
   which capability-pending reason). Anything undecided = executor stop, by definition.
3. **Plan — executor** (`<ITEM> · executor · plan`, spawned once): reads the brief,
   writes `plan.md`, STOPS. The stop is the delivery; waiting is passive (transcript
   persists; the reply is the wake-up).
4. **Gate 1 — codex refutes the plan** — `gpt-5.6-terra`, effort `max` (courier: main
   session or sonnet; prompt = role + item + spec + brief + plan): one round. Critique returns to the EXECUTOR
   (first reader), who folds what the brief already decides, escalates judgment
   findings to the orchestrator (a message to main — never a spawned advisor), records
   dispositions in `plan.md`. **Checkpoint (orchestrator, hard):** read the amended
   plan + dispositions; check nothing was silently dropped, folds stayed inside the
   brief, advice was folded as advised, the plan still meets the done-criterion.
   Approval wakes the executor. The approved amended plan is the implementation contract.
5. **Implement — executor** (`↻ same instance · implement`): one commit per work item.
6. **Gate 2 — panel: codex `gpt-5.6-terra` @ `max` + Kimi `k3` @ `high`, in parallel** (courier builds one prompt from brief +
   amended plan + diff @ head SHA; separate output files; courier freezes
   `finding-manifest.json`: stable ids, raiser, risk class, critique hashes).
   Both critiques return to the executor, who triages:
   - raised by both → highest confidence, fix first;
   - unique → fix if inside the contract, escalate if judgment;
   - reviewers CONFLICT → automatic escalation; the executor never picks between reviewers.
   Executor appends dispositions only — never merges, drops, or rewords a finding.
   **Confirmation:** after ALL fixes, both raisers confirm their own findings against
   the same immutable head SHA (a later mutation invalidates both). **One cap: at most
   two fix→confirm cycles per gate.** After the cap the orchestrator rules every
   still-open finding terminal (fix-adequate / rejected / deferred-to-filed-item, each
   with reason) — EXCEPT false-green-class, which only the founder can close.
   **False-green-class is operational and raiser-marked** (requirement violation,
   security or data-integrity defect, harness invalidity, misleading expected state);
   nobody downstream can untag it; tag disputes block the merge → founder. A NEW
   blocking-class defect found mid-confirmation is never parked: one bounded scoped
   extra epoch. Everything else new mid-confirmation → recorded, disposed at the merge
   ruling (fold / file / reject).
7. **Verify — executor** (`↻ same instance · verify`): run the full suite until it
   matches the declared expected state exactly; report with raw output. Failure → the
   executor fixes it (a test failure is not a reviewer finding); orchestrator advises
   the path back: mechanical → re-verify; substantive → scoped panel review of the fix
   diff. 
8. **Merge tail:**
   - **6a Pre-merge audit — sonnet** (`<ITEM> · audit`, fresh context): independently
     re-runs the verify suite (independence from the executor is the point, not
     intelligence) + gathers every checklist box's evidence + checks manifest↔log
     one-to-one coverage. Reports; rules nothing.
   - **6b Merge ruling — orchestrator, never delegated**: read the diff, the audit,
     the ledger; mark every box; write `merge-decision.md` (verdict + PR body text +
     report source), pinned to the head SHA.
   - **7a Publish — sonnet** (`<ITEM> · publish`): push, open/edit the PR with the
     orchestrator's text verbatim, attach evidence, report PR number + head SHA.
   - **7b Confirm + authorize — orchestrator**: published PR == merge-decision (text,
     head SHA, evidence)? Mismatch → back to 7a. Then issue the merge authorization:
     one repo, one PR, one head SHA, one merge method; expires on use. Base drift
     since Gate 2 → update + scoped re-review first.
   - **7c Merge — sonnet** (`<ITEM> · merge`): execute the authorization; confirm the
     Linear item closed via the GitHub integration; completion comment. Any surprise =
     stop-and-report.
   - **Post-merge — sonnet** (`<ITEM> · postmerge`): loop-tier verify + selftests
     against main; a regression → orchestrator may authorize a revert PR through this
     same loop (scoped, expedited); item reopens via label + comment; founder hears in
     the report.
   - **Clear the path — orchestrator** (founder ruling 2026-07-31): `Clear-ItemState`
     drops this worktree's binding and PM acknowledgment; remove the item worktree once
     nothing needs it. One session, one item — the next one starts clean and the PM
     question fires again exactly once.
9. **Report — orchestrator, never delegated**: plain sentences (CLAUDE.md rule): what
   went green, what stayed red and why, what each gate found and how it was ruled,
   what was escalated, what remains unverified.

## The merge checklist (§4 — every box or no authorization)

1. Gate 1 ran; every finding has a disposition; the orchestrator approved the amended plan before implementation.
2. Gate 2 closed: every manifest finding terminal; every reviewer conflict ruled; no unresolved false-green-class tag.
3. Verification matches the declared expected state per id, at the tier the item names.
4. The sonnet auditor's fresh-context re-run reproduced the executor's results; the orchestrator ruled the runs consistent.
5. One head SHA runs through reviews, confirmations, verify runs, audit, ruling; the published PR's head equals it; base drift forced re-review first.
6. Finding manifest ↔ disposition log in one-to-one coverage (auditor-checked).
7. The diff is confined to the item's allowed paths.
8. Every deferral has a filed board item, named in the PR body.
9. Required proofs (failing-then-passing, where the item demands proof) are attached to the PR.
10. No pending founder escalation.

## Escalation matrix

- Executor → Orchestrator: anything the brief + amended plan do not decide. Message to
  main with verbatim evidence + proposed resolution + alternatives; implements nothing
  until answered.
- Orchestrator → Founder, only: a finding contradicting the item's ratified text (item
  change-request); scope growth; new standing rules; unresolved false-green-class
  finding or tag dispute; authority-document changes. Pending = Blocked label, no merge.
- Never escalated: mechanical fixes, formatting, choices the brief already decided.

## Standing pins

- **Reviewer pins (founder 2026-07-31) — state the vendor's OWN vocabulary, never "max effort" as if it were portable:**
  - **Gate 1 — codex:** `-c model=gpt-5.6-terra -c model_reasoning_effort=max`
  - **Gate 2 — codex:** `-c model=gpt-5.6-terra -c model_reasoning_effort=max`, on **BOTH**
    iterations — the initial review and the confirmation pass alike (founder 2026-07-31).
    Terra is the reviewer everywhere; luna is not used. Cross-vendor decorrelation comes from
    Kimi running alongside, not from varying the codex variant.
  - **Gate 2 — Kimi:** `kimi -m kimi-code/k3 -p "<short instruction>" --output-format text`, at
    its config default effort **high** (founder: high, not max). Kimi's CLI has no effort flag;
    effort comes from `~/.kimi-code/config.toml`. `k3` carries the large context window, which
    matters because Gate 2 prompts embed a whole diff.
  - **CRITICAL — the ladders differ per vendor.** codex: `minimal|low|medium|high|xhigh|max`,
    where **`max` is the ceiling and `xhigh` is one tier BELOW it**. Kimi: `low|high|max`.
    A brief that says "max effort" without naming the vendor is ambiguous and has already
    caused a real under-run: believing `xhigh` was codex's ceiling, both AI4DEV-25 gates ran a
    tier low. Corrected 2026-07-31 after CLI research.
  - **Invalid effort values FALL BACK SILENTLY** — no error, no warning. A typo in a pin
    degrades a gate invisibly. Treat pins as load-bearing config: change them only in a
    reviewed commit, never ad hoc in a prompt.
  - Plain `gpt-5.6` is invalid — the variant suffix is required. Different families per gate
    widen the blind-spot coverage the panel exists for. Supersedes the earlier
    `gpt-5.6-sol` @ `high` pin.
- Confirmation passes use the SAME model as the gate that raised the finding — a
  finding is confirmed by the reviewer that raised it, which means by its model too.
- **Confirmation EFFORT is `high`, not `max`** (AI4DEV-24 retrospective). Reviews are
  discovery — open-ended, rewarded by deep reasoning — and run at `max`. Confirmation is
  bounded verification of a named claim against a scoped diff, and `high` proved
  sufficient there, finding a genuine refutation. EXCEPTION: a confirmation asked to
  judge a CLAIM rather than a fix is doing review work under a confirmation's name and
  gets `max`. (Evidence caveat, kept honest: the parallel `max` run was killed before
  producing output, so `high` is proven sufficient, not proven equal.)
- **A claim names the mechanism it closed and the test that proves it — never the class
  of defect it belongs to** (AI4DEV-24, where three claims were refuted and not one was
  refuted on the code; every refutation was of a sentence describing the code). The
  item's claim is an artifact to be attacked like any other; a narrow true claim beats a
  broad defensible-sounding one.
- Subagent labels: every spawn `<ITEM> · <role> · <phase>`; an unlabeled spawn is a
  process violation; resumes never rename.
- Every advisory ruling appended to `ledger.jsonl` AT RULING TIME; after context loss,
  rehydrate from the ledger before continuing; the merge-ruling audit reads the ledger.
- **Commit trailers attribute AUTHORSHIP: authored commits carry them; auto-generated
  merge commits are exempt** (AI4DEV-24 audit ruling — the rule's old wording flagged a
  machine-written merge commit as a violation).
- CI note: `git diff --check` must exclude `loop/items/**` — committed reviewer records
  are verbatim artifacts, never doctored to make a whitespace check pass.
- PowerShell tool, never Bash. bun, never npm/pnpm. Loop tier database-free.

## INTERIM MODE — autonomous merge is OFF until the hardening lands

Until (a) `at:verify --expect` (expected-state manifest), (b) CI on the PR head running
the verify suite, and (c) AI4DEV-24 (tests/at visible to tsc) are ALL merged: run the
loop identically, but 7b terminates at **"ready to merge" + a founder ping**; the
founder merges or says "merge it". A hand-interpreted checklist is not a merge licence
(codex blocker 2, accepted 2026-07-30).
