# Audit rulings — AI4DEV-65 (who signed fields)

Ruler: AUDIT sitting orchestrator, model Fable 5 (claude-fable-5) — the first audit sitting,
not a re-run. The audit was a two-reader panel at code head
`6ee87419b88aa210b1d08003536469666b65fec0`: luna (codex, 2 findings,
`artifacts/audit-luna.distilled.md`) and flash (opencode, CLEAN with two COULD-NOT-VERIFY
items, `artifacts/audit-flash.distilled.md`). Both seats are ruled here. Each claim is quoted
verbatim; each ruling is one of the contract outcomes.

## Luna [1] S3 — ACCEPT

> "The deployment-bridge comment says the previous GitHub parameters were backed by nullable
> columns, but the previous migration defines all `volunteer_profiles` fields as `NOT NULL`."

Verified true against the tree. The new migration's bridge paragraph
(`supabase/migrations/20260811120000_acknowledgment_signer_identity.sql`, lines 82–84) says the
previous four github parameters "could bridge a mixed-plane window because the columns behind
them are NULLABLE". The columns behind them are the four `volunteer_profiles` columns, and the
previous migration (`20260809090000_volunteer_github_link_and_imported_profile.sql`, lines
120–127) defines every one of them `not null`. The previous migration's own bridge comment
(lines 152–164) gives the real mechanism: the four parameters carry `default null` so a
five-named-argument call still resolves, and an NGO completion writes NO `volunteer_profiles`
row at all — while volunteer completion is fail-closed during a mixed window (its honest
residual). Luna states the same mechanism.

The false sentence does not change the paragraph's conclusion — the three new columns are
`not null`, so the three new defaults are call-signature tolerance and not a bridge, which
stays correct. But the stated reason is false, and this item's migration comments are ruled,
load-bearing boundary text (R6, R7). A false comment about deployment behaviour is exactly
what would misdirect a future mixed-plane analysis.

**Fix ordered (comment-only, zero SQL statements change):** rewrite the sentence to state the
real prior mechanism — the previous bridge worked because the defaults let an old-shape call
resolve AND an NGO completion writes no `volunteer_profiles` row; volunteer completion was
fail-closed in a mixed window. The contrast to draw with the three new columns: EVERY
completion writes the acknowledgment row, so there is no caller class that avoids the new
`not null` columns — which is why the new defaults cannot bridge anything.

## Luna [2] S3 — ACCEPT (convergent with terra's gate 2 finding 1)

> "The acknowledgment row comment says only the shipped authority statement can appear, but
> the SQL function intentionally permits any nonblank statement for a `service_role` caller."

Verified true as a comment overclaim. `tests/at/suites/req-001/_contract.ts` (lines 91–98)
says "`validateCompleteSignup` accepts no other, so today exactly one value can appear here."
The inference holds only for the deployed path. The ruled boundary (gate 2, terra finding 1,
accept-fixed-differently — R6) states the opposite for the trusted-key path: a `service_role`
caller that bypasses the edge function can store any nonblank statement, and that residual is
accepted and stated in the migration's boundary comment. One comment in the branch now
contradicts the ruled boundary text.

**On the unverified-runtime marker (luna proposed a migration replay plus direct RPC):** no
probe is run, and the finding is accepted on static evidence alone. The underlying fact was
verified true against the tree at gate 2; the constraints' width was measured first-hand on
slot 1 in the verify-first FEFF probes; and gate 2 already declined the direct-RPC probe
because class membership settles the constraint's behaviour mechanically — a live bypass call
would measure nothing the record leaves open. The same reasoning stands here.

**Fix ordered (comment-only):** scope the sentence to the deployed path and name the residual,
consistent with the migration's boundary comment — through `validateCompleteSignup` exactly
one value can appear; a service-role caller bypassing the edge function can store a different
nonblank statement (the accepted residual), and the column then shows verbatim what was
affirmed.

## Flash seat — CLEAN, and its two COULD-NOT-VERIFY items settled by this sitting

Flash's declared count line is `AUDIT: CLEAN` (0 findings): R1–R8 and F1–F6, F8–F10 graded
PASS with cited evidence. Recorded as a verdict among these dispositions. Flash's launch cage
denies the parent repository's `.git` directory, so two boxes depending on the base commit's
bytes were graded COULD-NOT-VERIFY, each with the settling command named. This sitting ran
both commands, first-hand:

1. **Checklist section 2 — exact 13-file territory equality: SETTLED, PASS.**
   `git diff --name-only ea4f3453...6ee87419 -- src supabase tests .github package.json
   bun.lockb tsconfig.json vitest.config.ts` returns exactly the thirteen claimed paths, no
   more, no fewer; `src/routeTree.gen.ts` is absent. This corroborates flash's own negative
   evidence (an identifier sweep finding no matches outside the thirteen paths).
2. **F7 second half — the manifests against base: SETTLED, PASS.**
   `git diff ea4f3453...6ee87419 -- tests/at/expected/req-001.json
   tests/at/expected/req-016.json` shows `req-001.json` moving exactly AT-001.19, AT-001.39
   and AT-001.20 from red (`pending`/`sut-missing`) to green in BOTH tier blocks and nothing
   else, and produces no diff lines for `req-016.json` at all — untouched, byte-level.

No source was touched to settle either item. F7 and the territory line are now fully graded
PASS across the panel.

## Convergence note

Luna's finding 2, terra's gate 2 finding 1, and flash's gate 2 self-dismissed concern describe
the ONE service-role boundary from three independent seats. The boundary itself was ruled and
stated at gate 2; luna's new contribution is the single comment that still overclaims against
it. Luna's finding 1 stands alone and is the only new fact defect the audit found.

## Disposition summary

| finding | severity | ruling |
|---|---|---|
| luna 1 | S3 | accept — migration bridge sentence rewritten to the real prior mechanism; comment-only |
| luna 2 | S3 | accept — `_contract.ts` comment scoped to the deployed path, residual named; comment-only; no runtime probe (static evidence suffices, reasoning recorded) |
| flash (seat) | — | clean; verdict recorded; both COULD-NOT-VERIFY items settled PASS by this sitting, first-hand |

## Consequence

Both fixes are comment-only, but both files sit inside the declared code territory, so the
source-only diff instrument moves at the new head. Per the phase state: the whole panel
re-runs ONCE at the new head, scoped to the fix delta, and that re-run sitting runs on opus.
The rebuilt claim checklist for the re-run is in `PHASE-STATE.md`.
