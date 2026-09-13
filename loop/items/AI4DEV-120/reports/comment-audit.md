# Comment audit — AI4DEV-120 (intake form and draft autosave)

Yes... Ha ha ha... Yes!

Scope: every file under `supabase/` and `tests/` that differs between `main` and `HEAD`, in the
worktree for branch `nirdrang/ai4dev-120-intake-form-and-draft-autosave-d1`. Only comments this
branch added are in scope; a comment already on `main` on an unchanged line is out of scope.
`loop/` and `.claude/` were not opened.

## Files touched (deletions applied)

- `supabase/functions/_shared/discovery-allowance.ts`
- `supabase/functions/_shared/memberships.ts`
- `supabase/functions/_shared/org-vetting.ts`
- `supabase/functions/_shared/public-project.ts`
- `supabase/functions/_shared/write-routes.ts`
- `supabase/functions/discovery-allowance/index.ts`
- `supabase/functions/set-organization-profile/index.ts`
- `supabase/migrations/20260914120000_org_vetting.sql`
- `supabase/migrations/20260915120000_organization_profile.sql`
- `supabase/migrations/20260916120000_discovery_allowance.sql`
- `tests/at/harness/req002-absences-oracles.selftest.ts`
- `tests/at/harness/req002-documents-oracles.selftest.ts`
- `tests/at/harness/req002-oracles.selftest.ts`
- `tests/at/harness/req002-pins-oracles.selftest.ts`
- `tests/at/harness/req002-vetting-oracles.selftest.ts`
- `tests/at/harness/shipped-discovery-allowance.selftest.ts`
- `tests/at/harness/shipped-memberships.selftest.ts`
- `tests/at/harness/shipped-org-vetting.selftest.ts`
- `tests/at/suites/req-001/_contract.ts`
- `tests/at/suites/req-002/_bind.ts`
- `tests/at/suites/req-002/_contract.ts`
- `tests/at/suites/req-002/_fixture.ts`
- `tests/at/suites/req-002/_live.ts`
- `tests/at/suites/req-002/_pending.ts`
- `tests/at/suites/req-002/_source-absences.ts`
- `tests/at/suites/req-002/_source-documents.ts`
- `tests/at/suites/req-002/_source-pins.ts`
- `tests/at/suites/req-002/_source-scan.ts`
- `tests/at/suites/req-002/_source-vetting.ts`
- `tests/at/suites/req-002/a-org-profile.test.ts`
- `tests/at/suites/req-002/b-allowance.test.ts`
- `tests/at/suites/req-002/c-vetting-action.test.ts`
- `tests/at/suites/req-002/d-evidence-rule.test.ts`
- `tests/at/suites/req-002/e-gates.test.ts`
- `tests/at/suites/req-002/f-public-claims.test.ts`
- `tests/at/suites/req-003/_live.ts`

## Deletion count

99 comments (single-line and block) deleted, across 35 files.

## MUST KILL flags (5)

1. `20260914120000_org_vetting.sql` line ~199 area (function `set_organization_vetting`, the
   `v_note := btrim(...)` statement) and `20260915120000_organization_profile.sql` (the
   `v_name := btrim(...)` statement in `set_organization_profile`) — the NBSP trim-character set
   (`E' \t\r\n\f' || chr(160)`) is a magic literal repeated at both call sites. MUST KILL: extract
   a named constant (e.g. a shared `TRIM_CHARS` SQL expression or a check-constraint helper) so the
   NBSP inclusion is visible without prose.
2. `20260914120000_org_vetting.sql`, `set_organization_vetting`, the `v_recorded_at :=
   clock_timestamp()` statement — MUST KILL: rename the captured variable (e.g.
   `v_occurred_at_after_lock`) so the "taken after the row lock, not now()" ordering requirement is
   legible from the name.
3. `20260914120000_org_vetting.sql`, `set_organization_vetting`, the `v_authorized := '["email",
   "inapp"]'::jsonb` statement — MUST KILL: name the constant/constraint so it states its
   relationship to `notification-taxonomy.ts`'s `DEFAULT_BY_CLASS.decision` directly, instead of a
   comment cross-reference.
4. `20260914120000_org_vetting.sql`, `set_organization_vetting`, the `perform
   public.apply_discovery_grant_mark(p_organization_id, v_utc_day, v_previous_vetted or
   v_current.vetted)` call — MUST KILL: name the boolean expression (e.g. a `v_mark_no_regression`
   local) so the no-downgrade "takes the HIGHER of the two tiers" rule is obvious without prose.
5. `20260916120000_discovery_allowance.sql`, `discovery_allowance`: the `perform 1 from
   public.organizations ... for share` statement (share-lock choice) and the `v_utc_day :=
   (clock_timestamp() at time zone 'utc')::date` statement (UTC-day-after-lock) — MUST KILL:
   extract the lock acquisition into a named helper (e.g. `lock_organization_share()`) and rename
   the day variable (e.g. `v_utc_day_after_lock`) so both choices are self-evident from the code.

## Skips

- Postgres same-transaction enum-value restriction:
  `supabase/migrations/20260914110000_audit_event_kind_org_vetting.sql` lines 1-3 — kept. This
  names a real PostgreSQL constraint (a new enum value cannot be used in the same transaction that
  adds it) that this tree cannot reshape.
- GoTrue's refusal to issue a session to an unconfirmed address:
  `tests/at/suites/req-002/_live.ts` lines 221-223 — kept. Genuine external-vendor (Supabase
  Auth/GoTrue) forced behaviour.
- Postgres `int4` overflow on debit arithmetic: `20260916120000_discovery_allowance.sql` lines
  168-169 and `tests/at/suites/req-002/b-allowance.test.ts` lines 372-373 — kept. Genuine 32-bit
  integer width constraint forced on us; not our own code's surprise.
- Every file in the branch's `supabase`/`tests` diff with no added comment (config, edge, copy,
  need-intake modules, most migrations after 20260917, expected JSON fixtures, harness config,
  suite adapters, and most of req-001 and req-003 suites) — no action needed.
- `// prettier-ignore`, `eslint-disable`, `@ts-ignore`/`@ts-expect-error`, and license headers —
  none found among the branch's additions.

## Typecheck

`bun run typecheck` — exit code 0 (all three projects clean: app, acceptance tests, verify drive).

## The lead's ruling on this audit (2026-09-13)

The agent diffed against the local `main`, which is stale: origin `main` is at `afb2c85`, the
vetting run's squash, and this branch was cut from it. Thirty-five of the thirty-six files above
belong to that merged run, not to this branch, and the five MUST KILL flags all name merged
migrations, which this tree never edits in place. The lead reverted every deletion outside the
branch's own diff. What stands from this audit: one narration comment deleted in
`tests/at/suites/req-003/_live.ts` (`provisionNgo`). The branch's own diff against origin `main`
(35 files under `supabase/` and `tests/`) carries no other added comment; the agent's own skip
list says so ("need-intake modules, most migrations after 20260917 ... most of req-001 and
req-003 suites: no added comment"). Zero MUST KILL flags stand.
