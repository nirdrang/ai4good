# AI4DEV-57 (email + Google signup, three account types) — phase state

**Phase just completed:** the FIX AND GOAL sitting (sitting 4). Every Gate 2 finding is ruled, every
accepted fix is applied, and **all three unmet plan steps have now been executed** — step 6, step 7
against the live stack, and step 8's whole verify surface. The rulings were pushed before any code
changed.
**Phase next:** the **AUDIT**. The brief is `loop/items/AI4DEV-57/audit-brief.md`.
**Branch:** `nirdrang/ai4dev-57-email-and-google-signup-and-the-three-account-types-d1l1`
**Chain, derived from the branch:** AI4DEV-57 (email + Google signup, three account types) →
AI4DEV-51 (accounts and sign-in container) → AI4DEV-50 (auth dev-tree root) → AI4PM-19 (the
authentication requirement). No `attr:` label anywhere on the chain. Product work under a real
requirement; this leaf itself closes on a merged pull request.

---

## THE OPUS FALLBACK IS IN FORCE FOR THIS ITEM, NOT JUST ONE SITTING

Fable is out of credit. Every orchestrator sitting on this item runs as `orchestrator-opus` (opus at
effort max), a different agent TYPE, never a model override on the fable definition. A fable ruling
and an opus ruling are not the same evidence: every decision in `plan.md`, all nine rulings in
`gate1-rulings.md`, all eight in `draft-rulings.md` and all thirty-odd in `fix-rulings.md` are opus
rulings. A successor sitting that finds itself running as fable should say so in its first line
rather than assume continuity.

A session limit is not the same thing as being out of credit. If the reason ever reads
"You've hit your session limit · resets HH:MM", that is the account-wide five-hour window, it heals
itself, and an opus agent hits the same wall.

---

## STANDING HAZARD — STILL BINDING. READ BEFORE RUNNING A BUILD ON THIS BRANCH

**`bun run build` rewrites `src/routeTree.gen.ts`.** Ten lines, a stale `declare module` block,
deterministic, reproduced twice by the executor and reverted both times.

Continuous integration fails any pull request whose files match **both** `^src/` and
`^(supabase|tests|loop|\.claude|\.github)/`, and this branch is permanently on the wrong side of that
line. **So an unexamined `git add -A` after a build breaks the build**, for a reason that has nothing
to do with the change.

**The fix sitting did not run a build at all, and that was a ruling rather than an oversight.** Build
is not in step 8's done-criterion — that list is `typecheck`, `at:selftest`, `at:check` and
`at:verify --expect` for both requirements — and nothing in the fix list touched anything a build
covers. Verified at the close: `git diff main...HEAD --name-only` matches `^src/` **zero times**.

Regenerating that file properly is a `src/`-only change belonging to a different pull request.
**Filed, not fixed.**

---

## THE GATE WAS SHORT A READER — RECORD THIS IN THE MERGE RULING

Stated verbatim as it was handed to this sitting:

> the SQL+config slice had ONE completed independent reader (terra, 8 findings) where the gate's
> design calls for two; the TypeScript+tests slice had both readers complete (terra 11, kimi 7).
> Kimi is out of credit for the rest of this item — do not attempt another kimi launch on any later
> gate for this item; if a second reader is wanted for future gates in this item, that decision is
> the founder's, not yours to force.

Kimi's SQL run exhausted its billing quota mid-run and **never emitted a verdict or a closing count
line**. Its salvaged notes were therefore treated as **leads to verify against the tree**, not as a
reviewer's findings — the method is written out in `fix-rulings.md` Part C so an auditor can check
the method rather than the outcome. Two of the five were duplicates of completed findings, two were
verified and accepted as **my** findings, one was folded into a larger ruling.

**One of those leads produced the single most valuable check in the item** (L3): nothing anywhere
proved that a **service-role** write into `public.accounts` is refused, which is the load-bearing half
of this item's "there is no key-reachable write path — it is the only door" security claim. Check (e)
only ever used the *authenticated* key. That check now exists and passes. A billing-quota exhaustion
is not a session-window limit and does not heal itself at a reset.

---

## What completes the next phase

**The AUDIT, read-only, per `audit-brief.md`.** It runs once. Its subject is the CLAIM, not the code's
quality.

If it finds nothing, the merge sitting absorbs its wait and CI's together, and **the merge sitting
records the audit's clean verdict among the dispositions** — a clean audit is evidence, not a step
that silently did not happen.

If it finds something, that gets its own sitting.

---

## The state of the code, honestly

**Head `b4688fe`.** Tree clean. Four commits in the fix sitting on top of the rulings commit.

**Run and passing, verified by me directly and not taken from the executor's report:**

| what | result |
|---|---|
| `bun run at:selftest` | **exit 0 — 9 files, 251 tests passed.** This is the job that failed CI at the previous head |
| `bun run at:verify req-001 --tier loop --expect` | **exit 0 — 37 P0: 4 green, 33 red, 0 missing**, matching the declaration exactly |
| step 7, `proof-local.txt` | **14 checks: 13 passed, 0 failed, 1 SKIPPED, plus 1 measurement that asserts nothing** |
| step 8, `verify-final.txt` | six commands, all exit 0; req-016 identical to the step-0 baseline |

**The four real acceptance bodies have now been executed for the first time**, and the two oracles
strengthened by the critique (a refused signup with no acknowledgment, and a refused volunteer
leaving nothing behind) passed without anything being weakened to make them pass.

**The one skip is honest and is (f2), the Google handshake** — `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`
was absent, which is the expected case because creating the OAuth client is a founder-manual step.
The script now prints `EVERY CHECK THAT RAN PASSED — 1 DID NOT RUN` instead of `ALL CHECKS PASSED`.
Before this sitting it would have counted that skip as a pass.

---

## What step 7 MEASURED, which changes what a green may claim

**The acknowledgment IP is chosen by the caller.** Measurement (n), on the live local stack: a
spoofed `x-forwarded-for` was stored **verbatim**; with **no** header the stored value was
`172.18.0.1`, the Docker bridge — the gateway's own hop, not the client. Four reviewers asserted this
and all four marked it unverifiable by reading. **AT-001.01 may say the acknowledgment records an
address; it may never say a verified source address.** The code now refuses anything that is not a
well-formed IP, so the column cannot hold garbage — but validity is not authenticity. The hosted
gateway is unobserved.

**The CORS preflight proves the LOCAL gateway only**, and the transcript records that Kong replaces
the function's `access-control-allow-methods` with its own longer list. The check asserts POST is
permitted rather than pinning the string, so it is unaffected.

Both are written into `plan.md` section 4, which is what the merge ruling gets checked against.

---

## Filed, not built — carried forward, named rather than dropped

1. **The `x-forwarded-for` trust model** (`fix-rulings.md` B3c, E1). Now with a real measurement
   behind it. Belongs to whoever lands the hosted deployment, with the deployed proxy chain in view.
2. **A client-reachable account-type read** (B4). Row-level security is on with no policies, no Auth
   metadata carries the type, no endpoint returns it — so the type is carried for the **server** and
   for **no browser**. The wiring leaf needs this and it is a `supabase/`-territory change, so it
   cannot ride in the same pull request as the screens. Discovering that at its merge would be late.
3. **No test attempts an NGO signup with an empty organisation name** (E3). `validateCompleteSignup`
   and `validateOrganizationName` both live in the shared module — neither escaped it, which is why
   B6 was not extended — but a divergence between their two non-empty checks would be caught by
   nothing. Deliberately not built at the close of a fix sitting; no reviewer raised it.
4. **`AGENTS.md` is badly stale** — documents `/pm-next`, `/dev-start`, `/bind` and TaskMaster, all
   deleted, and its section 5 ends in a corrupted table fragment at line 93. Pre-existing.
5. **`src/routeTree.gen.ts` is stale** and is regenerated by every build. See the standing hazard.
6. **The 4xx→409 status mapping in both edge functions** is correct for every currently reachable
   case and would mislabel a database-raised 400 or 403. Rejected as speculative (B10); it becomes
   real when a second caller of those database functions appears, and is that change's to fix.

---

## Open questions for the founder — the conductor raises these, I do not

### 1. The signup SCREENS — ANSWERED and folded in. Closed.

### 2. The Google OAuth client — ANSWERED in direction; now with a concrete, measured gap

The founder ruled a real Google OAuth client will be created; creating the credential is a
founder-manual step. It blocked nothing and the item proceeded unchanged. **What the item can now say
exactly, having run step 7:**

- **Proved:** the provider block is well-formed, the stack starts with it, and `/auth/v1/settings`
  reports Google enabled with apple untouched — check (f) passed.
- **Not proved, because the credential was absent when step 7 ran:** that the configured client id
  reaches the provider handshake. Check (f2) was **SKIPPED**, and a skip is now recorded as a skip.
  This becomes provable with no human involved the moment the variable is in the environment — one
  re-run of `proof-local.ts`.
- **Never provable by any agent:** the consent round trip itself. **AT-001.03's "sign-in via Google
  succeeds on return visits" clause stays unproved by this item whether or not the credential
  arrives.** Closing it needs a person to sign in once and that evidence recorded.

`.env.example` now names `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and
`SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, so there is an obvious place for the credential to land.

### 3. Edge function or `createServerFn` — STILL OPEN; nothing challenged the ruling

Server logic lives in `supabase/functions/`, because `createServerFn` lives in `src/`, which this
item may not touch. Nothing in the critique gave a reason to revisit it. The contradiction between
the two checked-in documents is real, is not this item's to fix, and **will bite the screen-wiring
leaf squarely** — together with items 2 and 6 in the filed list. Relayed, not escalated.

---

## Facts established in the tree, which no later sitting should re-derive

Facts 1–11 from the previous sitting all still hold. Added this sitting, by measuring:

12. **`SuiteId` is now a two-member union**, and TypeScript prints a single-member type alias as its
    literal but a multi-member one **by its alias name**. That is the whole cause of the four probe
    failures at the previous head — the seam was never weaker. Any future item registering a suite
    adapter should expect diagnostics naming `SuiteId` rather than a requirement literal.
13. **The migration self-test's baseline is no longer empty and never will be again.** It now reads
    the baseline rather than hard-coding it, so the next migration does not re-break it.
14. **`service_role` cannot INSERT into `public.accounts`** — measured, not argued: HTTP 403,
    `permission denied for table accounts`, errcode `42501`, zero rows after. The "only door" claim
    is now evidence.
15. **Atomicity is demonstrated on the real database:** a completion forced to fail on its last write
    left zero rows in all four tables.
16. **The local gateway does not rewrite `x-forwarded-for`** — see the measurement above.

---

## Caps, carried forward

- The executor gets three attempts to reach green inside one invocation, then reports. **This sitting
  used one of three** — every phase passed its gate on first execution.
- An orchestrator sitting may send the executor back twice — three invocations per sitting. **This
  sitting used one of three.**
- **The audit re-runs once per item, and only if code changed. Not yet used.**
- A suspected CI flake gets one re-run of the check, with no new commit. Not yet used.
- A green local verify against a red CI gets two pushes, then escalation with the evidence. Not yet
  used.

When a cap fires: **stop working, do not stop judging.** What remains is written down as open items —
filed as separate work, or escalated as scope growth. "We ran out of rounds" is never recorded as
"the finding was invalid."
