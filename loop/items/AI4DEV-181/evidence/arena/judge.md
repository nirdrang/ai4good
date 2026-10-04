**Recommend C1 (immutable JSONB revisions) as the base for AI4DEV-181 (Discovery backend wiring), with C5 close behind.** C1 puts brief rules in one TypeScript module and gives concrete commit checks for turns, review writes, files, and confirmation. C5 provides equally strong transaction semantics, but adds a second ledger and substantial SQL document logic.

Scores assess the designs as written. None fully resolves the integration-test requirement.

| Candidate | Brief and revision | Turn path | Concurrency and failure | Interface depth | Testability | Smallest correct change | Total / 30 |
|---|---:|---:|---:|---:|---:|---:|---:|
| [C1 — immutable revisions](C:/Users/nirdr/AppData/Local/Temp/claude/C--Users-nirdr-Downloads-ai4good/44802c73-47d7-44cd-b178-89b3ea791dc2/scratchpad/arch181/out-astra.md) | 5 | 5 | 5 | 4 | 2 | 3 | **24** |
| [C2 — normalized tables](C:/Users/nirdr/AppData/Local/Temp/claude/C--Users-nirdr-Downloads-ai4good/44802c73-47d7-44cd-b178-89b3ea791dc2/scratchpad/arch181/out-fable.md) | 3 | 3 | 2 | 3 | 2 | 2 | **15** |
| [C3 — event sourcing](C:/Users/nirdr/AppData/Local/Temp/claude/C--Users-nirdr-Downloads-ai4good/44802c73-47d7-44cd-b178-89b3ea791dc2/scratchpad/arch181/out-grok.md) | 2 | 2 | 1 | 3 | 1 | 2 | **11** |
| [C4 — mutable project document](C:/Users/nirdr/AppData/Local/Temp/claude/C--Users-nirdr-Downloads-ai4good/44802c73-47d7-44cd-b178-89b3ea791dc2/scratchpad/arch181/out-opus.md) | 3 | 3 | 2 | 4 | 2 | 3 | **17** |
| [C5 — committed-turn ledger](C:/Users/nirdr/AppData/Local/Temp/claude/C--Users-nirdr-Downloads-ai4good/44802c73-47d7-44cd-b178-89b3ea791dc2/scratchpad/arch181/out-sol.md) | 5 | 5 | 5 | 4 | 2 | 2 | **23** |

The evidence below follows the six rubric criteria in order.

**C1 — immutable revisions**

1. **Brief:** §1 centralizes semantic comparison, provenance preservation, dependency marking, and finish decisions; §2 derives current confirmation from the latest revision.
2. **Turn:** §3 explicitly accepts answers without a note, gives structured answers precedence, streams one forced tool, and preserves message IDs and committed parts.
3. **Concurrency:** §2’s project lock and read fence cover confirmation, open turns, and file generations; §5 retries file publication from stored facts without rereading.
4. **Interface:** §6 preserves all nine port members and handles reconciliation internally; operation receipts and read fences add server bookkeeping.
5. **Tests:** §6 specifies real routes, seeded worlds, and actual dispatch counting, but explicitly leaves paid scenarios and exact model-derived assertions unresolved.
6. **Change size:** The module map avoids replay and normalized assembly, but introduces revision, receipt, confirmation, and manual-message stores.

**C2 — normalized tables**

1. **Brief:** “Shape—Rules in SQL” provides one bump helper, but SQL `discovery_brief_apply_turn` sets `changed := true` for every submitted answer without an equality check.
2. **Turn:** “Shape—The turn” specifies authoritative answers, forced streaming, and stable IDs; the unit 2 migration leaves conflicting existing constraints.
3. **Concurrency:** Reserve/settle capture no brief revision; review writes can change answers during generation, and the file reader has no durable recovery mechanism.
4. **Interface:** The port stays unchanged, but SQL dispatch, five verb functions, helpers, and multi-table snapshot assembly increase reader load.
5. **Tests:** “Usage” seeds existing worlds and “Shape” adds deterministic copy, but counting settled turns misses failed dispatches and positive fuel remains unresolved.
6. **Change size:** “SQL” adds numerous tables and functions for a screen whose dominant read consumes the complete brief.

**C3 — event sourcing**

1. **Brief:** “Fold and commands” and `brief_append` both compute material-event revision semantics; finish appends with `baseRevision null`.
2. **Turn:** “Shape” ignores model agreements, while “Reply tool and the stream” has no section-update fields, leaving facts supplied through the composer note without a complete filing path.
3. **Concurrency:** “Tradeoffs accepted” explicitly permits last-event-wins writes and retains an abandoned turn’s credit.
4. **Interface:** The public port remains small, but every load requires replay and coordination of separately read events, turns, files, and allowance.
5. **Tests:** “Module map” counts turn and file rows as calls, which cannot establish actual dispatch counts; scripted options and paid scenarios remain unsolved.
6. **Change size:** The event vocabulary and historical fold add machinery beyond the required current brief and revision checks.

**C4 — mutable project document**

1. **Brief:** “Data first” correctly derives confirmation validity, but `discovery_brief_commit` and `discovery_turn_settle` independently increment the revision.
2. **Turn:** Structured answers and forced streaming are specified; “Changes in existing shared modules” changes parts but leaves the live stream’s message-ID allocation inconsistent with reload IDs.
3. **Concurrency:** Review edits refuse an open turn, but SQL `discovery_finish` lacks that check; file stalls become failed only in the read projection.
4. **Interface:** “What the public surface hides” preserves the port and keeps rules behind a small server surface, although five endpoints and mirrored types/copy remain.
5. **Tests:** “Open questions” recognizes the scripting conflict but proposes an HTTP simulator requiring a forbidden harness exception; its counter counts rows.
6. **Change size:** The mutable document is economical, but correcting finish fencing, recovery, identity, and counting requires additional changes.

**C5 — committed-turn ledger**

1. **Brief:** “Revision rules” gives one SQL reducer and semantic comparator; the ledger selects immutable revisions and confirmation joins the current revision.
2. **Turn:** “Accepted request” and “Streaming” cover the existing body, grounded agreements, one forced call, persisted IDs, and all committed data parts.
3. **Concurrency:** “Atomicity and concurrency” rejects obsolete human contexts, merges additive file results, refunds failures, and makes repeated settlement idempotent.
4. **Interface:** “Port” preserves the screen contract and hides polling/reconciliation; the internal ledger, revision view, and SQL reducer increase server complexity.
5. **Tests:** “Integration screen tests” correctly requires real bytes and Haiku, but completed-part records cannot count every dispatch, and paid assertions remain unresolved.
6. **Change size:** “Stored document and committed ledger” adds a committed ledger beside attempts, immutable snapshots, a current view, and deferred cross-table references.

I would graft these ideas into C1:

| Losing candidate | Ideas worth carrying over |
|---|---|
| **C2** | The single consistent database snapshot for the entire screen state; the forced-tool topic enum derived from stored project IDs. (“Shape”, “TypeScript, server”) |
| **C3** | Stored question templates and server-controlled progression, so seeded worlds retain predictable question wording and options. (“Fold and commands”) |
| **C4** | One usage function shared by reserve and reads; the concrete route composition that keeps chat mounted and restores question focus. (“Data first”, decisions 6; “Usage—Route”) |
| **C5** | The explicit refund/retry accounting for one completed logical turn; distinguishing additive file commits from human edits when deciding whether a response can merge. (“Usage”, “Atomicity and concurrency”) |

Several defects would make implementations wrong:

- **C2’s migration cannot work as sketched.** Unit 2 adds `reserved_credits = 1` without removing the existing token-ratio constraint. It also writes the new `brief_update` column during settlement without extending the existing immutability trigger’s allowlist. These can reject reservation or settlement. Its missing turn revision check also permits an older submitted answer to overwrite a newer manual edit. (“SQL—Unit 2”)

- **C3’s finish check is outside the protected append.** Another material event can arrive after `decide` examines the brief, and finish still appends because its base is null. That violates the stale-revision requirement. Last-event-wins turn writes can overwrite newer answers, and retaining credits for abandoned replies charges incomplete work. (“Fold and commands”, “Tradeoffs accepted”)

- **C4 allows finish during a turn.** Finish records confirmation without changing the revision; an already reserved turn can subsequently pass its revision comparison, update the brief, and charge. Finish also lacks the shared project lock used by upload admission. (“SQL—brief store”, “SQL—turn contract”)

- **C4’s stalled-file retry claim contradicts its SQL.** The reader displays a stale `reading` row as failed, but the database still counts it as live and its unique index still reserves the filename. Adding it again can therefore be refused. Its stream also retains the existing random assistant ID while reload constructs `reply-<seq>`. (“SQL—files”, “Changes in existing shared modules”, “discovery-state.ts”)

- **C5’s file-call counter is insufficient.** Completed parts measure successful stored results. They miss in-progress calls, failed calls, and repeated dispatches whose result loses the lease or duplicate-part race. (“Integration screen tests”)

C1 has no comparably explicit overwrite or finish race. Its §5 file reducer still needs an explicit prohibition on agreeing a required topic from file evidence: “populate an existing open topic” must preserve NGO-controlled agreement.

The shared acceptance gap is concrete. Section J requires a [$1.60 paid balance](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-181/tests/at/suites/req-004/j-need-brief.test.ts:312), while the [fuel function returns zero](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-181/supabase/migrations/20260921120000_discovery_funded_routing.sql:3). The [upload helper supplies only the filename as text bytes](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-181/tests/at/suites/req-004/_flows.ts:13), yet assertions require spreadsheet facts and an exact fact count. C1 is the strongest implementation base, but resolving those acceptance constraints remains required before claiming the definition of done.