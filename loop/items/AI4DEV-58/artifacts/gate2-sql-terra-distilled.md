SOURCE   loop/items/AI4DEV-58/artifacts/gate2-sql-terra-raw.txt
REVIEWER gpt-5.6-terra (gate 2, draft code review, slice A: SQL and config)
COUNT    5 → 5
NOTES    none

[1] severity: high   supabase/migrations/20260809090000_volunteer_github_link_and_imported_profile.sql:57
    claim: "The "populated" checks accept semantically empty data: `ARRAY[NULL]`/`ARRAY['']` count as languages, and a tab-only summary survives `btrim`."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-58/artifacts/gate2-sql-terra-raw.txt:3-6

[2] severity: medium   supabase/migrations/20260809090000_volunteer_github_link_and_imported_profile.sql:200
    claim: "A service-role caller that passes the identity check can forge arbitrary nonempty profile statistics instead of the declared `stubGithubStatsFor` output."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-58/artifacts/gate2-sql-terra-raw.txt:8-11

[3] severity: high (outside schema: test meaning)   tests/at/suites/req-001/_fixture.ts:196
    claim: "The new acceptance tests inject `authUser.githubHandle` directly into `validateCompleteSignup` and never execute `extractGithubHandle`."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-58/artifacts/gate2-sql-terra-raw.txt:13-16

[4] severity: high (deployment compatibility)   supabase/migrations/20260809090000_volunteer_github_link_and_imported_profile.sql:84
    claim: "Dropping the five-argument RPC and replacing it with a nine-argument RPC has no compatibility bridge, while updating the edge function in the same source change does not make cross-plane deployment atomic."
    unverified-runtime-claim: yes
    verify-first: "Demonstrate an atomic schema-plus-function deployment, or stage both deployment orders while issuing NGO and volunteer completion requests."
    raw: loop/items/AI4DEV-58/artifacts/gate2-sql-terra-raw.txt:18-22

[5] severity: low   supabase/migrations/20260809090000_volunteer_github_link_and_imported_profile.sql:308
    claim: "The claimed no-table-grants/sole-write-path posture is contradicted by the committed replay capture, which records `TRUNCATE`, `TRIGGER`, and `REFERENCES` privileges for `service_role`, with no revoke here."
    unverified-runtime-claim: yes
    verify-first: "On the deployment target, check `has_table_privilege` for those privileges and establish whether any service-role SQL-capable path exists; revoke them if it does."
    raw: loop/items/AI4DEV-58/artifacts/gate2-sql-terra-raw.txt:24-28
