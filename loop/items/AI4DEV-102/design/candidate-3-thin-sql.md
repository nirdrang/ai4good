The design is at `loop/items/AI4DEV-102/design/candidate-3-thin-sql.md`.

Direction three holds: three current-state tables, rules in TypeScript, SQL that only persists. Two breaks are named in the document and are not hidden.

**Data.** `org_profiles` (mission, country, website, logo), `org_trust` (`unverified` | `vetted`), `org_discovery_allowance` (UTC `grant_day` + `spent`). Name stays on `organizations`. A fourth table, `org_vetting_actions`, holds the vet with every mandated column `NOT NULL`, because jsonb on `audit_events` cannot refuse a partial commit, and unverified orgs have no evidence to store on the trust row.

**Allowance.** Remaining is `grantFor(status) - spentOn(row, today)`. A mid-day vet does not touch spent, so remaining becomes 30 − k. A re-vet does not mint. Integration proves the UTC reset by writing yesterday into `grant_day`; it does not move the clock. The numbers 10 and 30 live in `discovery-allowance.ts` and are checked against at-config; they do not appear in SQL or in test bodies.

**Vet path.** One platform-admin route, `set-organization-trust`. `decideOrganizationTrust` calls `prepareWriteSet`. The definer inserts the action row, updates trust, appends the audit row, and calls `emit_notification` in one transaction. Vet and unvet stay one taxonomy event, `vetting.outcome`, with `outcome` in params. The public project page is unchanged, so AT-001.22’s key set stays closed. The label `founder-vetted` appears only on the authenticated profile read.

**Red set.** Same five as the lead, at both tiers: AT-002.10 and AT-002.31 (`checkout.project-fuel`), AT-002.19 and AT-002.20 (`publish.flow`), AT-002.26 (`checkout.project-fuel` and `discovery.funded-turn`). AT-002.23 and AT-002.22 stay green. The `discovery-message` stand-in is not replaced; this run ships the debit contract that route will consult.

**Weakest point.** The notification write set is built in `decide` from the seat email on `write_standing`, then passed into SQL as jsonb. A shape drift between `prepareWriteSet` and `emit_notification` would type-check and fail only at integration. Req-001 must also grow `attemptWrite` for the two new write routes, or AT-001.29 fails.