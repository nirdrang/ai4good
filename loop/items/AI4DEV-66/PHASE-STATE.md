# PHASE-STATE - AI4DEV-66 (cross-org denial, no existence oracle), batch with AI4DEV-67 (assigned volunteer, admin, stranger)

**Phase: PLAN COMPLETE. The next event is GATE 1 - one reviewer critiques the plan.** Written by
the PLAN sitting, orchestrator on **opus @ max**, 2026-08-12.

## THE MODEL RULING FOR THIS RUN - CARRY IT FORWARD

The founder ruled (relayed 2026-08-12) that **every orchestrator sitting of this item runs as
`orchestrator-opus` at opus/max effort** - plan, draft, fix-and-goal, and the FIRST audit - not
only the merge and audit-re-run sittings that are opus by design. This is a deliberate founder
choice for this run. It is **not** a sign that fable has no credit. The conductor spawns every
subsequent sitting of this item the same way, and every state file repeats this paragraph.

## Attribution, derived from the branch

Branch `nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`, cut from
`origin/main` at `948d4f0`.

`AI4PM-19 (auth and org membership)` > `AI4DEV-50 (auth root)` >
`AI4DEV-55 (tenant isolation and visibility)` > `AI4DEV-66 (cross-org denial, no existence oracle)`.

`AI4DEV-67 (assigned volunteer, admin, stranger)` rides this branch. It is the manifest's D5.L2,
blocked by D5.L1, which is why the two are batched.

**Database slot 1**, reserved under this item, covers both. Every integration-tier run uses slot 1.

## THE PULL REQUEST BODY - FOR THE MECHANICAL WHO WRITES IT

The pull request closes **AI4DEV-66** through its own branch link. **AI4DEV-67 closes through the
one sanctioned batch line**, per `CLAUDE.md` and the reference guard in `.github/workflows/ci.yml`
lines 351-370:

- one line, of exactly the shape `Closes AI4DEV-67`, alone on its line, nothing else on it;
- at most one such line in the whole body;
- **it is added by the MERGE ruling's mechanical, not before.** The predecessor item held its own
  partner line out until the merge sitting for the same reason: a closes-line in an open pull
  request closes the partner on merge, and the merge must be the thing that decides it.
- No other item id may appear anywhere in the title or body. Name other items in words.

The plan-sitting mechanical opens the pull request with **no closes-line and no other item id**.

## What was produced this sitting

- `loop/items/AI4DEV-66/plan.md` - the decisions, seventeen steps each with its own
  done-criterion, the per-id verification table, and the slicing decision.
- `loop/items/AI4DEV-66/gate1-prompt.txt` - the assembled gate-1 prompt.
- This file.

No code was written. No file outside `loop/items/AI4DEV-66/` was touched.

## What completes the next phase - GATE 1

One reviewer (sol via codex), launched by one reviewer-runner, handed
`loop/items/AI4DEV-66/gate1-prompt.txt` **as written**. Raw output and distillate into
`loop/items/AI4DEV-66/artifacts/`. The phase completes when the runner reports its distillate, or
reports the gate as empty.

The prompt is already assembled: `## Your contract` + the PLAN review section only + this item's
additions. It carries no Pins block and names no other gate. Do not append to it.

## The shape of the plan, in one paragraph

This is the leaf that lands this repository's first row-level-security policy set. Every table
today has row-level security on with zero policies, which denies everybody - the safe default, not
the requirement. The plan lands one shipped decision module
(`supabase/functions/_shared/visibility.ts`), a migration carrying the policy set and its grants,
three read edge functions, and ten test bodies across two tiers. "No existence oracle" is made
structural: one exported refusal constant that every non-public surface returns for both "no such
row" and "exists, not yours", so the two answers cannot drift apart. The work is **SLICED IN TWO**
and the code gate runs per slice - slice 1 is AI4DEV-66's two denial ids, slice 2 is AI4DEV-67's
three grant ids.

## OPEN QUESTIONS FOR THE FOUNDER - two, and the plan proceeds on the proposed answers

**1. AT-001.24 asks for something this item's territory forbids it to build.** The criterion is
about a browser: public surfaces render, authenticated surfaces redirect to sign-in.
`.github/workflows/ci.yml` lines 242-292 fail any pull request that changes both `src/` (Lovable
territory) and `supabase/ tests/ loop/ .claude/ .github/` (Claude territory); this item lives
entirely in the second. There are also no screens to guard - `src/routes/` holds one heading and a
root layout. The auth screens have their own wiring leaf in the manifest (D2.LW); D5.L2 has none,
so this criterion has no leaf that can satisfy its user-interface half.
**Proposed answer:** land the shipped decision, the API-level denials and a route registry here;
declare AT-001.24 capability-pending at integration tier; and file a D5 wiring leaf for the screens,
the way D2 has one. The founder may instead prefer to hold AT-001.24 out of this item entirely.

**2. The data the criteria enumerate does not exist.** AT-001.21 names drafts, ledger, files,
thread and dashboard; AT-001.22 and AT-001.23 name reference files, thread and tasks. This tree
holds only the organisation record, its projects, its memberships and its acknowledgments - the
dashboard kind. The others belong to requirements that have not landed.
**Proposed answer:** isolate every kind of tenant data that exists, land a catalog conformance arm
so a later requirement's table cannot arrive unisolated, and name the absent kinds in the merge
ruling as what the green does not claim. Building the missing tables would land three other
requirements early and is not proposed.

Neither question blocks gate 1. The conductor raises both while the reviewer reads.

## Residuals already known, for the eventual merge ruling

1. **Timing is not defended.** The no-existence-oracle claim is about response CONTENT and status,
   not about response time. No side-channel measurement is planned and none is claimed.
2. **AT-001.24's green is about a decision, not a rendering.** The same standing AT-001.10's green
   has, and for the same reason: there is nowhere yet to enforce it.
3. **The route registry's conformance arm is a naming-and-declaration oracle**, the same class as
   AT-001.17's source arm. It proves every route is declared, not that a declared-public route
   shows nothing private.
4. **The public project surface reveals that a project exists**, deliberately. That is the
   criterion's own "beyond public surfaces" carve-out and it is kept in a separate function so it
   cannot contaminate the no-oracle test.

## Two measurements this sitting made, recorded because both could mislead later

1. **The plan is about 31 KB, over the contract's "roughly 25 KB" line, and that is a RULING.**
   The line exists because a plan past it "is carrying evidence it should be citing". This plan
   pastes no code, no reviewer output and no transcript - every fact is a path plus line numbers.
   The bulk is thirteen established facts and seventeen steps, each with its own done-criterion,
   for five acceptance ids across two board items. Trimming further would remove teeth, so it was
   not trimmed further. Redundancy WAS removed: three facts about the policy posture became one
   sequence, and the founder questions are stated once here and by pointer in the plan.

2. **An encoding check reported a false negative and was caught by a second instrument.**
   `Select-String -Pattern '[^\x00-\x7F]'` reported no non-ASCII characters in the gate-1 prompt.
   Reading the same file's bytes through .NET reports **152 non-ASCII bytes, 49 em-dashes and zero
   replacement characters** - the reviewer contract is verbatim and uncorrupted, and the first
   instrument was simply wrong. The invariant that says to re-measure a negative with a different
   instrument earned its place again. `plan.md` is genuinely pure ASCII, by the same second
   instrument.

## Caps used so far

Executor invocations: **0 of 3**. Goal iterations: **0**. Audit re-run: **unused**. CI flake
re-run: **unused**.
