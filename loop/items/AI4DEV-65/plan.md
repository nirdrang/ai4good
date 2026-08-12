# Plan — AI4DEV-65 (who signed: name, title, authority)

Item: AI4DEV-65 (who signed fields), leaf D4.L1 of `loop/decomp/req-001.md` (manifest revision
`0579425`). Chain: AI4PM-19 (auth and org membership) > AI4DEV-50 (auth root) > AI4DEV-54
(acknowledgment identity capture) > AI4DEV-65 (who signed fields).

Requirement (board item, verbatim): "Every acknowledgment captures the person's name, title and
an attestation of authority. Omitting any field rejects the acknowledgment. The copy prohibits
shared credentials and recommends an organisation email address." Verifies AT-001.19, AT-001.20,
AT-001.39. Ratified AT text: `.taskmaster/docs/acceptance/at-req-001.md` lines 39–41. Ratified
requirement guard: `.taskmaster/docs/requirements/req-001.md` line 8.

## The one fact the whole plan rests on

The tree has exactly ONE acknowledgment moment: signup completion. Both session kinds
(email/Google and GitHub-established) reach the same deployed function
(`supabase/functions/complete-signup/index.ts`) and the same database function
`public.complete_signup` (recreated with GitHub parameters by
`supabase/migrations/20260809090000_volunteer_github_link_and_imported_profile.sql`, which
dropped the old signature at its line 172). "Every acknowledgment" therefore means: the three
identity fields ride the completion request and land on `public.acknowledgments`.

## Decisions

- **A — where the fields live.** Three new columns on `public.acknowledgments`: `signer_name`,
  `signer_title`, `authority_attestation`, each `text not null check (col !~ '^\s*$')` — the
  POSIX-whitespace-class shape the GitHub migration documents and uses (migration
  `20260809090000_...` lines 41–43 and 94–96), because one-argument `btrim` strips the space
  character only and would pass a tab-only value (gate 1 finding 7). `text_version`'s older
  `btrim` shape has that gap; it is pre-existing code and stays untouched. TypeScript names:
  `signerName`, `signerTitle`, `authorityAttestation`.
- **B — where omission rejects.** In `validateCompleteSignup`
  (`supabase/functions/_shared/accounts.ts`), the module both the deployed function and the
  loop-tier fixture drive. FOUR checks go AFTER the existing acknowledgment-text-version
  check, in the order name → title → attestation-present → attestation-matches, one refusal per
  condition, each refusal naming its field. The fourth (gate 1 finding 3): the trimmed
  attestation must equal `ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement` exactly; the refusal
  says the statement does not match the shipped authority statement. Order matters: every
  already-green test that pins a refusal reason keeps firing its own check first — AT-001.07's `platform_admin` refusal at `parseAccountType`, AT-001.04's
  GitHub-link refusal, AT-001.01's missing-acknowledgment refusal (`/acknowledgment/i`) at the
  text-version check. Requests in those tests that omit the signer fields never reach the new
  checks.
- **C — the attestation is text, not a boolean.** The record stores the statement the person
  affirmed, verbatim and trimmed, exactly as `text_version` stores which text was accepted. A
  `true` in a column captures that something was clicked; the statement captures WHAT was
  attested. The shipped statement lives in the copy module (decision D) and the tests submit it.
  The server refuses an attestation that is not the shipped statement (decision B, fourth
  check) — today exactly one statement is valid, and the column records which one was affirmed
  so that future statement versions stay distinguishable. That pin lives in the validation
  layer only, by design: the database floors presence and nonblank, never content (gate 2
  finding 1, ruled accept-fixed-differently in `gate2-rulings.md` — a SQL copy of the shipped
  literal is a second source of truth whose drift would refuse every legitimate completion).
- **D — the copy is a shipped constant module.** New file
  `supabase/functions/_shared/acknowledgment-copy.ts`:

  ```ts
  export const ACKNOWLEDGMENT_IDENTITY_COPY = {
    authorityStatement:
      'I attest that I have the authority to make this acknowledgment for my organisation — ' +
      'to bind it, to fund non-refundable model-fuel purchases, and to accept services that ' +
      'carry no SLA.',
    sharedCredentialsProhibition:
      'Shared credentials are prohibited. Every acknowledgment is made by one named person ' +
      'under their own sign-in.',
    orgEmailRecommendation:
      'An organisation email address is recommended for the account that makes acknowledgments.',
  } as const;
  ```

  AT-001.20 grades this constant BY DIRECT IMPORT, the same way the suite already imports
  `stubGithubStatsFor` from a shipped module (`a-signup-and-signin.test.ts` line 46). No new
  SUT-contract method: no deployed surface reports copy (the live adapter's own header, point 3,
  refuses the read-the-module-back pattern for `publicSignupAccountTypes`). The module is NOT
  test-only: `validateCompleteSignup` imports it for the attestation-match check (decision B),
  so the copy is in the deployed function graph and `authorityStatement` has behavioral force
  at runtime (gate 1 finding 2, first half). The prohibition and recommendation strings have no
  behavioural form at any tier — their content IS the article. The screen that will display
  them is later UI work; the green claims content, never display (see "what the green claims").
- **E — the database function changes by drop-and-recreate.** New migration, timestamp after
  the latest existing file: adds the three columns, then drops `public.complete_signup` by its
  exact current signature and recreates it with three appended parameters `p_signer_name text
  default null`, `p_signer_title text default null`, `p_authority_attestation text default
  null`, inserted into the acknowledgment row. The defaults are NOT a rolling-deploy bridge
  (gate 1 finding 1: that pattern needs nullable columns, and these are `not null`) — they
  exist for call-signature tolerance only. A caller that omits the new arguments fails at the
  column constraints, the whole transaction aborts, and no partial signup exists; that refusal
  is the requirement's own demanded behavior for omission. No mixed-plane window exists in any
  environment: slots re-migrate from scratch and the functions deploy from the same tree. The
  revoke/grant tail is re-stated after the recreate, exactly as migration `20260809090000`
  does, because a drop loses grants, and the file ends with `notify pgrst, 'reload schema';`
  as both existing migrations do — after a drop the stale cache entry names a signature that no
  longer exists (gate 1 finding 5).
- **F — what integration proves, and what it cannot.** Integration runs on the item's reserved
  database slot 1 and proves the email/Google completion path end to end: deployed function →
  database function → row. A GitHub-established session is not obtainable at integration tier
  (AT-001.02/.04/.05 are `capability-pending` there today), so AT-001.19's GitHub-path clause is
  proved at loop tier only, where the fixture drives the same shared validation. This narrowing
  is stated here, in the test body, and in the merge ruling.
- **G — one slice.** Three ids, one deliverable, one coherent diff across one migration, one
  shared module, one edge function, two adapters and one test file. The code gate runs once.
- **H — not in scope.** No UI. No new edge function. No change to
  `public.has_platform_acknowledgment`, to `create-organization`, or to any D3/D5/D6 id. No
  backfill story for existing rows: no production database exists, integration slots are reset
  and re-migrated from scratch, and on any stray non-empty dev database the `not null` addition
  fails loudly rather than fabricating a signer identity for rows that never had one.

## Steps

Test bodies first — the acceptance ids predate the item, and the pending machinery
(`tests/at/suites/req-001/_pending.ts`) means an id cannot go green without an executable body.

1. **AT-001.19 body** in `tests/at/suites/req-001/c-membership-and-acknowledgment.test.ts`,
   replacing its `notLanded(LEAF.D4_L1)` stub. `{ default, integration }` pair:
   - default (loop): one NGO completion and one GitHub-linked volunteer completion, both
     submitting `signerName`, `signerTitle`, and the shipped `authorityStatement` as
     `authorityAttestation`; read `sut.acknowledgments(...)` back and assert all three values
     VERBATIM on each row (empty-string rows record nothing while looking like a record — same
     discipline as AT-001.01's field-by-field assertions).
   - integration: NGO email path only, via `registerConfirmAndSignIn` from `_integration.ts`;
     same three verbatim assertions on the real row. A comment states the GitHub-path narrowing
     (decision F).
   - Done when: the body compiles, registers through `atTest`, and its assertions are the ones
     above — no weaker oracle.
2. **AT-001.39 body**, same file, `{ default, integration }` pair:
   - default (loop): seven refusal variants — each of the three fields omitted, each blank
     (`'   '`), and a wrong-content attestation (`'I am not authorized'` — gate 1 finding 3's
     counterexample) — every one refused with a reason naming the field, and after EVERY
     refusal: no account row (`sut.account` null), no acknowledgment rows,
     `hasPlatformAcknowledgment` false, `organizationsNamed(<the NGO name submitted>)` empty,
     and `membershipsOf` empty (gate 1 finding 6). A control completion with all three fields
     then succeeds, so the refusals are attributable to the missing field and nothing else.
   - integration: the three omission variants against the deployed function, same
     no-partial-state assertions — organizations and memberships included — over the slot
     database.
   - Done when: compiles, registered, asserts refusal reason AND absence of every write the
     completion could have made.
3. **AT-001.20 body**, same file, one body for both tiers: import
   `ACKNOWLEDGMENT_IDENTITY_COPY`; assert `sharedCredentialsProhibition` matches
   `/shared credential/i` AND `/prohibit/i`; assert `orgEmailRecommendation` matches
   `/organi[sz]ation email/i` AND `/recommend/i`; assert `authorityStatement` is non-blank
   (it is the statement step 1 submits). Done when: compiles, registered, asserts meaning
   rather than mere existence.
4. **Copy module** — `supabase/functions/_shared/acknowledgment-copy.ts` exactly as decision D.
   Done when: exported constant text is the decision's text.
5. **Shared decision module** — `supabase/functions/_shared/accounts.ts`:
   `CompleteSignupRequest` gains `signerName?`, `signerTitle?`, `authorityAttestation?` (all
   `unknown`); `ValidCompleteSignup` gains the three as `string`; `validateCompleteSignup`
   checks them per decision B — three presence-and-blank checks, then the attestation-match
   check against the imported `ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement` — and returns
   them trimmed. Done when: typecheck passes and the refusal strings each name their field.
6. **Migration** per decision E. Done when: columns + `!~ '^\s*$'` checks + drop/recreate +
   insert + grants + `notify pgrst, 'reload schema';` tail are all in one new file whose
   timestamp sorts after every existing migration.
7. **Edge function** — `complete-signup/index.ts`: pass the three body fields into
   `validateCompleteSignup`; pass the judged values as `p_signer_name`, `p_signer_title`,
   `p_authority_attestation` in the `complete_signup` call. Done when: the judged value — never
   the raw body value — reaches the call, matching how `githubHandle` travels.
8. **Fixture adapter** — `tests/at/suites/req-001/_fixture.ts`: `StoredAcknowledgment` gains
   the three fields; the push inside `completeSignup` writes them from `decision.value`;
   `acknowledgments()` returns them. Done when: loop-tier rows carry the submitted values.
9. **Live adapter** — `tests/at/suites/req-001/_live.ts`: `acknowledgments()` selects and maps
   the three new columns. `completeSignup` already forwards the request body verbatim — verify,
   do not edit. Done when: integration rows carry the submitted values.
10. **Contract** — `tests/at/suites/req-001/_contract.ts`: `AcknowledgmentRow` gains the three
    fields; the "deliberately absent" comment (lines 65–73) is replaced by one sentence naming
    this leaf as the one that landed them. Done when: typecheck passes suite-wide.
11. **Ripple: every existing completion request literal** gains the three fields (name, title,
    shipped attestation statement) — `a-signup-and-signin.test.ts` (requests in AT-001.01–.07,
    including AT-001.03's shared `request` object, which must stay byte-identical between its
    two calls), `b-verification-and-sessions.test.ts`, and `_integration.ts` (all completions,
    including `registerConfirmAndSignIn`-driven ones). Requests whose refusal is under test for
    an EARLIER check (AT-001.01's no-acknowledgment request, AT-001.04's unlinked-volunteer
    requests, AT-001.07's platform_admin request) may omit them — decision B's ordering keeps
    their pinned reasons true — but where a completion must SUCCEED, the fields are present.
    Done when: typecheck passes and the loop tier is green.
12. **Declarations and ledger** — `tests/at/expected/req-001.json`: AT-001.19, .39, .20 move
    from the red map to the green list in BOTH tiers, nothing else changes;
    `_pending.ts`: `D4_L1` leaves the `LEAF` map (the file's own rule: a label with nothing
    pointing at it claims pending work that is not), header count 24 → 21;
    `loop/items/AI4DEV-65/pending-ledger.txt` written in the format of
    `loop/items/AI4DEV-60/pending-ledger.txt`. Done when: `bun run at:check` reports no
    bijection problem.

Draft pass = steps 1–12, typecheck and build passing, the verify suite deliberately not run.

## Verification (the goal state, fix-and-goal sitting)

Commands, in order, all exit 0:

| command | proves |
|---|---|
| `bun run at:check req-001` and `bun run at:check req-016` | every expected id has exactly one call site (the command takes one requirement per run) |
| `bun run typecheck` | the suite and src typecheck |
| `bun run at:verify req-001 --tier loop --expect` | loop exact-match below |
| `bun run at:verify req-016 --tier loop --expect` | the other manifest is untouched |
| `AT_DB_SLOT=1` + `bun run at:verify req-001 --tier integration --expect` | integration exact-match below, on slot 1, serially |
| `AT_DB_SLOT=1` + `bun run at:verify req-016 --tier integration --expect` | the other manifest is untouched at integration |

Expected verification state per acceptance id (the exact-match contract):

| id | loop | integration |
|---|---|---|
| AT-001.19 | green | green — email/Google path; the GitHub-session path is loop-proved only (decision F) |
| AT-001.39 | green | green |
| AT-001.20 | green | green — content of the shipped copy; display is not claimed |
| every other req-001 id | unchanged | unchanged |
| every req-016 id | unchanged | unchanged |

## What the green claims, and what it does not

- It claims: every acknowledgment written through the one existing acknowledgment moment
  records name, title and the affirmed authority statement; any omission or blank — and any
  attestation that is not the shipped authority statement — refuses with the field named and
  writes nothing at all, no account, no organization, no membership, no acknowledgment; the
  shipped copy states the shared-credentials prohibition and the organisation-email
  recommendation, and the deployed validation enforces its authority statement at runtime.
- It does NOT claim: that any screen displays the copy (no screen exists; UI wiring is other
  items' work); that a GitHub-established session was driven at integration tier (capability-
  gated, as for every GitHub id); that future acknowledgment moments (funding, REQ-006's) carry
  the fields — they will reuse `public.acknowledgments`, whose constraints now force the fields,
  and that constraint is the hook they inherit, not a claim proved here; and that the DATABASE
  pins the attestation's content — the columns floor presence and nonblank, the exact-statement
  pin and the trim live in the deployed validation layer, and a caller holding the service key
  can store a different nonblank statement, which the row then shows verbatim (gate 2 finding 1,
  accepted residual; the drift-hazard reasoning is in `gate2-rulings.md`).

## Evidence pointers (never pasted)

- Table + predicate: `supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql` lines 65–110
- Current function signature + drop precedent + grants tail: `supabase/migrations/20260809090000_volunteer_github_link_and_imported_profile.sql` lines 138–200 and its final grant block
- Validation order: `supabase/functions/_shared/accounts.ts` lines 179–230
- Rolling-deploy argument pattern: `supabase/functions/complete-signup/index.ts` lines 89–117
- Fixture write path: `tests/at/suites/req-001/_fixture.ts` lines 628–720, 1005
- Live read-back: `tests/at/suites/req-001/_live.ts` lines 502–569
- Contract's deliberate-absence note this item retires: `tests/at/suites/req-001/_contract.ts` lines 65–73
- Pending machinery and leaf map: `tests/at/suites/req-001/_pending.ts`
- Assertion discipline to mirror: `tests/at/suites/req-001/a-signup-and-signin.test.ts` (AT-001.01, AT-001.04's no-partial-state blocks)
