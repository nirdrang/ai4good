# Unit 4 report: the evidence rule, metadata only and no implied document review

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

## What landed

No product change. The closed evidence vocabulary, the metadata coupling check, and the unknown-key refusal already sit in the table, the definer, and `decideOrganizationVetting`. This unit proves them.

AT-002.16, AT-002.17 and AT-002.18 are green at both tiers. No other id moved.

The organisation adapters now back three read members the sweep needs: `organizationDashboard`, `createProjectAsOperator`, and `publicProjectPage`. The loop adapter delegates to the accounts fixture. The live adapter calls the deployed dashboard and public-project functions, and inserts a project as the operator.

## AT-002.16

The body runs `documentContentSinks()` first, then opens a world.

A complete emailed-registration vet that also carries `documentContent`, `content`, `attachment`, `storageKey`, `downloadPath` or `fileBytes` is refused as `invalid-request`. Nothing is written. After a successful metadata-only vet, a later content-carrying request is refused the same way and the stored row does not change.

A successful metadata-only vet stores `evidenceType` `emailed_registration_documents` and a `registration` object whose keys are exactly `registrationReceivedAt`, `registrationDocumentCount` and `registrationCopiesDeleted`. The aggregate and the audit snapshot have no content, storage-key, download-path or attachment field.

Correction C5 is stated on the test, on the source oracle, and already on the SQL check: rejecting attachments and storing only metadata cannot prove a document was deleted from the founder's mailbox. `registrationCopiesDeleted` is an attestation. The body does not assert mailbox deletion.

## AT-002.17

Four identity tokens go through both arms: `passport`, `national_identity_card`, `driving_licence`, and `identity-card scan`.

The decision module refuses each as `invalid-evidence` with status 400. No aggregate row, no audit row, and no `vetting.outcome` event exist afterwards.

The database arm uses `attemptVettingRowAsOperator`, the same operator insert AT-002.11b uses. Each identity token is refused by check constraint `org_vetting_evidence_type`. Nothing is written.

## AT-002.18

A vet with `public_registry`, then `organization_website`, then `ein` stores exactly the submitted token on the aggregate and on the latest audit snapshot. The type is not normalised, not mapped, and not widened. `registration` stays null.

After those vets, the organisation dashboard and the public project page are read. Neither body carries a key or a string that implies a document review. The comment on the test says the sweep covers those two surfaces, which are the surfaces this tree has.

## The structural absence oracle

`documentContentSinks()` in `tests/at/suites/req-002/_source-scan.ts` is a suite-local source oracle. It throws when it cannot read product source, migrations, route folders or ui routes. Empty is the assertion. The harness selftest drives injected failures so the oracle can fail.

It reports:

- a SQL column typed `bytea`
- a SQL column named as a content sink (`document_content`, `storage_key`, `download_path`, `attachment`, and the rest of that closed list)
- a route folder, write-route name, rpc, ui route, or product path named as a document download or upload
- `storage.from`, `createBucket` or `createSignedUrl` in product TypeScript
- an `application/pdf` or `application/octet-stream` content type in product TypeScript

It does not report:

- document bytes stuffed into `jsonb` or `text` (`note`, `audit_events.detail`, a random payload)
- a download screen with an innocent name
- copies that remain in the founder's mailbox
- a storage backend that does not use those three call shapes

`registration_document_count` and the closed evidence token `emailed_registration_documents` are not sinks. The refusal sentence in `org-vetting.ts` that names "document content" is not a route.

## The nine commands

Run in the worktree. Exact exit status of each:

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`, `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:selftest` — `Test Files 20 passed (20)`, `Tests 321 passed (321)`, exit 0.
4. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 9 green, 18 red, 0 missing`, matches the declaration, exit 0.
5. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`, exit 0.
6. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.
7. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 9 green, 18 red, 0 missing`, matches the declaration, exit 0.
8. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`, matches the declaration, exit 0.
9. `bun run at:verify req-016 --tier integration --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.

## Where the design of record was not followed, and why

- No change to the vetting table, its constraints, the definer, or the decision module. The unknown-key refusal is `invalid-request`, which is what the shipped module already returns. The body asserts that kind rather than inventing `invalid-evidence` for an extra key.
- The loop adapter maps a req-002 session to the accounts fixture session through `heldSessions`, because the accounts `Session` type requires `provider` and the organisation `Session` type does not.

## Least sure

Whether a reviewer would rather see extra document-content keys refused as `invalid-evidence`. That would be a product change. The existing unknown-key door already refuses them and writes nothing, which is the criterion.
