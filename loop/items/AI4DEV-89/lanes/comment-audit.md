# Comment audit

Scope: `git diff origin/main...HEAD -- supabase tests` (AI4DEV-89 branch), 4269 diff lines,
13 files touched (1 modified config, 3 new product modules, 2 new migrations, 7 test/harness files
modified or new).

## Verdict counts

Files touched: 13 (supabase/config.toml; supabase/functions/_shared/{notification-copy,
notification-provider,notification-taxonomy,notifications}.ts; two migration files; tests/at/
harness/{conformance,live-refusal}.selftest.ts, local-stack.ts; tests/at/suites/req-001/
_policy-scan.ts; tests/at/suites/req-016/{_contract,_fault-switch,_fixture-producers,_fixture,
_integration,_live,_mail-witness,_provider-faults,_source-scan}.ts and the four
`*.test.ts` bodies).

Comments judged: ~150 (doc comments, block headers, inline narration, SQL `--` lines and
`comment on` statements, banner dividers).

Kills proposed: 21 entries (several cover a repeated pattern at more than one line).
MUST KILL flags: 3.
Skips: 6 categories (about 30 individual comments crawl away under them).

## Kills

1. `supabase/config.toml:10` — `# REQ-016's SMTP provider client sends to this port; the acceptance suite reads it from here.` Justification for uncommenting a config line, not an external-platform surprise. Kill.
2. `supabase/functions/_shared/notification-copy.ts:53-62` — the module header ("The copy a recipient receives... Pure: no I/O..."). Design narration about our own module, not an API contract. Kill.
3. `supabase/functions/_shared/notification-provider.ts:143-166` — the file header. Mixes a legitimate protocol fact (SMTP reply-code meaning) with internal architecture narration ("THIS FILE IS THE DOCUMENTED EXCEPTION...", "THE KEY TRAVELS ON THE MESSAGE"). The placement-exception narrative and the header-design rationale are our own code's justification, not vendor behavior. Kill the narrative; the protocol-code paragraph ("THE THREE ANSWERS") is the one part that survives under the external-protocol exception.
4. `supabase/functions/_shared/notification-provider.ts` — `SmtpSession` class comment "One connection, one message. Replies are read one at a time, in the order commands were sent." Narration restating the class name. Kill.
5. `supabase/functions/_shared/notification-provider.ts` — inline `// A connection that opens after the deadline already answered is closed rather than leaked.` Restates the adjacent code. Kill.
6. `supabase/functions/_shared/notification-taxonomy.ts:361-384` — the module header ("ONE TYPED CONST, CLOSED BY CONSTRUCTION...", "THE CLASS CHANNEL RULE IS ENFORCED AT IMPORT..."). Design narration about our own decisions. Kill.
7. `supabase/functions/_shared/notification-taxonomy.ts` — the eleven section-banner comments over the `TAXONOMY` array (`// Project decisions`, `// Discovery fit decline, decline then review`, `// Matching`, `// Abandonment`, `// Money`, `// Access`, `// Fail-closed interlock`, `// PRD gate`, `// Money corrections`, `// Work signals`, `// Completion`, `// Provisioning and Lovable`). Pure banners. Kill all.
8. `supabase/functions/_shared/notification-taxonomy.ts` — the three `/* ---- ... */` section dividers (before "the class channel rule", "the documented defaults", "refused at construction"). Banners. Kill.
9. `supabase/functions/_shared/notifications.ts:618-642` — the module header ("THE SUBSYSTEM HAS ONE IMPLEMENTATION AND TWO BINDINGS...", "DECIDING IS SEPARATED FROM WRITING...", "THE BRAND ON WriteSet IS..."). Architecture narration about our own design. Kill.
10. `supabase/functions/_shared/notifications.ts` — comment above `NOTIFICATION_COMPONENTS` ("Which files each declared component owns, as path prefixes..."). Restates the type; the real contract is enforced by `_source-scan.ts`, not the prose. Kill.
11. `supabase/functions/_shared/notifications.ts` — inline `// In-app never reaches the provider. There is no provider in the path of an in-app notification, and AT-016.05 reads the provider's own record to check exactly that.` Product code leaning on test knowledge. Kill.
12. `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql:1064-1099` — the file header ("WHAT THIS FILE LANDS", "WHY THE WRITE IS ONE FUNCTION", "WHO CAN CALL WHAT", "THE ONE EXCEPTION TO..."). Our own design narration, duplicated by the `comment on table/function` statements that follow. Kill.
13. Same file — `-- One row per wire name. The shape check pins the...` above `notification_event_types`. Duplicates the `comment on table` right below it. Kill.
14. Same file — `-- \`recipients\` is the resolution frozen at creation (AT-016.10)...` above `notification_events`. Duplicates the table comment. Kill.
15. Same file — `-- Two unique constraints, on purpose. The pair is what the acceptance tests count...` above `notification_deliveries`. Duplicates the table comment. Kill.
16. Same file — `-- The write set arrives whole. \`event.recipients\`...` above `emit_notification`. Duplicates the function comment. Kill.
17. Same file — `-- One worker pass, applied as one unit...` above `apply_delivery_results`. Duplicates the function comment. Kill.
18. `supabase/migrations/20260913121000_notification_fixture_producers.sql:1376-1392` — the file header. Design narration, duplicated by the `comment on table/function` statements. Kill.
19. Same file — the three inline step banners `-- (1) THE TRANSITION COMMITS FIRST.`, `-- (2) THE FAULT POINT...`, `-- (3) THE EVENT WRITE...` inside `fixture_commit_transition_and_emit`. Numbered narration over three lines of code that are already in that order. Kill.
20. `tests/at/suites/req-016/_fault-switch.ts:1692-1710` — the file header. Explains the two-binding design in general; only the "arming writes nothing into the ledger" clause names a specific false-green (see Skips). The rest ("each arming opens a LEDGER of the binding's choosing", "the kinds a point implements are an argument of the switch") is design narration. Kill the general design prose; the false-green clause survives.
21. `tests/at/suites/req-016/_fixture.ts` — the header's changelog sentences: "THIS FILE IS NO LONGER A SECOND IMPLEMENTATION. It used to be a conforming stand-in..." and, further down, phrasing that describes what a field "used to" do. This is commit-message material (what changed and why), not a statement of what the code does now. Kill the "used to be" / history clauses; the "WHAT A LOOP GREEN MEANS NOW" contract statement survives.

## MUST KILL flags

1. **`notification-provider.ts`, the file itself (its header's "documented exception" paragraph).** The claim "this is the one file allowed to hold a send path" is already enforced mechanically by `_source-scan.ts`'s `providerClientImporters()`. `MUST KILL`: stop asserting the boundary in prose; let the oracle be the only statement of the rule, and drop the file header down to the protocol-fact paragraph.
2. **`WriteSet` in `notifications.ts`.** The unexported `WRITE_SET` brand symbol and its surrounding paragraph exist to explain, in words, that only `prepareWriteSet` can construct one. `MUST KILL`: the brand already makes this true at the type level; the explanation of *why* a brand was chosn belongs in a design note or PR description, not a paragraph beside the symbol every reader of this file must pass.
3. **`assertTaxonomyIsLegal` in `notification-taxonomy.ts`.** The function name and its own thrown error messages already say what it does ("registers X twice", "binds to channels that break its class rule"). `MUST KILL`: the surrounding "REFUSED AT CONSTRUCTION" banner and the "unconstructable rather than caught by a test later" sentence in the module header are redundant with the function's own name and error text.

## Skips

1. `supabase/config.toml:20-43` (the `[analytics] enabled = false` block) — crawls away under the external-platform exception: Docker Desktop's TCP-daemon requirement, the resulting `vector` crash loop, and the address churn that gives Kong a stale auth address are vendor/platform behavior this tree cannot reshape, and the claim carries a measured reproduction (2026-09-08 Kong log line, `docker inspect` address).
2. `tests/at/harness/local-stack.ts:1638-1649` (`DISABLED_SERVICES` comment) — same external-platform fact, restated for the code that reads it. Kept, though the duplication with #1 above is worth the lead's attention; not a comment-content problem so it is not listed as a kill.
3. `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`, the `-- A sequence, not a table, because \`nextval\` is outside transactional control...` comment on `notification_fault_triggers` — the exact external-database fact the task brief names as a keep example. Skip.
4. `tests/at/suites/req-016/_live.ts`, the `sharedSql` comment ("ONE SQL CLIENT PER PROCESS... 27 sessions at idle with one client, 73 with six... left the auth service no slot to check an email with") — measured Postgres/Supabase connection-pool exhaustion, external platform, non-obvious, cited with numbers. Skip.
5. `tests/at/suites/req-016/_live.ts`, the `provisionAccount` comment ("The admin API with `email_confirm: true` sends no mail, so provisioning never touches the auth service's per-hour mail limit") — external Supabase Auth API behavior. Skip.
6. Every comment across `_integration.ts`, `_live.ts`, `_mail-witness.ts`, `_provider-faults.ts`, `_source-scan.ts`, `_fault-switch.ts`'s `arm()` inline comment, and the four `*.test.ts` bodies that names the exact false-green an assertion or oracle is built to catch (e.g. "a rogue direct sender can omit itself and stamp the emitter's name", "a handle that counted 'armed' as 'fired' would green every atomicity test", "the two witnesses... disagree... so one of them counted a reach the other never saw", "an implementation ignoring its configuration would pass this test"). These crawl away under the acceptance-test-purpose exception the task brief names explicitly. This category covers roughly 25 of the ~150 comments judged.
