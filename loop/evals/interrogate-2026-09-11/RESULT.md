# The interrogate reviewers row: DeepSeek V4.1 Flash against grok

Question: can `opencode:opencode-go/deepseek-v4.1-flash` take grok's lane on `interrogate reviewers`.

Run on 2026-09-11. Method is the replay that seated astra and muse: the identical reviewer
prompt the four real lanes received on the admin-operations item, the identical diff, the
identical commit `d62a2d1`, read-only, in the `eval-interrogate-base` worktree. The prompts
differ from the real grok prompt only in the output filename. Scoring is coverage of the
fourteen act-on items in the lead's own verdict (`coverage-baseline.md`), plus new findings
verified by hand against the tree, plus false claims.

The opencode catalog renamed the model between 2026-09-09 and today. `deepseek-flash` is gone;
the id is `deepseek-v4.1-flash`, variants low, high, max. The first launch failed preflight on
the old id, which is the runner working as designed.

## Result

| Lane | Act-on items of 14 | Only this lane | New, verified | False claims | Cost | Time |
|---|---|---|---|---|---|---|
| grok 4.6 @xhigh (real) | 7 | item 10 | | 0 | $0.327 | 14.8 min |
| opus @xhigh (real) | 9 + 5 nits | items 12, 13 | | 0 | native | |
| fable @medium (real, seat now muse) | 9 + 4 nits | item 11 | | 0 | native | |
| astra @medium (real) | 5 | none | | 0 | codex | 9.8 min |
| muse 1.3 @xhigh (replay 09-07) | 4 + 2 nits | none | 4 | 0 | $0.036 | 8.0 min |
| **DeepSeek V4.1 Flash @max** | **5** | none | **5** | **0** | **$0.107** | **8.2 min** |
| DeepSeek V4.1 Flash @high | 5 + 1 nit | none | 4 | 1 | $0.074 | 4.8 min |

### Coverage detail

| # | Act-on item | grok | ds max | ds high |
|---|---|---|---|---|
| 1 | The transfer is one-shot per account (critical) | yes | no | no |
| 2 | Two races in the transfer definer (critical) | yes | yes, one of the two | no |
| 3 | Membership inserts attributed to the operator | yes | yes | yes |
| 4 | AT-001.33 proves neither half | yes | yes, inside finding 3 | yes |
| 5 | The SQL scan forgets grants on `create or replace` | | yes | yes |
| 6 | The write-route scan reads one file for three spellings | | no | yes |
| 7 | `attemptWrite` duplication, `WriteSubject` bag | yes | yes, both halves | yes, first half |
| 8 | Unreachable `standing.kind` branches | | noted, not raised | no |
| 9 | AT-001.29 never drives `complete-signup` | yes | no | no |
| 10 | Restated writers raise without a kind in DETAIL | **only grok** | no | no |
| 11 | PostgREST non-exception failure answered 409 | | no | no |
| 12 | `set_escalation_contact` has no audit row | | no | no |
| 13 | The virtual-key clause is a tautology | | no | no |
| 14 | Accepted nits | | none | fields-spread order |

### New findings, each verified against the tree at `d62a2d1`

DeepSeek at max, five:

1. `create_organization` trims with one-argument `btrim`, spaces only, at lines 472 and 494 of
   the lifecycle migration. `update_organization` in the same file uses the explicit whitespace
   set at 524 and 528, with a comment explaining the defect. The TypeScript rule uses `trim()`.
   A service-role caller stores an organisation named by a tab. VERIFIED.
2. The transfer never checks the outgoing account's lifecycle. The definer checks only the
   transferee at 351 to 353, and the TypeScript decision only the subject at 108. An already
   deactivated outgoing account transfers with two audit rows, not the documented three. VERIFIED.
3. AT-001.30 and .31 carry duplicated loop and integration bodies, with the same not-an-admin
   assertion at test file 172 and `_integration.ts` 2405, against the file's own shared-Given
   pattern. VERIFIED.
4. `standing.orgSeatAccountId !== fromAccountId` at `admin-operations.ts:81` is case-sensitive
   string equality while `UUID_SHAPE` accepts uppercase. No lowercasing anywhere. VERIFIED, low
   impact.
5. The `_pending.ts` header says 37 ids and 36 written after the branch added AT-001.41. VERIFIED.

DeepSeek at high, four: the `btrim` defect above, the pending header above, and two more:

6. The gate scan at `_policy-scan.ts:602` is an unanchored substring test, so a definer that
   writes first and calls the gate last passes. VERIFIED. Muse found the same on 2026-09-07.
7. The UUID-shape refusal lives only in `edge.ts` at 388. The fixture's `runWrite` at 717 passes
   raw selectors to the standing read, so the loop tier never grades that branch. VERIFIED.

### The false claim

DeepSeek at high closed with "concurrency is handled by the share/exclusive lock pair as
described". Astra and grok found two races in that function and the lead accepted both as
critical. This is the confident false assertion that sank the cheap models at explore. It did not
appear at max, and in a panel it costs the lead one dismissal, not a shipped defect.

## The seat answer

**Can DeepSeek at max take grok's lane?** On this replay, yes at a measurable price. With the
current panel, astra, muse, grok and opus, swapping grok for DeepSeek at max loses exactly one
act-on item, number 10, grok's lone warning about DETAIL kinds on restated writers. Every other
item grok found is also found by opus, muse or astra. It gains five verified defects no lane
raised, at a third of grok's cost and half its time. Item 1, the flagship critical, stays covered
by opus and muse.

**What the swap does not buy.** Twenty-two cents per run. The money in this panel is the native
opus lane, which bills the plan, not the three external lanes together.

**Reservations.** One replay on one diff. The high variant produced a confident false negative on
the very function where the panel's two criticals live, so the effort must be max, and max is the
variant that missed item 1 entirely. Both DeepSeek and muse would run on the opencode route,
which shares one usage window.

**The cheapest option again.** DeepSeek at max as a fifth lane, not a swap: eleven cents and eight
minutes for five verified defects, and the panel keeps grok's lone finding.

## Artifacts

`out/` holds both DeepSeek reviews with receipts, the muse replay copied from the 2026-09-07
scratchpad, and the lane logs. `reviewer-prompt-ds41-*.md` are the prompts and
`reviewer-prompt-grok-real.md` is the real lane's prompt for comparison. `coverage-baseline.md`
and `muse-replay-score.md` are the earlier scoring this run extends.
