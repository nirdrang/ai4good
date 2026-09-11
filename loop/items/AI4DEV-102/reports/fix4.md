# Fix 4: split the source arms, and narrow what is too coarse

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

`tests/at/suites/req-002/_source-scan.ts` held twelve arms of five kinds of work.
Its oracle was one file. This fix splits both. It also narrows two rules that
were broader than their claims.

No acceptance id changed colour. `tests/at/expected/req-002.json` was not
edited. No product code under `supabase/` was edited. No arm was deleted.
No new arm was added. No re-export barrel was left. No new harness machinery.

## The split

Five families. The shared posture (throw rather than report an absence the
instrument could not measure) lives once, in the floor.

| Family | Suite file | Oracle file |
| --- | --- | --- |
| Shared floor | `_source-scan.ts` (189 lines) | none of its own |
| Vetting surface | `_source-vetting.ts` (209 lines) | `req002-vetting-oracles.selftest.ts` (241 lines) |
| Document rule | `_source-documents.ts` (145 lines) | `req002-documents-oracles.selftest.ts` (103 lines) |
| Pins | `_source-pins.ts` (618 lines) | `req002-pins-oracles.selftest.ts` (323 lines) |
| Absences | `_source-absences.ts` (644 lines) | `req002-absences-oracles.selftest.ts` (606 lines) |

The floor keeps the name `_source-scan.ts` so it matches the req-001 and
req-016 source-arm files. It holds `SourceFile`, `RouteInventory`, the tree
readers, the surface loader, the path normaliser, the line locator, the word
splitter, the quoted-string reader, and the JSX text reader. One `words()`
serves every arm.

Call sites now import the family that owns the arm:

- `c-vetting-action.test.ts` → `_source-vetting.ts`
- `d-evidence-rule.test.ts` → `_source-documents.ts`
- `b-allowance.test.ts` → `_source-pins.ts`
- `e-gates.test.ts` → `_source-vetting.ts` and `_source-pins.ts`
- `f-public-claims.test.ts` names `_source-absences.ts` in its comment

`req002-oracles.selftest.ts` is now the cross-family real-tree smoke only
(44 lines). The injected-text refusals live in the four family oracle files.
That smoke is not a re-export.

A leftover stub `_source-floor.ts` (4 lines, unused) remains because deleting
a file in this session was blocked. The lead should delete it. It is not a
barrel and nothing imports it.

## The two narrowings

**One. The `verified` field.** The trust-wording arm no longer flags every
`verified:` field on every product TypeScript surface. A `verified` field is
an organisation trust claim when it sits on a person-facing surface
(`src/`, `notification-copy.ts`, `public-project.ts`, `tenant-reads.ts`) or
the enclosing declaration names an organisation or NGO, and the enclosing
declaration is not email, domain, or webhook-signature verification. A
`verified` field about an email address, a domain, or a webhook signature
is left alone. A lone `verified` field on an internal module with no
organisation subject is left alone. A `verified` field on the public
projection still fails.

**Two. The naming sweeps, arm by arm.**

- **Trust wording, quoted strings and badges — left as they were.** The
  subject split (email or auth versus an organisation trust claim) is as
  narrow as the claim. A one-word `Verified` badge on a person-facing
  surface has no subject in the string; the person-facing bound is the
  honest one.
- **Discovery wallet names — narrowed.** Declaration names now use the same
  daily-grant accounting split as copy. A Discovery name that is a wallet
  form still fails. A Discovery `balance` that is grant, granted, spent,
  remaining, debit, allowance, or daily is not a wallet. The arm still
  reads every declaration. That is how it finds `DiscoveryWallet`. The
  match is the rule, not the walk.
- **Publish-flow visibility — narrowed.** A name with `visibility` is a
  publish surface only when it also names a project or a publish verb. A
  `visibility` / `published` / `triage` / `scoped` column is publish state
  only on a project table, or on a table whose name is already a publish
  or triage store. A UI `column-visibility` route and
  `organizations.visibility` stay silent.
- **Publish-flow triage and publish names — left broad.** `triage` in a
  name is the claim (no triage queue). `publish*` except the permit and
  the public page is the claim (no publish write). `project` plus
  `state` / `status` / `lifecycle` is the claim. Cron that writes
  `public.projects` stays.
- **KYC surfaces — left as they were.** That arm already reads route
  folders, write-route rows, shared modules, and UI routes. It does not
  tokenise every declaration.
- **Document sinks — left as they were.** Type-and-name oracle, not a
  declaration sweep.

No arm was deleted. If an arm earned deletion, it would still be here.

## Selftest count

Before: 22 files, 384 tests.
After: 26 files, 394 tests. The count did not fall. The extra tests are the
four per-family real-tree smokes and the six narrowing silences (email
`verified` field, webhook `verified` field, internal lone `verified` field,
`DiscoveryGrantBalance`, UI `column-visibility`, `organizations.visibility`).

## Checks

The first three ran before this report. The verify runs were filled in after
they finished.

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

The local stack was not stopped.

## Least sure

Whether the enclosing-declaration window around a `verified` field is the
honest subject split, or whether a field two types above the match could
still be classed wrong. The public-projection refusal and the email /
webhook / internal silences hold on the injected cases.

## What the lead changed in review, 2026-09-11

One deletion. The lane could not remove a file, so it left `_source-absences.ts`'s neighbour
`_source-floor.ts` behind as a four-line stub saying the shared floor lives elsewhere. Nothing
imported it. The lead deleted it and re-ran the type check and the selftest.
