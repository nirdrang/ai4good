# Brief for AI4DEV-102 (the vetting action and its audit record)

Chain: AI4PM-22 (NGO organisation profile and founder vetting, REQ-002) > AI4DEV-99 (NGO
profile dev root) > AI4DEV-102 (the vetting action and its audit record, D3)
Branch: nirdrang/ai4dev-102-the-vetting-action-and-its-audit-record-d3
PRD slice: `loop/out/pure-s3-req-001-006.md`, lines 16 to 34, the REQ-002 section, verbatim:

> #### REQ-002: NGO Organization Profile & Founder Vetting
>
> NGOs sign up (email-verified) and complete an org profile. v1 trust is a founder-vetted flag applied during concierge onboarding; the verification machinery is deferred (→ RM-6). Two tiers:
>
> 1. **Unverified** — email-verified (the Discovery floor). May draft projects and run Discovery within 10 credits/day; at zero, fund fuel to continue now or wait for the next day. Cannot publish.
> 2. **Vetted** — one audited admin action at concierge onboarding. Allowance 30/day. May publish and fund. The default for admitted pilot NGOs.
>
> - The NGO admin creates and edits the profile (name, mission, country, website, logo).
> - The profile's mission text is one input the Discovery pass reads to generate cause labels (REQ-004); there is no separate cause-category field or admin taxonomy surface here.
> - Email verification precedes any Discovery message; vetting gates publishing, never Discovery.
> - **The vetting action is audited:** it records who vetted and when, the NGO legal/display name, a public reference link, the contact's name + title + authority attestation, the evidence type, and a note; unvet/revoke exists; vet/unvet emits the verification-outcome notification through the normal event path (REQ-016).
> - **Evidence rule (PII-minimizing):** public evidence is preferred (registry, website, EIN); emailed registration documents have only their metadata recorded and the copy deleted after vetting; no sensitive personal identity documents in v1; nothing may imply a document review that did not occur.
> - **No public "verified" claim in v1** — the flag may show only as "founder-vetted" (→ RM-6).
> - On vetting, the allowance rises 10 → 30 immediately and on later days; re-vetting never re-raises.
> - Only vetted NGOs publish; an unvetted NGO may reach `scoped` with publishing disabled.
> - The daily allowance hard-resets to the tier grant once per UTC day, with no rollover.
> - A paid "Discovery wallet" is excluded in v1 and v1.5 (→ RM-6).
>
> Dependencies: REQ-001.

The manifest is `loop/decomp/req-002.md`, revision `0579425`. Its cross-contracts line: this
manifest owns the tier grants, the UTC hard reset, and the vet-raise math; the Discovery agent
requirement owns per-turn metering and funded routing and consumes these grants; the
notifications requirement delivers the verification-outcome notification; publish-gate
assertions take edges into the publishing requirement and the lifecycle engine; fuel-checkout
permissibility rides the Stripe checkout; the public-label sweep completes with the listing
screens of a later wave.

Item text: the parent's description, verbatim:

> Deliverable D3 of the NGO profile requirement: the founder's manual vet and unvet action,
> who may run it, what it records, and what it emits. A container — it folds when its leaves
> close.
>
> Covers acceptance ids AT-002.11, .11b, .12, .13, .14, .29 and .30.

Acceptance tests: no suite exists for this requirement. This run creates
`tests/at/suites/req-002/` and `tests/at/expected/req-002.json`, in the shape of the auth
suite under `tests/at/suites/req-001/`, and registers every id below through `atTest`. The
specification is `.taskmaster/docs/acceptance/at-req-002.md`: section A (org profile), B
(tiers and the allowance), C (the vetting action), D (evidence rule), E (what vetting
gates), F (public claims). Twenty-seven P0 ids in the requirement, twenty-five in this run.
The `at:check` bijection requires every P0 id of the specification to have exactly one call
site, so the two ids not built here (the wired re-run adds none; AT-002.23's full sweep waits
on listing screens) are declared red in the manifest by id with a stated shape.

## Units

Units 1 to 3 are the parent's own leaves. Units 4 to 13 are extra units from the same
requirement root (founder 2026-09-09, one run, local). The order is the founder's: vetting
first, then the profile, the allowance, and the gates last. The wiring leaf of D5 is not in
this run. The pull request names each unit by its short label in words, never by its id.

### Unit 1: AI4DEV-111 (the vet action's audit record, every mandated field or no commit)
Item text, verbatim:

> Vet action audit record: all mandated fields are captured. Any omitted field means no
> commit and no partial vetted state.
>
> **Verify:** AT-002.11, AT-002.11b
> **Blocked by:** —
> **Manifest:** `loop/decomp/req-002.md`, deliverable D3 leaf L1, revision `0579425`

Acceptance tests: AT-002.11, .11b, section C. The append-only audit table from the admin
operations run (see facts below) is the natural home for the record; decide in the design
whether the vet record is a row there or its own table, and say why.

### Unit 2: AI4DEV-112 (only the platform admin vets, only by hand)
Item text, verbatim:

> Authorization and v1 shape: a non-admin vet or unvet is rejected, with no tier change and
> no event. Only the manual founder vet and unvet path exists. There is no automated
> verification or KYC machinery.
>
> **Verify:** AT-002.29, AT-002.30
> **Blocked by:** D3.L1
> **Manifest:** `loop/decomp/req-002.md`, deliverable D3 leaf L2, revision `0579425`

Acceptance tests: AT-002.29, .30, section C.

### Unit 3: AI4DEV-113 (unvet closes publishing, funding untouched, outcome via the emitter)
Item text, verbatim:

> Unvet or revoke closes publishing and leaves funding untouched. Vet and unvet emit the
> verification-outcome notification through the shared emitter. Vetting is a single audited
> admin action.
>
> The emitter landed with the notifications requirement's backend run, merged 2026-09-09.
>
> **Verify:** AT-002.12, AT-002.13, AT-002.14
> **Blocked by:** D3.L1, plus the emitter of the notifications requirement (Done)
> **Manifest:** `loop/decomp/req-002.md`, deliverable D3 leaf L3, revision `0579425`

Acceptance tests: AT-002.12, .13, .14, section C. The emitter is the sole writer of
notifications; this unit registers the vetting-outcome event through it, never beside it.

### Unit 4: AI4DEV-114 (emailed registration documents, metadata only, identity documents refused)
Item text, verbatim:

> Emailed registration documents: metadata only, and the content is unretrievable after
> vetting. Sensitive personal identity documents are refused. The evidence type is stored
> exactly, and no surface implies a document review that did not happen.
>
> **Verify:** AT-002.16, AT-002.17, AT-002.18
> **Blocked by:** D3.L1
> **Manifest:** `loop/decomp/req-002.md`, deliverable D4 leaf L1, revision `0579425`

Acceptance tests: AT-002.16, .17, .18, section D.

### Unit 5: AI4DEV-105 (profile create: name, mission, country, website, logo)
Item text, verbatim:

> Profile create: name, mission, country, website, and logo persist and render.
>
> **Verify:** AT-002.01
> **Blocked by:** —
> **Manifest:** `loop/decomp/req-002.md`, deliverable D1 leaf L1, revision `0579425`

Acceptance tests: AT-002.01, section A. The auth requirement already has an `organizations`
table and the `create-organization` and `update-organization` edge functions. Measure what
they hold before adding fields.

### Unit 6: AI4DEV-106 (profile edit by the NGO's admin only)
Item text, verbatim:

> Profile edit: all five fields are editable by the NGO's admin. Every other account,
> another NGO, a volunteer, a visitor, is rejected.
>
> **Verify:** AT-002.02
> **Blocked by:** D1.L1
> **Manifest:** `loop/decomp/req-002.md`, deliverable D1 leaf L2, revision `0579425`

Acceptance tests: AT-002.02, section A. The tenant isolation policies and the read-as-caller
rule already deny other accounts; this unit proves it for the five fields on the edit path.

### Unit 7: AI4DEV-107 (tier grants and the vet math: 10 a day unverified, 30 vetted)
Item text, verbatim:

> Tier grants and vet math: an unverified NGO gets exactly 10 Discovery credits a day, may
> draft, may not publish. A vet mid-day raises the cap to 30 with remaining = 30 − k, and
> later days grant 30. A re-vet never re-raises and never mints same-day credits.
>
> **Verify:** AT-002.04, AT-002.07, AT-002.08
> **Blocked by:** —
> **Manifest:** `loop/decomp/req-002.md`, deliverable D2 leaf L1, revision `0579425`

Acceptance tests: AT-002.04, .07, .08, section B. The grant numbers 10 and 30 are pinned
numbers; the at-config registry from the harness bring-up is where pinned numbers live.
Discovery turns do not exist yet, so consumption in the tests is a direct debit against the
allowance through whatever contract the design gives the Discovery agent to call later.

### Unit 8: AI4DEV-109 (UTC hard reset to the tier grant, once per UTC day)
Item text, verbatim:

> UTC hard reset to the tier grant from any starting balance, exactly once per UTC day, no
> rollover.
>
> **Verify:** AT-002.06
> **Blocked by:** D2.L1
> **Manifest:** `loop/decomp/req-002.md`, deliverable D2 leaf L3, revision `0579425`

Acceptance tests: AT-002.06, section B. The test parameterises the starting balance and
asserts once per day, so the reset needs a controllable clock at the integration tier.

### Unit 9: AI4DEV-116 (what vetting never gates: Discovery within allowance, after email verification)
Item text, verbatim:

> What vetting never gates: Discovery within the allowance is never vetting-blocked. Email
> verification precedes any Discovery message at every tier.
>
> **Verify:** AT-002.21, AT-002.22
> **Blocked by:** D2.L1
> **Manifest:** `loop/decomp/req-002.md`, deliverable D5 leaf L2, revision `0579425`

Acceptance tests: AT-002.21, .22, section E. The email-verification gate on unverified
writing exists from the auth requirement.

### Unit 10: AI4DEV-117 (pilot default: concierge onboarding vets at 30, founder-vetted wording)
Item text, verbatim:

> Pilot default: concierge onboarding leaves the NGO founder-vetted at 30. Public surfaces
> carry no "verified" claim. The flag renders only as "founder-vetted". The full
> public-surface sweep completes with the listing screens of a later wave.
>
> **Verify:** AT-002.28, AT-002.23
> **Blocked by:** D2.L1, D3.L1
> **Manifest:** `loop/decomp/req-002.md`, deliverable D5 leaf L3, revision `0579425`

Acceptance tests: AT-002.28, section E; AT-002.23, section F. AT-002.23 sweeps public
surfaces that do not exist yet; prove it on the public project page that exists today, and
declare the rest of the sweep in the manifest with a stated shape.

### Unit 11: AI4DEV-108 (zero-credit block, and the remedies that restore)
Item text, verbatim:

> Zero-credit block plus remedies that actually restore: the blocked message names vet,
> fund, or wait. Funding makes the next turn succeed on fuel. The day rollover makes the
> next free turn succeed.
>
> The funding remedy rides the Stripe checkout and the funded-turn billing of the Discovery
> agent, neither materialised. Decide in the design how those two edges are proven until
> they exist.
>
> **Verify:** AT-002.05, AT-002.26, AT-002.27
> **Blocked by:** D2.L1, plus the checkout action in the Stripe ledger requirement and
> funded-turn billing in the Discovery agent requirement
> **Manifest:** `loop/decomp/req-002.md`, deliverable D2 leaf L2, revision `0579425`

Acceptance tests: AT-002.05, .26, .27, section B. AT-002.26 needs a funded project; no
checkout exists.

### Unit 12: AI4DEV-110 (no Discovery wallet: paid continuation is project fuel)
Item text, verbatim:

> No Discovery wallet: paid continuation routes to the ordinary project-fuel checkout only.
> Funding is never vetting-gated.
>
> The checkout belongs to the Stripe ledger requirement, not materialised. Decide in the
> design how the route is proven until it exists.
>
> **Verify:** AT-002.10, AT-002.31
> **Blocked by:** D2.L1, plus the checkout action in the Stripe ledger requirement
> **Manifest:** `loop/decomp/req-002.md`, deliverable D2 leaf L4, revision `0579425`

Acceptance tests: AT-002.10, .31, section B.

### Unit 13: AI4DEV-115 (publish gates: unvetted blocked, vetted publish goes to triage)
Item text, verbatim:

> Publish gates: an unvetted NGO is blocked in the UI and at the API, and a project may sit
> scoped indefinitely. A vetted publish goes to triage.
>
> The publish flow belongs to the scope document and publishing requirement, not
> materialised. Decide in the design how the gate is proven until it exists.
>
> **Verify:** AT-002.19, AT-002.20
> **Blocked by:** D2.L1, plus the publish flow in the scope document and publishing
> requirement
> **Manifest:** `loop/decomp/req-002.md`, deliverable D5 leaf L1, revision `0579425`

Acceptance tests: AT-002.19, .20, section E.

Units 11, 12 and 13 reach into the Stripe checkout, the Discovery agent's billing, and the
publish flow, none of which exist. This is the shape the founder has ruled on twice: the
sign-in redirect stays red with a declared shape until its screen exists; the virtual-key
clause likewise. Before the design arena, ask the founder in one message, naming the ids
and the two options, declared red rows or fixture producers, and record the answer in the
decision trail.

## Facts from the repository

The board does not say these. The lead needs them.

1. `main` is at `ed1c157`, the squash of the notifications backend run. The branch was cut
   from it, and the only commit on the branch before you is this brief.
2. What the auth requirement landed and this run builds on: the three account types and
   the platform admin role; the `organizations`, `org_memberships` and `acknowledgments`
   tables; the `create-organization` and `update-organization` edge functions; the
   email-verification gate on unverified writing; the tenant read posture, one rule in SQL,
   reads as the caller, with a static catalog scan over the migrations in CI
   (`tests/at/suites/req-001/_policy-scan.ts`) and a live catalog check at integration;
   the append-only audit table for role changes and contact transfers; and one mandatory
   lifecycle-gate boundary that every write route registers through, with a conformance
   check that fails an unregistered route. Every table this run adds joins the posture, and
   every write route registers with the gate, or CI fails. Read the auth suite's
   `_contract.ts`, `_fixture.ts` and `_integration.ts` for the integration style the per-id
   gate expects.
3. What the notifications run landed: one shared emitter as the sole writer, the static
   taxonomy table, the outbox, and the delivery defaults. The verification-outcome row is in
   the taxonomy. Unit 3 emits through the emitter's contract; read
   `supabase/functions/_shared/` for it before designing.
4. The harness keeps pinned numbers in the at-config registry. The grants 10 and 30 go
   there, not in a test body.
5. The verify commands: `bun run typecheck`, `bun run at:check req-002`,
   `bun run at:selftest`, `bun run at:verify req-002 --tier loop --expect`,
   `bun run at:verify req-002 --tier integration --expect`. Run the auth and notifications
   suites at both tiers too: the lifecycle gate's conformance check and the emitter's
   sole-writer scan both change their result when this run adds routes and writers.
6. The verify skill under `.claude/skills/verify-ai4good/` drives the real stack: auth,
   edge functions, the database, and the mail catcher on the 44321 block. The mechanical
   agent drives it and captures the evidence under the item folder.
7. The pull request body must not name any id but the parent's own. The thirteen units are
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
