## Why

Six tables carry row-level security with zero policies, so today no client key reads any tenant row and no rule says who may. The authentication requirement's visibility line says an organisation's data is visible to its own account, the assigned volunteer and the platform admin, and to nobody else. This change lands that rule as the SQL policy set, makes every read reach the database as the caller, and proves four of the five acceptance ids at both harness tiers. The fifth, the logged-out visitor's redirect to sign-in, names a screen this tree does not have; the founder ruled it stays red with a declared shape until the auth-screens leaf lands the screen.

The shape follows a four-model critique of the tree and a four-candidate design arena. The critique's binding conclusion: a tenant rule stated twice, once in SQL for direct probing and once in TypeScript for the edge functions, drifts with nothing able to notice. So there is one rule, in SQL, and the edge functions forward the caller's own token instead of reading with the service role.

## Scope

Two units, each green on its own before the next started.

**Unit one, cross-organisation denial with no existence oracle** (AT-001.21, AT-001.22). Migration `20260906120000_tenant_read_posture_and_org_member_policies.sql` states the client privilege posture in one paragraph, revokes every leftover client grant, grants `SELECT` to `authenticated` on the four tenant tables, adds `viewer_is_org_member`, four policies, the definer RPC `read_public_project` and two indexes. `supabase/functions/_shared/tenant-reads.ts` holds the two refusal constants and the pure cores `organizationDashboard` and `projectWorkspace`; `public-project.ts` holds `projectIsPublic`, the field-by-field projection and `publicProjectAnswer`. `edge.ts` gains `callerReads` (Data API reads as the caller) and `publicProjectReads` (the one service-role call, to the RPC). Three functions ship: `organization-dashboard`, `project-workspace`, `public-project`, the last with `verify_jwt = false`. The harness gains `restGet` and `functionPostRaw`, viewer-shaped `AccountsSut` members named apart from the operator reads, `freshAccessToken` and `viewerRead` in the live adapter, the static catalog scan `_policy-scan.ts`, two selftests, and the bodies and manifest rows for the two ids.

**Unit two, assigned-volunteer scope, platform-admin reach, the logged-out visitor** (AT-001.23, AT-001.40, AT-001.24). Migration `20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql` adds the seat trigger, `viewer_is_platform_admin`, `viewer_is_volunteer`, the assigned-volunteer policy and four platform-admin policies. `AssignVolunteerOutcome` gains `not-a-volunteer-account`. Bodies and manifest rows for the three ids; AT-001.24 declared `capability-pending` on `ui.authenticated-surface-rendering` at both tiers.

**Review fixes**, after a four-model review of the diff. The static catalog scan became symmetric: it models every weakening statement (drop or alter policy, disable or force row level security, drop table or function, `grant all`, grants to `public`, default privileges), checks exact privilege sets per role, and refuses a policy to `anon`, `for all`, or with a tautological `using`. Every refusal has a selftest in the negative direction. The live catalog check walks the facts both ways, reads force-RLS and the exact privilege set of every role on every table and definer function. The service role's default privileges on the six tables are revoked and only the two `SELECT`s the write functions need are re-granted. The public-page leak assertion reads the response bytes. A regression test retypes a seated volunteer and asserts the read is denied. The two seat-refusal sentences are disjoint. A viewer row the parser cannot map fails loudly. Duplicated helpers collapsed; the viewer reads moved to `_live-tenant-reads.ts`; the integration bodies reach the stack through the contract only. The grok wrapper fires only when the kernel lacks Landlock, and has a README. Stale posture comments in two earlier bodies and the source-scan header are corrected.

Out: anything under `src/`, a route registry or classifier, a visibility column on `projects`, changes to the three write functions.

## Tradeoffs

- One rule in SQL means the loop tier grades shipped orchestration, refusal constants and projections, and the integration tier alone grades the policies. The loop fixture holds no policy mirror; the four viewer-shaped harness reads throw `CapabilityPending` there and no loop body calls them.
- The public page reads through a definer RPC as the service role, because `anon` holds nothing on any table and a logged-out visitor has no token to read as. The RPC returns three fields and the page applies one eligibility predicate, true for every row today, where the publication requirement will put its rule.
- The seat invariant is stated twice on purpose: the trigger guards the write, the policy's type conjunct guards a read after the account's type changed.
- Reads answer 404 with one constant for "not yours" and "no such row"; writes keep their 403. A read denial must not say something exists.
- The durable guard is a text scan over the migrations, because CI runs the loop tier only. The live catalog check at integration is the semantic oracle.
- The `select, insert` grant on `accounts` to `authenticated` is gone; it served a superseded proof and no body pins its message.
- The green is over organisations, memberships, acknowledgments and a project's identity plus assignee. Drafts, ledger, files, thread, dashboard pages and tasks do not exist yet; the bodies say so.
- Proving denial and scoped access against surfaces that do not exist: the ids are proved over the tenant rows that do exist, and a later table joins the policy set or fails the catalog scan in CI.

## Blast Radius

Every client-key read of the six tables changes: from a privilege denial to a policy-filtered answer on four tables, and to a privilege denial that is now stated rather than inherited on two. The three existing write functions are untouched and their service-role lookups still work. The operator connection is unaffected. `anon` still reaches no table, so the existing AT-001.17 arm stays true. A later migration that adds a `public` table without a catalog line fails the build.

## Verification

(filled from the gate runs on the final head: typecheck, at:check, at:selftest, loop req-001 and req-016 with the manifest, integration req-001 with the manifest, and the verify drive; each with its command, outcome and timestamp)

## Not done here

- The authenticated screens, the sign-in route and a browser driver, which turn AT-001.24 green (the auth-screens leaf).
- Moving the two write functions' lookups off the service role.
- The isolation matrix each later resource must join: rightful NGO, assigned volunteer where applicable, platform admin, foreign NGO, unassigned volunteer, absent id, logged-out visitor. A documentation change with its own ritual.
- The account type as a token claim through a custom access token hook, for listing scale.
- Project publication and lifecycle, which own `projectIsPublic`.
- Storage object policies and external task reads, outside the table catalog.
- The front-end note `src/lib/api/example.functions.ts` that tells Lovable to use server functions instead of edge functions; this pull request cannot touch `src/`.
- The stale sentence in the earlier proof script under `loop/items/` that asserted the row-level-security message on a client-key insert into `accounts`.
- A session-start check that Grok's sandbox can start on this kernel, so the banner stops reading "logged in" as "works".
