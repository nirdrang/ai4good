# Fix 5: the comments

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

A comment audit named thirty-five findings. Seven comments were false about the
code beside them. Twenty-eight were meat. This unit corrects the false ones and
cuts the meat the audit named.

No behaviour changed. No acceptance id changed colour.
`tests/at/expected/req-002.json` was not edited. Every line I touched is a
comment or a docblock, except the unused `LEAF` constant named below.

Line numbers in the audit are stale. Four earlier fix units moved the code, and
one split the 1709-line source-arm file into five. I found each comment by its
text.

## The seven false comments

**F1. `_contract.ts` — all four or none.** The comment on
`OrganizationProfileFields` said the schema enforces all four profile fields or
none. The columns `mission`, `country`, `website`, and `logo` are independently
nullable. Each carries only `check (length(btrim(...)) > 0)`, which passes when
the column is null. There is no cross-column constraint. The same file already
said "Nulls mean the profile is incomplete" on `OrganizationProfileRow`.

The all-four rule lives in the definer `public.set_organization_profile`, which
refuses an empty value on each argument, and in the request type
`OrganizationProfileFields` / `ProfileRequest`, whose fields are `string` not
`string | null`. I corrected the comment to say that.

The code is right. This is not a defect.

**F2. `_pending.ts` — stamped with its own id and its manifest leaf.** That
sentence is true for the auth suite's `notLanded()`, which throws `AtPending`
with the id and a leaf label. This suite's helper is `awaiting()`. It throws
`CapabilityPending` with capability names only. No call site passes a leaf. I
rewrote the header to say what this suite does.

**F3. `_pending.ts` — the tail after the em dash is free.** That is true for
`kind: 'pending'`. Every red in `tests/at/expected/req-002.json` is
`capability-pending`. For that kind, `expected.ts` rebuilds the whole first
line and compares it for equality. I rewrote the header to say so.

**F4. `_pending.ts` — all twenty-seven ids of the acceptance document.** That
document names thirty-two ids. Four are retired, so twenty-eight are live.
Twenty-seven is the P0 count. The harness refuses a run when a P0 id has no
call site. AT-002.24 (P1, no verification badge on project cards) is live and
has no call site. I dropped the count and the claim that it is "all ids of the
document". The header now says every P0 id needs a call site.

**F5. `_source-absences.ts` — the same token in `verification.ts` is left
alone.** `BARE_VERIFIED_LABEL` matches `verified|Verified|VERIFIED`. The
exemption is `piece.value === 'verified'` away from a person-facing surface.
A `'Verified'` string in `verification.ts` is flagged. The inline comment on
the exemption already stated the real rule. I corrected the header to match
that rule.

**F6. `req002-oracles.selftest.ts` — each refusal the scan names.** The
original file is now a cross-family smoke over the real tree. That header no
longer makes the "each" claim. The claim moved into four family oracle files.
The pins family still does not cover `scanGrantPins` / `grantPinProblems`;
those refusals live in the allowance acceptance body. I dropped "each" from
the pins-family header and named the arms it does cover.

**F7. The C1 paragraph inside `set_organization_vetting`.** I could not find
it. An earlier unit moved the only `set_organization_vetting` body into
`20260914120000_org_vetting.sql`. That body records the instant with
`clock_timestamp()` after the organisation row lock and says why. It does not
copy the spend-day C1 paragraph. The remaining C1 paragraph sits in
`public.discovery_allowance`, where a spend is charged, and I kept it.

## The unused constant

The audit's item 1 named `LEAF` in `_pending.ts`. Nothing in the tree imports
it from this suite. I deleted the constant and its documentation together.

## Meat that I cut

The source-arm file was split. Comments that lived in `_source-scan.ts` now
live in the family files. I cut them there.

| Audit item | What I did |
| --- | --- |
| 1. `LEAF` documentation | Deleted with the constant. |
| 2. jsonb PDF / `file-desk.tsx` twice | The second copy is gone after the split. I kept the remaining copy in `_source-documents.ts`. It is a limit on what the oracle proves. |
| 3. Publish-flow WHAT THIS IS block | Shortened. Kept the cron-and-trigger paragraph and the visibility bound. |
| 4. Discovery-wallet WHAT THIS IS block | Shortened. Kept the wallet versus daily-grant split and why AT-002.10 stays red. |
| 5. Trust-wording WHAT THIS IS block | Shortened and corrected (F5). |
| 6. `_contract.ts` domain-object table of contents | Deleted. Each type still carries its own doc. |
| 7. Judgement-type list missing `VettingOutcomeNotice` | Added that name to the existing list. |
| 8. Dashed banners in `_contract.ts` | Deleted all of them. |
| 9. Dashed banners in the source-arm file | Could not find. The split removed them. |
| 10. "Throws when the function text cannot be read" | Dropped from four function docs in `_source-pins.ts`. The floor header still says each arm throws. |
| 11. `isDiscoveryWalletName` restates the signature | Deleted the comment. |
| 12. ID BINDING in `_bind.ts` | Deleted. This file has no `atTest` call site. |
| 13. "no type argument here" | Deleted. The two lines above it already say the types are bound. |
| 14–16. `e-gates.test.ts` scan narrations | Deleted. The expect messages and the source-arm docs already say it. |
| 17. Concierge onboarding paragraph | Kept the first two sentences. Dropped the rest. |
| 18. "The day travel is persistSpendOnPreviousUtcDay" | Deleted. The helper already says the body does not prove the crossing. |
| 19. Dangling "cannot publish" paragraph | Deleted. The file header and the declared reds already say it. |
| 20. Floating "unfunded project" comment | Deleted. |
| 21–22. `shipped-org-vetting.selftest.ts` header | Kept why the selftest lane exists. Dropped the phrase-for-phrase copy of the module docs and the WHAT A GREEN blocks. |
| 23. "An oracle that cannot fail is not an oracle" | Deleted from the four family oracle files. |
| 24. `fundingAllowed` docblock | Kept `NO CHECKOUT CONSULTS IT YET. AT-002.31 stays red for exactly that reason.` Dropped the other two paragraphs. |
| 25. "The mark update joins the existing vetting transaction" | Could not find. |
| 26. High-water-mark pseudocode above `apply_discovery_grant_mark` | Deleted. The two statements below it are the code. |
| 27. `highWaterGrant` restates the signature | Kept "High-water mark for the day's row." Dropped the rest. |
| 28. "Publishing and funding are not this route" | Deleted. The sentence before it already says the route creates no conversation, no agent response, and no funded turn. |

## What I kept

I did not touch comments the audit listed as earning their place:

- PostgreSQL refuses a new enum value in the transaction that writes it.
- An attestation cannot prove a mailbox deletion.
- A value or a sentence that exists in both TypeScript and SQL.
- The C1 locking rule in `public.discovery_allowance`.
- The higher-of-two-tiers grant mark and the founder ruling of 2026-09-09.
- Why `publishingAllowed` lives in the product, and why AT-002.19 and
  AT-002.20 stay red.
- The fixture comments the audit checked true.

I also kept the inline exemption on the lower-case `'verified'` token. That is
the real rule F5 named.

## Defects rather than comment problems

None. For each false comment, the code was right and the comment was wrong.

## Least sure

Whether `fundingAllowed` should keep only the AT-002.31 sentence. The audit
named that sentence as the one that earns its place. The function name and
the ignored `_vetted` argument still say the rule.

## Checks

The findings above were written before these checks ran.

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`,
   `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:selftest` — `Test Files 26 passed (26)`, `Tests 394 passed (394)`, exit 0.
4. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 20 green, 7 red, 0 missing`,
   matches the declaration, exit 0.
5. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`,
   matches the declaration, exit 0.
6. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`,
   matches the declaration, exit 0.
7. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 19 green, 8 red, 0 missing`,
   matches the declaration, exit 0.
8. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`,
   matches the declaration, exit 0.
9. `bun run at:verify req-016 --tier integration --expect` — `12 P0: 12 green, 0 red, 0 missing`,
   matches the declaration, exit 0.

The selftest count did not fall. No acceptance id changed colour. The local stack
was not stopped.

## What the lead changed in review, 2026-09-11

One sentence restored. The lane cut the whole docblock on `fundingAllowed` down to the line about no
checkout consulting it, and with it went the explanation of why the function takes a tier argument
and ignores it. A reader meeting an unused parameter will ask, and the answer is not in the code. The
lead put one sentence back. The lane had named that same cut as its least-sure call.
