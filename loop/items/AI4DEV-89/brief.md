# Brief for AI4DEV-89 (emitter core and static taxonomy)

Chain: AI4PM-20 (notifications, email and in-app, REQ-016) > AI4DEV-88 (notifications dev
root) > AI4DEV-89 (emitter core and static taxonomy, D1)
Branch: nirdrang/ai4dev-89-emitter-core-and-static-taxonomy-d1
PRD slice: `loop/out/pure-s6-req-027-036.md`, lines 86 to 103, the REQ-016 section, verbatim:

> #### REQ-016: Notifications (Email + In-App)
> Event-driven email and in-app notifications with documented defaults in v1 (→ RM-45). One shared emitter on a single static event taxonomy is the sole writer — blockers, scope additions, and lifecycle events never send comms directly.
> v1 taxonomy (event → recipients, delivery), condensed:
> - Project decisions: triage approved / returned-to-scoped (with reason) / terminally declined → NGO (email + in-app); approval means marketplace visibility. Vetting outcome (vetted/unvetted) → NGO.
> - Discovery fit decline (REQ-004, decline-then-review) — two rows from one decline, split by audience: decline delivered → NGO (email + in-app), carrying the cause, the reshaping suggestion, and the sentence that a person reviews every decline; decline review → platform admin (email + in-app) **+ exactly one ops item** carrying the project, the cause, and the full Discovery conversation. Disposition: upheld → no NGO notification (the decline already stands); overturned → NGO (email + in-app, Discovery reopened). The NGO never sees the review row, the ops item, or the admin's deliberation.
> - Matching: candidacy marked → admin only (match log, never the NGO); match created → volunteer (email + in-app, consent CTA); consented → NGO (email + in-app, fund-to-kick-off); declined/expired → admin (match log); unmatched open-project aging → platform admin only (Goal 5).
> - Abandonment (REQ-027): 14d reminder → volunteer + NGO; released → NGO + ex-volunteer; rematch available → NGO.
> - Money: pre-deadline reminder → NGO; deadline expired → NGO + matched volunteer; payment succeeded → both; payment failed → NGO; fuel 20% → NGO; 5% and depleted → both (sessions warned/cut; depleted adds admin escalation); leftover released to general balance → NGO (no donation event); chargeback opened → NGO + admin + ops item.
> - Access: virtual key issued (instant at kickoff) / revoked (replacement on dashboard) → volunteer (email + in-app).
> - Fail-closed interlock: gateway watchdog failed closed (REQ-009) → platform admin (email + in-app).
> - PRD gate (REQ-036): below-threshold gap report → volunteer (email + in-app); gate passed → NGO (email + in-app); backlog live → NGO (email + in-app).
> - Money corrections (REQ-030): large reconciliation drift → platform admin (email + in-app); undecidable drift surfaced → platform admin (email + in-app).
> - Work signals (PM-TREE events only — dev-tree events never notify the NGO): PM-item status changed → NGO (in-app, low-tone); PM item completed → NGO (email + in-app); requirement-anchored comment → volunteer (in-app); thread comment → the other party (in-app default, with an anti-spam guard); blockers raised/resolved/48h/7d → NGO email + in-app, volunteer on resolution, admin at 7d; PM status auto-reverted → volunteer (in-app, low-tone, instructive not punitive).
> - Scope additions (informal): ride thread-comment notifications; no dedicated CR events in v1 (→ RM-10).
> - Completion: project marked complete → both. (→ RM-25)
> - Provisioning failure (repo setup failed, task-system workspace unavailable at kickoff) → NGO + volunteer + admin + ops item. Lovable: setup reminder, credits low, credits blocked (escalation tier), setup-pending auto-raised at kickoff → NGO, setup complete → both.
> - (→ RM-43, RM-5, RM-7, RM-11)
> Delivery defaults: email for critical events (money, deadlines, blockers, completion, decisions); in-app only for low-tone. One notification per committed event (→ RM-45). **Critical-event reliability guard (money, access, completion):** the notification event is written atomically with its ledger/state transition; recipients resolve at event creation; and it is marked sent only on provider acceptance — an unconfirmed send retries and is never silently dropped. Escalation-tier events notify the NGO and platform admin.

The manifest is `loop/decomp/req-016.md`, revision `0579425`. Its three leaf lines for D1, D2
and D3 are the six units below. The manifest's cross-contracts line says the emitter and
outbox contract lands first and the producers in other requirements integrate against it.

Item text: the parent's description, verbatim:

> Deliverable D1 of the notifications requirement: one shared emitter that is the sole
> writer, and the static event taxonomy it registers. A container — it folds when its leaves
> close.
>
> Covers acceptance ids AT-016.01, .02, .03 and .04.

Acceptance tests: the suite `tests/at/suites/req-016/` exists in full: `a-emitter-and-taxonomy`
(AT-016.01, .02), `d-taxonomy-evidence` (AT-016.03, .04), `b-delivery-defaults` (AT-016.05 to
.08), `c-reliability-guard` (AT-016.09 to .12), with `taxonomy.ts`, `_oracles.ts`,
`_fixture.ts`, `_contract.ts` and `_bind.ts` beside them. The specification is
`.taskmaster/docs/acceptance/at-req-016.md`, sections A, B and C. The expect manifest is
`tests/at/expected/req-016.json`.

## Units

Units 1 and 2 are the parent's own leaves. Units 3 to 6 are extra units from the same
requirement root (founder 2026-09-08, "start with 89"), in dependency order. The wiring leaf
of D2 is not in this run: it waits on the founder's design sign-off for the communication
screens. The pull request names each unit by its short label in words, never by its id.

### Unit 1: AI4DEV-92 (one shared emitter, the sole writer, and the static event table)
Item text, verbatim:

> One shared emitter is the sole writer of notifications. Blockers, scope, and lifecycle
> code never send directly. The registered events are exactly the static taxonomy table,
> immutable in v1.
>
> **Verify:** AT-016.01, AT-016.02
> **Blocked by:** —
> **Manifest:** `loop/decomp/req-016.md`, deliverable D1 leaf L1, revision `0579425`

Acceptance tests: AT-016.01, .02 in `a-emitter-and-taxonomy.test.ts`. AT-016.01 needs a
source-level scan proving no component but the emitter imports a provider client or holds
its credential, beside the system's self-report. The loop tier declares it red today on the
capability "H3 static provider scan".

### Unit 2: AI4DEV-93 (the full taxonomy matrix, recipients, channels, payloads, negatives)
Item text, verbatim:

> The full taxonomy matrix: exact recipients, channels, and payloads per event, the
> depleted-adds-admin escalation, and the ops-item events. The sensitive negatives hold: an
> NGO never sees candidacy or the match log, a volunteer never sees vetting, and no donation
> event exists.
>
> **Verify:** AT-016.03, AT-016.04
> **Blocked by:** D1.L1
> **Manifest:** `loop/decomp/req-016.md`, deliverable D1 leaf L2, revision `0579425`

Acceptance tests: AT-016.03, .04 in `d-taxonomy-evidence.test.ts`. The table the loop tier
already grades against is `tests/at/suites/req-016/taxonomy.ts`. The PRD slice above is the
source of every row.

### Unit 3: AI4DEV-94 (delivery defaults, critical by email and in-app, low-tone in-app only)
Item text, verbatim:

> Delivery defaults: critical events go by email and in-app, low-tone events in-app only. A
> documented default exists for every row of the taxonomy.
>
> **Verify:** AT-016.05, AT-016.06
> **Blocked by:** D1.L1
> **Manifest:** `loop/decomp/req-016.md`, deliverable D2 leaf L1, revision `0579425`

Acceptance tests: AT-016.05, .06 in `b-delivery-defaults.test.ts`. AT-016.06 reads the
documentation, so the documented default per row is a deliverable, not a comment.

### Unit 4: AI4DEV-95 (one logical notification per committed event, the anti-spam guard)
Item text, verbatim:

> One logical notification per committed event: one delivery per recipient-and-channel
> pair. The thread-comment anti-spam guard conforms to its pinned configuration; the
> configuration is a fixture until the comment thread requirement lands.
>
> **Verify:** AT-016.07, AT-016.08
> **Blocked by:** D2.L1
> **Manifest:** `loop/decomp/req-016.md`, deliverable D2 leaf L2, revision `0579425`

Acceptance tests: AT-016.07, .08 in `b-delivery-defaults.test.ts`. AT-016.07 includes a
process restart mid-flight, so the idempotency key lives in the database, not in memory.

### Unit 5: AI4DEV-97 (the atomic emitter-outbox contract, each guarded producer against it)
Item text, verbatim:

> The emitter-outbox atomic-write contract, then each guarded producer integrates against
> it: notification events are written atomically with their ledger or state transition
> across the full guarded matrix, every money row, both access rows, and completion,
> parameterised and fault-injected. Recipients resolve at event creation, not at send time.
>
> The guarded producers live in the Stripe ledger, the LLM gateway, and the project
> lifecycle requirements, none of them materialised yet. This leaf lands the contract and
> the matrix harness; the full matrix runs green only when those producers are live.
>
> **Verify:** AT-016.09, AT-016.10
> **Blocked by:** D1.L1, plus the guarded producers in the ledger, gateway, and lifecycle
> requirements
> **Manifest:** `loop/decomp/req-016.md`, deliverable D3 leaf L1, revision `0579425`

Acceptance tests: AT-016.09, .10 in `c-reliability-guard.test.ts`. AT-016.09's full matrix
names producers that do not exist. This is the same shape as the virtual-key clause in the
admin run and the sign-in redirect in the tenant run: the founder decides whether the
missing rows stay red with a declared shape or run against fixture producers. Ask the
founder before the design arena, in one message that names the two options, and record the
answer in the decision trail.

### Unit 6: AI4DEV-98 (sent only on provider acceptance, retried never dropped, never duplicated)
Item text, verbatim:

> A notification is marked sent only on provider acceptance. Unconfirmed sends retry and
> are never dropped. A lost acknowledgment yields no duplicate. Escalation-tier events
> reach both the NGO and the platform admin.
>
> **Verify:** AT-016.11, AT-016.12
> **Blocked by:** D3.L1
> **Manifest:** `loop/decomp/req-016.md`, deliverable D3 leaf L2, revision `0579425`

Acceptance tests: AT-016.11, .12 in `c-reliability-guard.test.ts`.

## Facts from the repository

The board does not say these. The lead needs them.

1. `main` is at `6d72979`. The branch was cut from it, and the only commit on the branch
   before you is this brief.
2. The suite is older than the system. It was written as the harness proving ground before
   any notification code existed. The expect manifest shows it: eleven of twelve ids are
   green at the loop tier against the harness stand-in, and all twelve are red at
   integration on `sut.notifications`. This run builds the real system and turns the
   integration tier green. Read `_contract.ts`, `_fixture.ts` and `_oracles.ts` first: they
   say what the suite expects the system under test to expose, and the harness item that
   shrank the harness to the per-id gate (merged 2026-09-03) changed the rules for
   integration bodies, so check every body against the auth suite's integration style
   before trusting it.
3. The email provider stand-in from the harness bring-up exists in the tree. The local
   stack carries a mail catcher on the 44321 block; the verify skill under
   `.claude/skills/verify-ai4good/` drives it. Integration bodies prove email on that
   catcher, never on a live provider.
4. The auth requirement landed the posture every new table must join: row-level security
   with revoke-then-grant per client role, a static catalog scan over the migrations in CI
   (`tests/at/suites/req-001/_policy-scan.ts`), and a live catalog check at integration.
   The admin run (merged 2026-09-06, pull request 67) added an append-only audit table and
   one mandatory lifecycle-gate boundary that every write route registers through, with a
   conformance check that fails an unregistered route. A notification outbox is a table and
   its writer is a write route: both join those checks or CI fails.
5. Reads reach the database as the caller since the tenant isolation merge. The in-app
   notification read for a recipient follows that rule: a policy on the notification rows,
   not a service-role read in an edge function.
6. The verify commands: `bun run typecheck`, `bun run at:check req-016`,
   `bun run at:selftest`, `bun run at:verify req-016 --tier loop --expect`,
   `bun run at:verify req-016 --tier integration --expect`. Run the auth suite at both tiers
   too, because the lifecycle gate's conformance check lives there and a new write route
   changes its result.
7. The pull request body must not name any id but the parent's own. The six units are
   named in words.

## The ask
Run this item in poteto-mode, end to end, and open one pull request from this branch.
If the brief has Units, design once for the whole subtree, then build and verify the units
in order, one commit group per unit, each unit green before the next starts. The pull
request body names each unit by its short label in words, never by its id.
Ground it with /how in critique mode first: explorers, explainer, then the critics, on
every item.
In the design arena, give every runner a distinct structural direction, so the candidates
do not converge on one design. The runner lanes are the sheet's four; add none.
Tool-heavy work without judgment goes to the mechanical agent with exact instructions: the
rebase into ordered commits, the per-commit builds and tests, driving the verify skill and
capturing its evidence, and the closing commands. You decide and you judge the evidence; it
types; you check each result once.
Every delegated lane writes its full report to a file under the item folder and replies
with five lines and the path. Read the file only when the summary names a deviation, a
blocker, or a red.
A unit goes to the hardest-tasks lane only when the writer must still design something. A
unit that applies a fixed contract goes to the feature lane. Say which in the decision trail.
The comment audit before review runs on the mechanical model with the comment-sicko prompt,
never on your own model.
Do not name any other item's id in the pull request title or body.
The pull request body carries Why, Scope, Tradeoffs, Blast Radius, and Verification.
Then close the item as the Closing section says. You close it, nobody else.

## Closing (the git part is yours, the board is not)
1. Wait for CI to be green on the exact head of the pull request, and for the founder to
   say "merge". Both, never one.
2. Hand the git mechanics to the `mechanical` agent with exact commands. You decide, it
   types: `gh pr merge <n> --squash`. The merge closes the item on the board through the
   pull request link. Never touch the board yourself. Delete no branch and no worktree: the
   founder keeps merged branches for reflection, and deletes by name when they choose
   (founder 2026-09-06).
3. Leave the worktree with `ExitWorktree(action: "keep")`.
4. Invoke `/controller done <item>`. That skill does the board steering. Do not do it
   yourself.

## Mechanics never spend your calls
Fable calls are scarce. Tool-heavy work without judgment, the station 7 rebase, the merge
and cleanup commands, goes to the `mechanical` agent (sonnet, inherits the worktree,
executes exact instructions, rules on nothing). Write the exact plan, let it run, check the
result with one read. Do not use a fork for this: a fork runs on your own model.
A writer that dies after finishing its work is recovered by running the pin and committing
the finished tree, not by rerunning the writer.

## The evidence bar
- The verify suite for the acceptance tests above passes on the final head. Name each check
  and its timestamp in the Verification section.
- CI is green on the final head.
- Discovered work goes in a "Not done here" list in the pull request body, never in the diff.

## Environment facts
- One database, the stack `supabase/config.toml` describes, local and cloud alike. Start it
  with `bun run db:start`; every integration run resets it.
- codex needs `codex login --device-auth` once per fresh VM. The session banner says when.
