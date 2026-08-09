# AI4DEV-58 (GitHub sign-in, mandatory GitHub link) — GATE 2 RULINGS

**Sitting 3 of the item: FIX AND GOAL. Ruled by the `orchestrator` definition on fable
(claude-fable-5, effort xhigh).**

Gate 2 ran as two slices, one reader each (gpt-5.6-terra; the second pinned reader is stopped by
founder ruling 2026-08-08 and was not substituted). Slice A (SQL and config):
`loop/items/AI4DEV-58/artifacts/gate2-sql-terra-distilled.md`, 5 findings. Slice B (TypeScript and
tests): `loop/items/AI4DEV-58/artifacts/gate2-ts-terra-distilled.md`, 3 findings. Raw outputs
beside them, both read in full before ruling.

**Eight findings, seven rulings: slice A finding 4 and slice B finding 1 are the same defect** —
the RPC signature replacement with no compatibility bridge — described once from the migration
and once from the caller. They are ruled together as R4. Slice B finding 2 restates slice A
finding 1's array-emptiness gap at the function-body line; it is ruled inside R1 and
cross-referenced as R6.

Every ruling quotes the reviewer's claim verbatim, then disposes of it: accept / reject /
accept-fixed-differently / verify-first, per the orchestrator contract.

---

## R1 — slice A [1], high; jointly with slice B [2] (see R6) — ACCEPT

> "The "populated" checks accept semantically empty data: `ARRAY[NULL]`/`ARRAY['']` count as
> languages, and a tab-only summary survives `btrim`."

**Accepted, and the facts check out against PostgreSQL's documented semantics:**
`cardinality(ARRAY[NULL])` is 1, so the slot-count passes with no language in it; `btrim`'s
default character set is the space character ONLY, so a tab-only summary or handle survives
trimming and compares unequal to `''`. The migration's own comment (lines 33–36) claims the empty
forms "cannot be stored at all, by any caller, through any path" — that claim is presently false
for exactly these inputs, and the record must be true.

**The fix, in the migration edited in place** (it has shipped nowhere; the local stack replays
from empty):

- **Scalar columns** (`github_handle`, `contribution_summary`): the CHECK expressions become
  whitespace-aware — `col !~ '^\s*$'` (refuses empty and whitespace-only alike; `\s` is the
  Postgres ARE class shorthand). Constraint names unchanged.
- **`top_languages`**: a CHECK expression cannot contain a subquery, so the migration gains one
  small IMMUTABLE SQL helper (e.g. `public.text_array_entries_all_populated(text[])`):
  `cardinality >= 1` AND no element `IS NULL` (via `array_position(entries, null) is null` or
  `not exists` over `unnest`) AND no element `~ '^\s*$'`. The constraint calls the helper. The
  helper references only `pg_catalog` names, so it is safe under `search_path = ''`; its EXECUTE
  is revoked from PUBLIC to match the item's posture (the table owner needs no grant).
- **The function body's mirrored checks** (the volunteer branch, migration lines 161–216) get the
  same strengthening, so a direct caller still receives a stated reason rather than a bare
  constraint name: handle and summary blank-tests become whitespace-aware, and the languages
  check refuses NULL elements and blank elements, not just the empty array. The `btrim` calls
  that normalise stored values use an explicit whitespace set.
- **Empirical probes, folded into plan step 6(d)**: as operator (psql), direct INSERTs of
  `ARRAY[NULL]::text[]`, `ARRAY['']`, `ARRAY['  ']`, a tab-only summary and a tab-only handle
  each refused by the named constraint; and through the function with a valid linked identity, a
  tab-only summary refused with the stated reason. The existing `'{}'::text[]` probe (gate-1
  ruling F2) stays.

The `repository_count >= 0` constraint is untouched — zero is legitimate for a real import and
the asymmetry with the stub is documented and deliberate.

## R2 — slice A [2], medium — REJECT (risk accepted and recorded)

> "A service-role caller that passes the identity check can forge arbitrary nonempty profile
> statistics instead of the declared `stubGithubStatsFor` output."

**True as a capability, rejected as a defect.** The database can enforce the SHAPE of the import
(non-empty, R1) and the IDENTITY binding (the gate-1 F4 check), but it cannot enforce the
PROVENANCE of statistics computed in the edge function — the only way it could would be to mirror
`stubGithubStatsFor`'s arithmetic in SQL, which is the second-copy-of-the-rule defect this
item's whole design forbids, and which becomes impossible anyway the day the real import (W3)
replaces the stub: real statistics are not recomputable by the database either. A caller holding
the service-role key IS the deployment's own authority; the threat model this item defends
against a direct service-role caller is the volunteer gate (identity link + handle binding),
which holds.

The migration already states the honest contract in its own words (lines 21–25: "This migration
stores whatever the caller imported and refuses the empty forms; it does not fetch anything").
What was missing is the same sentence in the plan's green-claims table — **plan section 4 gains
it, and the merge ruling's "what the green does not claim" list will carry it**: the database
does not authenticate the provenance of imported statistics; any service-role caller can commit
any shape-valid statistics for a correctly linked handle. No code changes.

## R3 — slice A [3], high — ACCEPT

> "The new acceptance tests inject `authUser.githubHandle` directly into
> `validateCompleteSignup` and never execute `extractGithubHandle`."

**Accepted.** The fixture's header claims the loop green proves "the decisions in
`accounts.ts` and `github.ts`" — but `extractGithubHandle` is one of those decisions and no test
executes it, so a regression in it (returning null for a linked identity) would reject every
linked volunteer at the deployed edge while the suite stayed green. The claim as written is
wider than the evidence.

**The fix strengthens the fixture's own philosophy rather than bending it:** the fixture stops
pre-narrowing the caller fact. `completeSignup` in `_fixture.ts` constructs the canonical
GoTrue `/auth/v1/user` shape from its stored state —
`{ identities: [{ provider: 'github', identity_data: { user_name: <stored handle> } }] }` (empty
list when no identity is linked) — and derives the caller fact through the shipped
`extractGithubHandle`, exactly as `resolveCaller` does. Storage stays storage; the judgement
about which identity counts moves onto the tested path. A regression in the extractor now fails
AT-001.02/.04/.05 at loop tier. The REAL response shape (as GoTrue actually serialises it) is
additionally exercised by step 6(b), where the deployed edge function parses a live
`/auth/v1/user` answer over the fabricated identity row — the two evidences compose: loop tier
proves the extractor's logic, the live proof proves it against GoTrue's real serialisation.
Test bodies do not change.

## R4 — slice A [4], high, verify-first; AND slice B [1], high — ONE DEFECT, ACCEPT FIXED DIFFERENTLY

> Slice A: "Dropping the five-argument RPC and replacing it with a nine-argument RPC has no
> compatibility bridge, while updating the edge function in the same source change does not make
> cross-plane deployment atomic."
> Slice B: "The five-argument RPC is removed before a nine-argument-only replacement, with no
> backward-compatible release path."

**The defect is real and it is one defect.** Plan risk 2 said the drop "cannot" break deployed
callers because the only caller is updated in the same change — source co-location is not
deployment atomicity, and the reviewer is right that in any environment where the database plane
and the function plane roll separately, either ordering breaks completion for the window.

**Fixed differently than the proposed remedy.** The reviewer's verify-first asks to "demonstrate
an atomic schema-plus-function deployment, or stage both deployment orders". Staging both orders
is rejected as the remedy: no hosted deployment of this system exists — the only environment is
the local stack, where `db reset` and function serving deploy both planes together — so a staged
rollout would demonstrate a scenario no current environment can produce, against infrastructure
this item would have to invent. What is adopted instead is a REAL bridge, cheaper and stronger:

1. **The four new parameters get `default null`** in the recreated function. A call carrying only
   the original five named arguments then resolves (PostgREST fills defaults on named-argument
   calls; there is still exactly one function, so no overload ambiguity — the migration's
   drop-first reasoning stands). An old-edge NGO completion works against the new schema; an
   old-edge volunteer completion fails CLOSED with the stated GitHub-link reason (the old edge
   cannot supply the handle — and the old schema could not have stored the profile either).
2. **The new edge function omits the four github keys from the rpc body when the judged handle is
   null** (i.e. for NGO completions — an unlinked volunteer never reaches the rpc). An NGO
   completion therefore sends the original five keys and works against EITHER schema version, so
   both rollout orders leave NGO signup unaffected end to end.
3. **The honest residual, stated in the migration comment and plan risk 2, which are rewritten:**
   during a mixed-plane window, volunteer completion is unavailable — fail-closed with a stated
   reason under migration-first, a resolution error under function-first. Volunteer completion
   requires both planes at the new version; that is inherent to a feature spanning both planes,
   not a defect a bridge can remove.
4. **The verify-first obligation is satisfied empirically where it can be:** step 6 gains a probe
   calling the migrated function through PostgREST with ONLY the five original named arguments
   for an NGO completion, which must succeed — the old-caller shape proven against the new
   schema on the live stack. That is the half of the staging matrix that is real today; the
   other half (old schema, new caller) has no deployable artifact to stage.

## R5 — slice A [5], low, verify-first — ACCEPT (verified against the committed capture; fix is a revoke plus a true comment)

> "The claimed no-table-grants/sole-write-path posture is contradicted by the committed replay
> capture, which records `TRUNCATE`, `TRIGGER`, and `REFERENCES` privileges for `service_role`,
> with no revoke here."

**Accepted — and the verify-first half is already verified:** the committed
`migration-replay.txt` (lines 81–96) records `REFERENCES`, `TRIGGER` and `TRUNCATE` for `anon`,
`authenticated` AND `service_role` on `volunteer_profiles`. Supabase's default privileges grant
on new tables in `public`; the migration's comment "NO GRANT ON `public.volunteer_profiles` TO
ANY ROLE" mistook the absence of a grant statement for the absence of privileges. The practical
exploitability is near zero — none of the three privileges is reachable through PostgREST's verb
surface, `service_role` is not a login role, and `auto_expose_new_tables` is unset — but the
migration makes a posture CLAIM the catalog contradicts, and TRUNCATE is not subject to
row-level security, so the standing privilege is real even if unreachable today.

**The fix:** the migration gains
`revoke all on table public.volunteer_profiles from anon, authenticated, service_role;`, the
comment is rewritten to state the measured default-privilege reality (the same
measure-don't-reason posture the first migration took for function EXECUTE), and the replay
capture is re-run: the privilege query must return ZERO rows for those three roles. The
`postgres` owner rows remain — the owner's privileges are not grants.

**Scope note:** the same query, extended to all five tables for free in the re-capture, will say
whether the predecessor's four tables carry the same residue. If they do, that is pre-existing
on main — it is NOT fixed on this branch; it goes in my completion report for the coordinator to
file as its own item.

## R6 — slice B [2], medium — ACCEPTED WITHIN R1

> "The `top_languages` checks accept arrays containing only `NULL` or blank elements."

The same gap as R1, located at the function-body line (200) rather than the constraint line
(57). R1's fix covers both locations explicitly — the constraint via the helper, the body check
in the volunteer branch — and the probes exercise both (constraint via direct INSERT as
operator, body via the function call with a linked identity). No separate disposition.

## R7 — slice B [3], medium — ACCEPT

> "The fixture presents AI4DEV-57's live proof as evidence for the current edge, migration, and
> configuration boundaries."

**Accepted.** The fixture header (lines 20–25) and `edge.ts` (line 15) cite the predecessor
item's `proof-local.txt` as THE evidence for the not-proved-at-loop-tier half — but that
transcript predates this migration, called the five-argument RPC, and knows nothing of the
GitHub gate, the profile import, or the GitHub configuration. As of this draft the citation
narrows the unverified boundary falsely.

**The fix, applied after step 6 produces the new transcript:** both comments cite THIS item's
`loop/items/AI4DEV-58/proof-local.txt` as the live evidence for the current tree, with its real
check counts, keeping the Google-handshake caveat and adding the GitHub-handshake caveat (no
OAuth app exists; the handshake is proved by nothing). One sentence retains the predecessor's
transcript for exactly what only it still covers — `create-organization` was exercised there and
is untouched here — while stating that its completion-path and schema evidence is superseded by
this item's transcript at this item's head.

---

## What the executor does with this file

Order: R1+R6 and R4 and R5 edit the migration in place (one file, one coherent edit), R4 also
edits `complete-signup/index.ts`, R3 edits `_fixture.ts`; then `db reset` + re-capture
`migration-replay.txt` (extended: helper function row, new constraint definitions, the five-table
privilege matrix); then the goal phase — plan steps 6 (with the extended probe list) and 7. R7's
comment edits land after step 6 writes the transcript they cite. R2 requires no code — its plan
sentence is amended by the orchestrator alongside these rulings.
