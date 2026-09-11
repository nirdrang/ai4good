**Recommend C as the base. B is the runner-up. None is ready to hand directly to a writer.** C best protects the central invariant: a vetted organisation has a complete evidence record enforced by the database. B offers the strongest simplification, but its audit constraint does not enforce what it claims.

Scores assess the designs as written. I read all four and the grounding, then checked the relevant migrations, harness, scans, route dispatches, and notification implementation. No files were written or tests executed.

| Candidate | Claimed acceptance coverage | Integration reset | Atomic, complete vet | Repository rules | Minimality | Buildability | Total /30 |
|---|---:|---:|---:|---:|---:|---:|---:|
| A | 2 | 2 | 2 | 4 | 4 | 3 | **17** |
| B | 2 | 2 | 2 | 3 | 5 | 3 | **17** |
| C | 3 | 2 | 4 | 4 | 3 | 4 | **20** |
| D | 2 | 2 | 2 | 3 | 1 | 2 | **12** |

**A.** Its strongest idea is the split notification construction in §3.4: TypeScript supplies taxonomy-derived channels and copy; SQL resolves the recipient inside the transaction. That avoids extending every route’s standing with an email address. Its worst flaw is §3.3’s claim that duplicate validation makes a partial vet impossible: the mandatory evidence fields have no schema constraint. The quoted SQL also accepts notification channels from its caller, and §8 acknowledges that an empty array can commit a vet with no deliveries. [A](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/loop/items/AI4DEV-102/design/blind/design-A.md)

**B.** Its strongest idea is genuine reuse: profile fields and dated spending extend `organizations`, while the existing edit route gains compatible patch semantics. Its worst flaw is the supposedly structural audit guard in §1. Required keys can contain JSON null; absent `outcome` can make the entire CHECK evaluate to SQL NULL, which passes. This is weaker than the document’s admitted “empty strings remain possible” limitation. [B](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/loop/items/AI4DEV-102/design/blind/design-B.md)

**C.** Its strongest idea is the constrained vetting record in §1: mandatory typed columns, populated-value checks, and explicit evidence metadata conditions. Its worst flaw is acceptance overclaiming in §5: it converts several complete behavioural criteria into narrower allowance, policy, or projection assertions while leaving their IDs green. The limitations are described honestly in prose, but that honesty does not propagate into the manifest. [C](C:/Users/nirdirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/loop/items/AI4DEV-102/design/blind/design-C.md)

**D.** Its strongest idea is calling out the unresolved consequence of unvetting: whether already-granted credits remain usable. The others silently choose an immediate reduction. Its worst flaw is turning its assigned structure into unnecessary product machinery: three tables, insertion triggers, duplicated remaining/spent state, and a same-day-raise flag, while mandatory evidence still lives in unconstrained audit JSON. [D](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/loop/items/AI4DEV-102/design/blind/design-D.md)

**What the six scores rest on**

1. **Acceptance coverage:** A’s §5.6 explicitly omits funding from its green unvet test. B’s §6 admits narrowed coverage and then argues that making the ID red would describe the work badly—exactly the wrong reason to retain green. C’s §5 provides the strongest negative and concurrency matrix, but still narrows complete IDs. D’s §5 places the email check in adapter orchestration, rather than its SQL debit contract.

2. **Reset:** all four get **2**, because every integration test substitutes yesterday’s stored state for an observed midnight. That is useful stale-state coverage; it does not satisfy the rubric’s actual boundary observation. C §2 and A §5.6 at least debit between reads, making the “no second reset” assertion meaningful. B §2 merely repeats a full-balance read: a broken implementation that resets on every read can pass that particular test.

3. **Atomic vet:** all four eventually use one owner-definer transaction for state, audit, and emit. A and D stop at procedural field guards. B adds a defective CHECK. C supplies real schema constraints, but its audit snapshot is still assembled procedurally: the schema does not require the audit event or its complete snapshot whenever the aggregate changes. Hence **4**, not 5.

4. **Repository rules:** all four correctly preserve the emitter fence, use the existing `vetting.outcome` taxonomy row, separate audit-enum additions, and specify compatible table privileges. A and C explicitly budget for the auth suite’s exhaustive route dispatches. B and D do not fully specify those updates; new `WRITE_ROUTES` keys otherwise break the existing `Record<WriteRouteName, …>` maps. B additionally renames `decideOrganizationRename`, which the auth fixture currently imports. These are concrete build omissions, not hypothetical style concerns. The relevant checks are in the [route scan](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/tests/at/suites/req-001/_write-route-scan.ts) and [auth fixture](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/tests/at/suites/req-001/_fixture.ts:1586).

5. **Minimality:** B earns **5** for extending existing storage and the edit route. A’s extra daily-history table and read policies are less justified: it explicitly invokes a later dashboard to justify access nobody presently needs. C’s constrained evidence table earns its existence; its separate usage table, allowance edge, and separate funding/publishing modules need stronger justification. D’s three-table split and trigger lifecycle are substantially more machinery than its invariants require.

6. **Buildability:** C gives the clearest schema, locking order, negative cases, and unit dependencies. A supplies substantial SQL but leaves a metadata translation gap: its request uses `mimeType`, `sizeBytes`, and `receivedAt`, while SQL requires snake-case keys. Its unit sequence also introduces `attemptPublish` after earlier tests already need it. B lacks the complete central vetting SQL and has an invalid email-unverified setup, discussed below. D omits a backfill for organisations predating its insertion triggers and leaves important debit validation unspecified.

**The twenty-seven P0 IDs**

“Supported” below means supported at the brief’s permitted backend boundary; it does not certify a browser or Discovery conversation flow.

| ID and obligation | A | B | C | D |
|---|---|---|---|---|
| .01 — Profile persists and renders | Supported through dashboard projection | Same | Same | Same; extra join |
| .02 — All five edits; other callers refused | Supported | Supported | Strongest explicit refusal matrix | Supported |
| .04 — Exact grant, consumption cap, draft and publish conditions | Meter covered; draft assertion absent | Meter covered; neither draft nor publish behaviour established | Meter and publish policy covered; draft assertion absent | Same gap |
| .05 — Exhaustion and shown remedies | Integration wording assembled by adapter | **Honest integration red**; loop decision covered | Deployed allowance boundary is strongest; no message screen | Adapter-composed wording |
| .06 — UTC rollover, exactly once | No observed boundary | No observed boundary; weak repeated-read assertion | Strong stale-day matrix; no observed boundary | No observed boundary |
| .07 — Immediate `30 − k`, later days 30 | Immediate math supported; later-day proof qualified | Same | Same, with better clock capture | Same, with more mutable state |
| .08 — Unvet/re-vet never stacks | Spending preserved; reduction on unvet assumed | Same | Same | Worked arithmetic does not stack; credit retention assumed |
| .10 — Paid continuation uses ordinary fuel | Honest red | Honest red | Honest red | Honest red |
| .11 — Complete audit record | Procedural construction | Procedural construction plus weak CHECK | Constrained source record and snapshot | Procedural construction |
| .11b — Any required omission prevents commit | Route/RPC guards; no schema invariant | CHECK permits null-valued fields | Strongest: direct constraint negatives, including re-vet | Route/RPC guards; no schema invariant |
| .12 — Unvet closes publishing, funding unaffected | **Incomplete green:** funding deliberately untested | **Incomplete green:** no publish consumer or policy | Policy-only green; actual effects unproved | Policy-only green; actual effects unproved |
| .13 — Both outcomes through normal emitter | Correct transaction; delivery completeness underconstrained | Correct transaction; externally prepared write set trusted | Strongest: current recipient and comparison with `prepareWriteSet` | Correct transaction; externally prepared write set trusted |
| .14 — Single audited manual action | Supported | Supported in final design | Supported | Supported |
| .16 — Metadata only; content unavailable afterwards | Metadata key mismatch; no mailbox-deletion proof | Silently drops supplied content; no mailbox-deletion proof | Best custody treatment; attestation is not deletion proof | No mailbox-deletion proof |
| .17 — Sensitive identity evidence refused | Closed enum supports refusal | Closed enum supports refusal | Closed SQL vocabulary and request refusal | TypeScript-only vocabulary; SQL checks merely nonblank |
| .18 — Exact evidence type; no implied review | Supported, but broad text regex is brittle | Supported at existing surfaces | Strongest cross-storage inspection | Supported at existing surfaces |
| .19 — Unvetted publish blocked; scoped retained | Honest red | Honest red | Honest red | Honest red |
| .20 — Vetted publication enters triage | Honest red | Honest red | Honest red | Honest red |
| .21 — Discovery not vetting-blocked | Direct debit boundary supported | Same | Deployed allowance boundary supported | Adapter decision supported |
| .22 — Email floor at every trust tier | SQL backstop; stated test lacks explicit two-tier matrix | **Broken Given:** registration alone creates no NGO account/profile | Strongest: actual Auth fact checked in product SQL | Check lives in adapter; debit SQL lacks it |
| .23 — Complete public-claim sweep | Current page only; contradicts brief’s declared remainder | Same, explicitly acknowledged | Same | Same |
| .26 — Funding restores fuel-billed turn | Honest red | Honest red | Honest red | Honest red |
| .27 — Rollover restores next free turn | Stale-day debit supported; no actual rollover | Same | Same, through deployed allowance route | Same |
| .28 — Concierge completion leaves vetted tier | Manual action and resulting grant supported | Same | Same | Same |
| .29 — Non-admin vet/unvet rejected | Supported | Supported | Strongest negative matrix | Supported |
| .30 — Manual-only vetting | Supported by proposed inventory checks | Supported | Supported | Supported |

B’s email test deserves particular attention. Its §5 uses the state immediately after registration, then expects the debit’s email refusal. The existing `assert_account_active` explicitly permits a missing account to fall through; registration has not created the organisation that the test needs. A and C explicitly provide operator setup for this otherwise unreachable Given. D also provisions it, but then places the important refusal outside the product debit.

**Why C over B**

C spends complexity on the invariant the rubric explicitly prioritises: complete evidence is required by the database. B spends less overall, but its central safety argument is false as written. Repairing B requires deciding how to make audit completeness structural, tightening notification construction, and correcting several claimed greens. C already provides the stronger evidence record, recipient locking, database-derived email floor, and post-lock clock capture.

B wins the tie with A as runner-up because its storage and profile-route reuse remove ongoing maintenance costs. A’s daily history and second profile route do not buy comparable acceptance coverage.

**The grafts**

| Source | Specific part worth porting into C | Why it improves C |
|---|---|---|
| **A** | §3.4’s separation of taxonomy-derived notice data from transaction-local recipient resolution | C hard-codes channels and copy in SQL. A demonstrates how to keep those definitions in TypeScript without adding email to shared standing. Port the separation, **not** its unchecked `channels` argument. |
| **A** | §3.4’s named vet/unvet copy | C’s generic “Vetting outcome notification. unvetted” is poor product communication. A gives each action intelligible wording without changing the taxonomy. |
| **A** | §§1.6 and 5.5’s SQL/TypeScript/config grant comparison | C compares live SQL grants, but CI runs loop only. A adds a migration-source check that catches literal drift in CI. |
| **B** | §1’s dated-spend columns on `organizations` | C’s one-row-per-org usage table has no history or independent read audience. B achieves the same arithmetic with less schema and catalog machinery. Keep C’s locking and time-capture discipline. |
| **B** | §4’s compatible extension of `update-organization` | C also expands `create-organization`, although signup has already created the organisation in the acceptance Given. B reaches first profile completion and later edits through one existing route. |
| **B** | §6’s integration-red treatment of shown remedies | C must distinguish a debit refusal from a user seeing the promised remedy. B expresses that distinction in the manifest, where it matters. |
| **D** | §2’s explicit discussion of credits after unvet | C silently chooses an immediate reduction. D identifies the decision that needs resolution. Port that issue and its test scenarios, **not** the stored balance and raise flag. |
| **D** | §1’s inventory of dashboard implementors and mocks | C says to extend tenant reads but gives less complete compatibility accounting. D specifically names the tenant-read selftest and isolation mocks, reducing writer guesswork. |

B and D are wrong that named notification copy requires changing the closed taxonomy oracle. The source separates `NAMED` rendering from taxonomy registration. Changing copy warrants regression verification; it does not require another event or a taxonomy-spec change. [Copy renderer](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/supabase/functions/_shared/notification-copy.ts)

**Shared mistakes and omissions**

- **All four overclaim the integration reset.** None observes a UTC boundary. The real harness passes only stack configuration to live adapters and supplies `RealClock.now()`; it supplies no controllable live clock. Backdating is legitimate setup, but a source expression plus stale-state test is not an observed transition. Their integration greens for the rollover clauses require either different evidence or an explicitly accepted narrower interpretation. [Harness](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/tests/at/harness/index.ts:233)

- **A, B, and D capture transaction-start time before waiting on locks.** A transaction begun before midnight can acquire its lock after midnight and still charge yesterday. C’s §2 choice—`clock_timestamp()` captured after locking—is materially better. This is a real boundary failure that a backdated-row test will miss.

- **All four promote partial acceptance to green.** Most clearly, `.12` remains green despite absent publishing/funding consumers. All four also override the brief’s explicit instruction to declare the unfinished public-surface sweep for `.23`. A scoped current-surface test is useful; it does not silently replace the specified acceptance boundary.

- **All four leave evidence deletion partly outside the system.** C states the limitation most accurately. Rejecting attachments or storing only metadata cannot prove deletion from the founder’s mailbox. B’s claim that removing a deletion-audit requirement also removes the deletion obligation is unsupported.

- **All four rely on transaction reasoning without specifying a decisive late-failure test.** Field omissions generally fail before writes. They do not exercise rollback after state and audit have changed but emission fails. The existing emitter accepts caller-supplied deliveries and does not independently enforce taxonomy completeness; an event with no deliveries is possible. C’s fixed construction is strongest, but it still needs failure evidence for the complete transaction. [Emitter](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql:191)

- **The unvet allowance policy is unresolved across the candidates.** A/B/C immediately reduce available credits; D retains them until reset. Neither consequence is expressly settled by the acceptance text. The designs disagree on product behaviour while each presents its choice as inevitable.

Attribution: unattributed.