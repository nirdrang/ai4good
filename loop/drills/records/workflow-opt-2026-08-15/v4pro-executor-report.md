# EXECUTOR REPORT â€” AI4DEV-65 (acknowledgment identity capture: name, title, authority attestation)

The amended plan is implemented. All three required commands are green, plus the loop-tier exact-match verification the plan's table names. Everything that needs a live database is marked UNVERIFIED below.

## 1. Files created or changed

**Created**

1. `supabase/functions/_shared/acknowledgment-copy.ts` â€” the shipped copy module (decision D): `authorityStatement`, `sharedCredentialsProhibition`, `orgEmailRecommendation`, exactly the decision's text.
2. `supabase/migrations/20260810000000_acknowledgment_signer_identity.sql` â€” the migration (decision E): the three `text not null check (col !~ '^\s*$')` columns on `public.acknowledgments`, the drop of the exact current 9-arg `complete_signup`, its recreation with the three `default null` parameters appended and inserted into the acknowledgment row, the re-stated revoke/grant tail, and `notify pgrst, 'reload schema';`. Timestamp sorts after every existing migration.

**Changed**

3. `supabase/functions/_shared/accounts.ts` â€” `CompleteSignupRequest` gains the three optional `unknown` fields, `ValidCompleteSignup` gains the three `string` fields, and `validateCompleteSignup` gains the four checks in the ordered position the plan pins (after the text-version check: name â†’ title â†’ attestation-present â†’ attestation-match against the imported shipped statement), returning the values trimmed.
4. `supabase/functions/complete-signup/index.ts` â€” reads the three body fields into the shared module and passes the judged values as `p_signer_name`/`p_signer_title`/`p_authority_attestation` in the rpc call (never the raw body values, matching how `githubHandle` travels).
5. `tests/at/suites/req-001/_contract.ts` â€” `AcknowledgmentRow` gains the three fields; the "deliberately absent" comment is replaced by the one sentence naming this leaf.
6. `tests/at/suites/req-001/_fixture.ts` â€” the loop-tier write path destructures the three judged values and stores them on the acknowledgment; read-back is through the widened row type.
7. `tests/at/suites/req-001/_live.ts` â€” `acknowledgments()` selects `signer_name`, `signer_title`, `authority_attestation` and maps them.
8. `tests/at/suites/req-001/_integration.ts` â€” every succeeding completion gains the three fields; `registerConfirmAndSignIn` is now exported (the plan's integration bodies for this item need it).
9. `tests/at/suites/req-001/a-signup-and-signin.test.ts` â€” signer fields on every completion that must succeed, including AT-001.03's shared byte-identical `request` and AT-001.04's byte-identical refused-then-succeeding `request`; refusal-under-test requests for earlier checks (AT-001.01's no-acknowledgment, AT-001.07's `platform_admin`) are left omitting them.
10. `tests/at/suites/req-001/b-verification-and-sessions.test.ts` â€” signer fields on its four completions.
11. `tests/at/suites/req-001/c-membership-and-acknowledgment.test.ts` â€” the three real bodies replacing the `notLanded(LEAF.D4_L1)` stubs: AT-001.19 (`{ default, integration }`: NGO + GitHub-linked volunteer at loop, NGO-only at integration, verbatim value assertions on every row), AT-001.39 (`{ default, integration }`: seven refusal variants with field-named reasons and full no-partial-state assertions plus a control at loop; the three omission variants against the deployed function at integration), AT-001.20 (one body for both tiers, grading the copy by direct import by meaning).
12. `tests/at/suites/req-001/_pending.ts` â€” `D4_L1` removed from the `LEAF` map, gone-leaf comment added, header count 24 â†’ 21.
13. `tests/at/expected/req-001.json` â€” AT-001.19/.39/.20 moved from red to green in BOTH tiers; nothing else changed.

NOT changed: `.opencode/agent/executor-v4pro.md` shows as untracked in `git status`; it predates my session and is not mine.

## 2. Commands run, with exit status and decisive output

| command | exit | decisive lines |
|---|---|---|
| `bun tests/at/typecheck.ts` | 0 | `typecheck OK: both configs clean` |
| `bun tests/at/harness/check.ts req-001` | 0 | `RESULT: 37 P0 ids in bijection` |
| `bunx vitest run --root tests/at --config vitest.config.ts harness/` | 0 | `Test Files 13 passed (13)` / `Tests 344 passed (344)` |
| `bun tests/at/harness/check.ts req-016` | 0 | `RESULT: 12 P0 ids in bijection` |
| `bun run typecheck` | 0 | `typecheck OK: both configs clean` |
| `bun run at:verify req-001 --tier loop --expect` | 0 | `37 P0: 16 green, 21 red, 0 missing` â€” `EXPECTED: â€¦ matches tests/at/expected/req-001.json exactly (16 declared green, 21 declared red)` |
| `bun run at:verify req-016 --tier loop --expect` | 0 | `12 P0: 11 green, 1 red, 0 missing` â€” `EXPECTED: â€¦ matches â€¦ exactly (11 declared green, 1 declared red)` |

In the req-001 loop run, AT-001.19, AT-001.39 and AT-001.20 all report green, and the 13 pre-existing greens stayed green â€” the ordering guarantee from decision B held (every pinned earlier refusal still fires first). Exit codes were captured via `$LASTEXITCODE` after each command (not through a pipe).

## 3. What I could NOT verify, and what would settle each

- **The integration tier** (both `AT_DB_SLOT=1` + `bun run at:verify req-001 --tier integration --expect` and the req-016 equivalent). No database is reachable in this session and the brief forbids starting one. UNVERIFIED: the AT-001.19/.39/.20 integration bodies, and that the deployed `complete-signup` â†’ `public.complete_signup` â†’ row chain behaves as the loop tier predicts. Settling command: the two integration runs above against the item's reserved slot, serially, with `--expect`.
- **The migration replay itself.** The SQL was never applied to any Postgres. UNVERIFIED: that the `add column â€¦ not null` succeeds on the empty table, that the 12-arg function replaces the 9-arg one without overload, and that `anon` holds no EXECUTE. Settling probe: `supabase db reset` (which the integration runner performs each run, then proves the migration set replayed), or applying all three migrations in order to any Postgres and checking the catalog (`\d public.acknowledgments`, `has_function_privilege` for `anon`).
- **The edge function's runtime behavior** (Deno, `verify_jwt`, the PostgREST named-argument call with the three new keys). No type-checker covers the entry point; only a deployed run settles it. Settling command: the integration run above (the deployed function is served out of the mirrored `supabase/` tree).
- **AT-001.19's GitHub-session clause at integration** â€” deliberately not claimed (decision F); proved at loop tier only. Settling is capability-gated, same as AT-001.02/.04/.05.

## 4. Where the plan and my execution disagree (reported, not silently decided)

1. **The ledger vs. the scope limit.** Plan step 12 requires writing `loop/items/AI4DEV-65/pending-ledger.txt`; the executor brief says "Do NOT edit anything under `loop/`." I followed the scope limit and did NOT create it. Nothing mechanical checks the ledger â€” `at:check` and both `--expect` runs are green without it â€” but the plan's step 12 is therefore incomplete by one artifact. Settling: create that file in the `loop/items/AI4DEV-60/pending-ledger.txt` format (three lines gone â€” AT-001.19/.20/.39 â†’ D4.L1, landed GREEN; count 24 âˆ’ 3 = 21; manifest cross-check).
2. **Plan step 11 lists "AT-001.04's unlinked-volunteer requests" among those that "may omit" the fields.** That literal is the same byte-identical `request` object that must SUCCEED after the GitHub link (the test's own comment pins byte-identity as the cause attribution). Omitting there would break the success half. I implemented the plan's own governing clause â€” "where a completion must SUCCEED, the fields are present" â€” so the fields ARE on AT-001.04's request; the pre-link refusal still fires at the GitHub-link gate (before the new checks), so its pinned reason stays true. The loop run is green, which confirms the reading.
3. **`registerConfirmAndSignIn` was not exported** from `_integration.ts`, but plan step 1's integration body uses it "from `_integration.ts`" while living in the c-file. I exported it (with a comment naming this leaf as the reason) â€” an implicit ripple the plan did not name.
4. Two blank lines inside my edited hunks in the a- and b-files lost their pre-existing trailing spaces (an artifact of the edit spanning them); no other adjacent code was touched.
5. Minor note: AT-001.20's single body opens a fixture world because the harness rejects a body that neither opens a world nor consumes a capture â€” the assertions themselves read nothing from the seam.

Everything I implemented follows the plan's decisions Aâ€“H as written, including the attestation stored as text (not a boolean), the exact-statement pin living only in the validation layer, and the `default null` parameters existing for call-signature tolerance only.

EXECUTOR: DONE
