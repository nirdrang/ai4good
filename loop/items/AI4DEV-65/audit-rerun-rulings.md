# Audit RE-RUN rulings — AI4DEV-65 (who signed fields)

Ruler: AUDIT RE-RUN sitting orchestrator, model Opus 5 (claude-opus-5[1m]) at effort max — this
sitting runs on the opus definition BY DESIGN (founder 2026-08-11), to spare fable. It is not a
credit-out fallback.

This is the ONE re-run this item gets. The panel ran at fix head
`9728a82f9361e5138f4f65ac51c637d3bf148551`, change-set the fix delta
`6ee87419b88aa210b1d08003536469666b65fec0...9728a82f` restricted to the code territory.

Both seats are ruled here:

- reader one, luna (codex `gpt-5.6-luna` effort max): **AUDIT: CLEAN**, every checklist box PASS
  (`artifacts/audit-rerun-luna.distilled.md`). A clean seat beside a seat with findings is
  evidence, never a veto — its verdict is recorded, and it did not clear the finding below,
  because it graded the rebuilt checklist and the disputed sentence sits outside every line of it.
- reader two, flash (opencode, variant max, agent `reviewer-flash`): **AUDIT: 1 FINDINGS**, plus
  two boxes graded COULD-NOT-VERIFY and explicitly NOT counted as findings
  (`artifacts/audit-rerun-flash.distilled.md`).

## Flash [1] S3 — ACCEPT (comment-only fix)

> "the comment says the four github rpc keys are omitted \"because the columns behind them are
> nullable and the omission is a real deployment bridge\" — but all four `volunteer_profiles`
> columns those keys feed are `not null`
> (`supabase/migrations/20260809090000_volunteer_github_link_and_imported_profile.sql:122-125`),
> and this item's own corrected migration paragraph states the opposite: \"but NOT because the
> columns behind them are nullable — all four `volunteer_profiles` columns are `not null` too.
> That bridge worked for two other reasons\"
> (`20260811120000_acknowledgment_signer_identity.sql:83-85`)."

> why it matters: "the tree now carries two contradictory statements of the same deployment
> mechanism inside one item — the corrected migration text vs this edge-function comment — so a
> future mixed-plane analysis reads a false reason here, the exact misdirection the first audit's
> finding 1 said a false bridge comment produces; the same sentence's contrast (\"these three back
> `not null` columns\") is also false in both directions, since the github keys' columns are not
> null too — the real contrast (every completion writes the acknowledgment row; an NGO completion
> never writes a `volunteer_profiles` row) is what the migration text now states. The sentence
> sits in this item's own added comment block (step 7's judged-values block) and in the declared
> 13-path territory; the fix delta's subject (the bridge mechanism) reaches it. Fix would be
> comment-only, matching the ruling class."

**Verified true, first-hand, by this sitting.** Four checks:

1. The four `volunteer_profiles` content columns are `not null` — read at
   `20260809090000_volunteer_github_link_and_imported_profile.sql:122-125`: `github_handle text
   not null`, `top_languages text[] not null`, `repository_count integer not null`,
   `contribution_summary text not null`. The comment's stated reason is false.
2. The contradiction is real and inside one item. This item's own corrected migration paragraph
   (`20260811120000_acknowledgment_signer_identity.sql:82-94`) states the opposite in terms.
3. The sentence is THIS ITEM'S OWN ADDITION, not inherited text. `git diff ea4f3453...dbd4076 --
   supabase/functions/complete-signup/index.ts` shows the three disputed lines as `+` lines.
4. The neighbouring comment block above it (`complete-signup/index.ts:106-117`) is PRE-EXISTING —
   it does not appear in this item's diff — and it is CORRECT: it grounds the github omission in
   PostgREST argument resolution, never in nullability. So the defect is confined to this item's
   own four added lines, and no out-of-scope defect sits beside it.

**This is the same defect the first audit already ruled, in a second file.** Luna's first-audit
finding 1 caught the false nullability claim in the migration; R9's fix corrected the migration
and did not sweep for other copies of the same sentence. The edge function carried the identical
claim and kept it. That is the mechanism of the miss, and it is worth stating plainly: a ruling
scoped to "the sentence" fixes one instance of a claim that lived in two places. Before the fix,
both texts were false and agreed; after it, they disagreed — which is why the fix delta genuinely
reaches this claim, exactly as flash argues.

Severity agrees: S3, a false statement about code in a comment, no behavioral effect. No SQL, no
TypeScript declaration and no test assertion depends on the sentence. But this item's boundary
comments are ruled load-bearing text (R6, R7, R9, R10), and my contract is not discretionary on
this class: a stated fact about the code that is untrue is never mergeable — either the code
changes to match the record or the record changes to match the code.

**Fix ordered (comment-only, zero statements change).** Replace the false reason with the true
mechanism, phrased to agree with BOTH the corrected migration paragraph and the correct
pre-existing block above it:

- the difference is NOT nullability — all four `volunteer_profiles` columns are `not null` too;
- the difference is which ROWS get written: an NGO completion writes no `volunteer_profiles` row,
  so omitting the github keys reaches no column, which is what makes that omission usable as a
  deployment bridge;
- EVERY completion writes the acknowledgment row, so no caller class avoids these three columns —
  an omitted argument arrives as the default null, fails the constraint, and aborts the whole
  transaction.

Each fact in the ordered text was verified by this sitting before it was ordered: the
`volunteer_profiles` insert sits inside `if v_account_type = 'volunteer'`
(`20260811120000...sql:306-317`), and the acknowledgment insert is unconditional, after that
block's `end if`, carrying the three new columns.

## The two COULD-NOT-VERIFY boxes — settled first-hand by this sitting

Flash could not read the delta's bytes: its cage denies the parent repository's `.git` and it has
no shell. It named the settling commands rather than guessing, and did not count either box as a
finding. That is the correct behaviour, and this sitting has git access, so both settle here.

**F11 — the exhaustive half: PASS.** Command run:
`git diff -U0 6ee87419...9728a82f -- src supabase tests .github package.json bun.lockb
tsconfig.json vitest.config.ts`. Result: `--numstat` reports 8 added / 3 removed in
`supabase/migrations/20260811120000_acknowledgment_signer_identity.sql` and 6 added / 1 removed in
`tests/at/suites/req-001/_contract.ts` — 15 changed lines in total, across exactly two files.
Classifying every one of those 15 lines: **zero are non-comment lines.** Every changed line is a
`--` SQL comment, a JSDoc continuation, or blank. F11's claim — the fix delta changes comments
only, zero SQL statements and zero TypeScript declarations — is exhaustively true.

**Declared-scope box — the fix-delta half: PASS.** Commands run:
`git diff --name-only 6ee87419...9728a82f -- <code territory>` returns exactly two paths, the
migration and `_contract.ts`, both inside the declared thirteen. The full-range variant
`git diff --name-only ea4f3453...9728a82f -- <code territory>` returns exactly the declared
thirteen paths and no fourteenth; `src/routeTree.gen.ts` is absent. I also ran the full range
against the CURRENT branch head `dbd4076` and got a byte-identical thirteen-path list, which
confirms that every branch commit after the fix head is record-only. The scope box holds at the
head this sitting closes on, not merely at the audited head.

## What this closes

The audit phase is CLOSED after the fix below lands. There is no second re-run: the once-per-item
re-run is spent, and my contract is explicit that a fix needing a further audit re-run would be
scope growth to escalate rather than a licence to skip. This fix does not approach that line — it
is one comment paragraph, in a file the panel read at this head, correcting it to state what two
other texts in the same tree already state correctly. Nothing about the code's behaviour, its
declarations or its tests moves.
