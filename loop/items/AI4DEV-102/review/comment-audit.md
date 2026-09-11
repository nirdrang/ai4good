# Comment audit — AI4DEV-102, commit range `main...426f2c1`

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102`
Scope: every changed file under `supabase/` and `tests/at/`. `loop/` ignored by instruction.
Nothing was changed. This is report only.

**35 findings: 7 comments that are false about the code beside them, 28 comments that are meat.**

Scope note on the ten modified (not new) files: this branch adds **no comment lines** to
`tests/at/harness/config.ts`, `suite-adapters.ts`, `shipped-tenant-reads.selftest.ts`,
`req-001/_fixture.ts`, `_integration.ts`, `_live.ts`, `_live-tenant-reads.ts`, `_policy-scan.ts`,
`d-tenant-isolation.test.ts`, `supabase/functions/_shared/edge.ts`, `tenant-reads.ts`,
`write-routes.ts`, `notification-copy.ts`, or `supabase/config.toml`. Their pre-existing comments
are outside this branch's change and were not hunted.

---

## PART 1 — FALSE COMMENTS

The highest-value findings. Each one was checked against the code it sits on.

### F1. `tests\at\suites\req-002\_contract.ts:80` — the schema says the opposite

```
/** The four fields the profile route adds to the name. All four or none: the schema says so. */
```

`supabase/migrations/20260915120000_organization_profile.sql` adds `mission`, `country`, `website`
and `logo` as four **independently nullable** columns with only a per-column
`check (length(btrim(...)) > 0)`. That migration's own header, lines 4-6, states that such a check
passes when the column is null. There is no cross-column constraint in the file — no
`num_nonnulls`, no all-or-none check. All-four-or-none is enforced by the definer function
`set_organization_profile` and by the request type, **not** by the schema. The same file
contradicts itself eight lines down at `_contract.ts:88`: *"Nulls mean the profile is incomplete."*

### F2. `tests\at\suites\req-002\_pending.ts:6-7` — describes a stamping mechanism that does not exist

```
 * An id not yet written is declared, not faked: it throws, stamped with its own id
 * and with the manifest leaf that will make it real
```

The file's only helper is `awaiting()` (line 55), which throws `new CapabilityPending(surfaces)`.
`CapabilityPending` carries capability names only — no AT id, no leaf. Every call site in the six
test files passes `AWAITED.*`; none passes `LEAF.*`. The sentence is inherited verbatim from
`req-001/_pending.ts`, where `notLanded()` really does throw `new AtPending(ctx.atId, ...)`.

### F3. `tests\at\suites\req-002\_pending.ts:11-12` — false for this suite

```
 * The tail after the em dash is free: `expected.ts` anchors on the prefix only.
```

`tests/at/harness/expected.ts` anchors on the prefix only for `kind: 'pending'`. For
`kind: 'capability-pending'` it rebuilds the whole first line and compares for equality. Every red
in `tests/at/expected/req-002.json` is `capability-pending`, so in this suite the tail is matched
exactly. This suite never throws `AtPending` at all.

### F4. `tests\at\suites\req-002\_pending.ts:4-5` — wrong count, attributed to the wrong document

```
 * ...so all twenty-seven ids of `.taskmaster/docs/acceptance/at-req-002.md` need executable call sites
```

That document names 32 ids (AT-002.01 to .31 plus AT-002.11b); four are retired, leaving 28 live.
Twenty-seven is the count of the P0 ids only. The sentence attributes it to the document and
silently drops AT-002.24, which is live at P1 and has no call site.

### F5. `tests\at\suites\req-002\_source-scan.ts:496-497` — wrong for the capitalised form

```
 * ...the same token in `verification.ts` is the email-decision value and is left alone.
```

`BARE_VERIFIED_LABEL` (line 513) matches `verified|Verified|VERIFIED`, but the exemption at line
576 tests `piece.value === 'verified'` — lower case only. A `'Verified'` string in
`verification.ts` is flagged, not left alone. The comment at lines 573-575 states the real rule and
contradicts this one.

### F6. `tests\at\harness\req002-oracles.selftest.ts:2` — "each" is ten of eleven

```
 * Oracle for REQ-002's source arms: each refusal the scan names, over injected text.
```

`_source-scan.ts` exports eleven scans; this file covers ten. `scanGrantPins` and its
`grantPinProblems` wrapper (`_source-scan.ts:637` and `:681`) are never imported here, are absent
from the ten-wrapper sweep at lines 65-74, and have no `describe` block. Their injected-text arm
lives inside an acceptance body instead, at `b-allowance.test.ts:335`.

### F7. `supabase\migrations\20260916120000_discovery_allowance.sql:406-408` — the reason clause is wrong in this function, and the paragraph is a duplicate

```
  -- C1: take the UTC day after the organisation row is locked (the FOR UPDATE above), never from
  -- now() and never from transaction start. A transaction that began before midnight can take its
  -- lock after midnight; now() would then charge the spend to the previous day.
```

Inside `set_organization_vetting` nothing is spent. The next statement calls
`apply_discovery_grant_mark`, which inserts or raises a **grant** row. The hazard here is writing
the grant mark on the wrong day, not charging a spend. The paragraph is copied almost word for word
from lines 105-107, where it sits in `discovery_allowance` and is correct. Two copies of one rule,
free to drift — and one already has.

---

## PART 2 — MEAT, RANKED WORST FIRST

### `tests/at/suites/req-002/`

1. **`_pending.ts:17-20`** — `/** The manifest's leaves, in the manifest's own words shortened to a recall hint. ... */`
   Four lines documenting `LEAF`, a constant exported and imported nowhere in the tree. Documentation of dead code.
2. **`_source-scan.ts:21-23`**, repeated at **`351-354`** — `* A jsonb column holding a PDF, or a download screen named 'file-desk.tsx', escapes the document oracle the same way...`
   The same point twice, 330 lines apart.
3. **`_source-scan.ts:1058-1090`** — `* WHAT THIS IS. ... HOW IT TELLS ... APART ... WHAT THIS IS NOT.`
   Thirty-three lines whose new content is one paragraph (cron and triggers, 1080-1084); the rest restates the file header and the two oracles above.
4. **`_source-scan.ts:868-891`** — the same template, 24 lines, carrying the same formula sentence as the block above.
5. **`_source-scan.ts:480-505`** — the same template a third time, 26 lines, per-oracle content about two sentences.
6. **`_contract.ts:17-26`** — `* THE DOMAIN OBJECTS, named before the operations on them: ...`
   A table of contents whose six bullets restate the doc comment attached to each type below.
7. **`_contract.ts:10-15`** — `* THE JUDGEMENT TYPES ARE IMPORTED FROM THE SHIPPED MODULES, not restated. ...`
   The enumeration has drifted: `VettingOutcomeNotice` is imported at line 33 and re-exported at line 47 and is missing from the list.
8. **`_contract.ts:49, 69, 78, 119, 233, 246, 252, 266, 279, 299, 329, 334, 356, 369, 376`** — dashed banners (`/* ---- the refusal shape */`, `/* ---- the allowance */`, `/* ---- the SUT */`, `/* ---- the world */`).
   Each sits over the declaration that already carries the name. Banner with no information.
9. **`_source-scan.ts:478, 603, 700, 866, 1056`** — the same dashed banners. Line 603, `/* ---- grant-drift (G5) */`, additionally carries an internal code that names nothing.
10. **`_source-scan.ts:617, 726, 761`** — `Throws when the function text cannot be read.`
    Said three times, after the file header says it at lines 13-15 and each body's own `throw` says it again.
11. **`_source-scan.ts:943`** — `/** A type, table, route, or file whose name is a Discovery wallet. */` over `function isDiscoveryWalletName(raw: string): boolean`. Restates the signature.
12. **`_bind.ts:9-10`** — `* ID BINDING: every test is registered through 'atTest(id, name, fn)'...`
    A harness rule restated in a file that contains no `atTest` call site.
13. **`_bind.ts:21-22`** — `* ...there is no type argument here through which this suite could declare a seam nothing supplies.`
    Repeats the point the two lines above it already made.
14. **`e-gates.test.ts:68-69`** — `// scanVettingRoutes: exactly one write route reaches the definer...`
    Restates the assertion message three lines below and the doc comment at `_source-scan.ts:147-150`.
15. **`e-gates.test.ts:74-75`** — `// scanOrgVettingWriters: no statement outside the definer writes org_vetting...`
    Same restatement; the expect message on line 78 and `_source-scan.ts:182-185` say it twice more.
16. **`e-gates.test.ts:80`** — `// scanScheduledVetting: no cron job or trigger vets — the default is not a scheduled job.`
    Restates the expect message on line 81. The same three assertions appear twice in `c-vetting-action.test.ts` with no comments at all.
17. **`e-gates.test.ts:63-66`** — `// Concierge onboarding is not a route. It is the pilot operator running the ordinary audited vet action by hand. That is the whole content of...`
    The first two lines are the whole content; the rest re-argues the same sentence.
18. **`b-allowance.test.ts:304-305`** — `// The day travel is persistSpendOnPreviousUtcDay... Correction C3.`
    Repeats the point made inside `persistSpendOnPreviousUtcDay` at lines 85-87, and "Correction C3" is an internal code that says nothing to a reader.
19. **`b-allowance.test.ts:402-404`** — `// The criterion also says this NGO cannot publish. No publish route exists in this tree...`
    A dangling three-line paragraph at the end of a test body, asserting nothing. The point is already made in this file's header, in `e-gates.test.ts:6-9`, in `c-vetting-action.test.ts:6-9`, and mechanically in `tests/at/expected/req-002.json`.
20. **`b-allowance.test.ts:423-424`** — `// On an unfunded project is the criterion's own scope...`
    Floating comment attached to no statement; its first half restates the criterion title quoted on line 408.

### `tests/at/harness/`

21. **`shipped-org-vetting.selftest.ts:1-22`** — the 22-line header duplicates the module docblocks it tests (`org-vetting.ts:47-54` and `:63-74`) phrase for phrase, over 26 lines of code. Two copies of one WHY, free to drift apart.
22. **`shipped-org-vetting.selftest.ts:14-21`** — the two `WHAT A GREEN ... CLAIMS / WHAT IT DOES NOT CLAIM` blocks. Lines 5-7 already say it; the "claims" halves also restate the `it()` titles at lines 29 and 41.
23. **`req002-oracles.selftest.ts:3`** — `An oracle that cannot fail is not an oracle.` A slogan, not a fact about this code.

### `supabase/`

24. **`functions/_shared/org-vetting.ts:63-74`** — the `fundingAllowed` docblock.
    Three paragraphs for a one-line function. The middle paragraph argues with the signature it just
    chose (*"The function takes it and ignores it... A signature that omitted the flag would hide
    that the rule is 'regardless of tier'"*). The one sentence that earns its place is the last:
    `NO CHECKOUT CONSULTS IT YET. AT-002.31 stays red for exactly that reason.`
25. **`migrations/20260916120000_discovery_allowance.sql:198`** — `-- The mark update joins the existing vetting transaction. Insertion, not a rewrite of the action.`
    Narrates the edit rather than the code. A reader six months from now has no diff in front of them.
26. **`migrations/20260916120000_discovery_allowance.sql:32-33`** — `-- High-water mark for the day's row: granted := greatest(granted, dailyGrantFor(currentTier)). -- The first row of a new UTC day is inserted with granted = dailyGrantFor(tier) and spent = 0.`
    Pseudocode of the two statements directly below, and a repeat of the file header at lines 1-2.
27. **`functions/_shared/discovery-allowance.ts:32-35`** — the `highWaterGrant` docblock.
    `'storedGranted' is null when the day has no row yet` restates the `number | null` in the
    signature; `Remaining is 'granted - spent' and is never stored` restates `remainingCredits`
    nine lines down and the SQL header.
28. **`functions/discovery-allowance/index.ts:5`** — `Publishing and funding are not this route.`
    The sentence before it already says the route creates no conversation, no agent response and no
    funded turn.

---

## PART 3 — CLEAN, AND COMMENTS THAT EARN THEIR PLACE

Clean files (no meat found):

- `tests/at/suites/req-002/_fixture.ts`, `_live.ts`, `a-org-profile.test.ts`,
  `c-vetting-action.test.ts`, `d-evidence-rule.test.ts`, `f-public-claims.test.ts`
- `tests/at/harness/req002-oracles.selftest.ts` apart from its header (938 lines of body, zero comments)
- `supabase/functions/set-organization-vetting/index.ts` (no comments at all)
- `supabase/migrations/20260914120000_org_vetting.sql`, `20260914110000_audit_event_kind_org_vetting.sql`,
  `20260915120000_organization_profile.sql`
- `supabase/functions/_shared/memberships.ts` (this branch adds one comment, line 150, and it is accurate:
  the profile decision does validate five fields)
- `tests/at/suites/req-001/_contract.ts` (one comment changed, line 94, a public-API doc comment giving
  null semantics the type cannot)

Verified and kept, so nobody deletes them by mistake:

- `20260914110000_audit_event_kind_org_vetting.sql:1-3` — PostgreSQL refuses a new enum value in the
  transaction that writes it. A real platform gotcha that explains why there are two migrations.
- `20260914120000_org_vetting.sql:56-57` — an attestation cannot prove a mailbox deletion. A stated
  limit on what the constraint proves.
- `discovery-allowance.ts:13` and `:46-47` — two warnings that a value or a sentence exists in both
  TypeScript and SQL. Both checked against the migration and both true.
- `discovery-allowance.sql:105-107` — the C1 locking rule, correct in `discovery_allowance`.
- `discovery-allowance.sql:410-412` — the higher-of-two-tiers grant mark and the founder ruling of
  2026-09-09 behind it.
- `org-vetting.ts:47-54` — why `publishingAllowed` lives in the product and not in a test adapter,
  plus which AT ids stay red because no route calls it.
- `_live.ts:77` and `_fixture.ts:425-427` — both checked true by the fixture lane.

## PART 4 — NOTES THAT ARE NOT COMMENTS

- **Dead code.** `tests/at/suites/req-002/_pending.ts:21-33` exports `LEAF`, and nothing in the tree
  imports it. It is the constant that finding F2's false sentence describes. Per this repo's rule on
  pre-existing dead code, it is reported, not removed.
- **A cross-lane worry that is a false alarm.** One hunter flagged `memberships.ts:8` (an account may
  hold `admin` in one organisation and `member` in another) against `a-org-profile.test.ts:164` (the
  single-seat index forbids a second row). They do not conflict:
  `org_memberships_one_seat_per_org_idx` is unique on `org_id` alone, so it caps memberships **per
  organisation**, not per account. Both comments are true.
