# The lead's rulings on the comment audit

The audit (`comment-audit.md`) names 152 deletions, 27 keeps and 4 MUST KILL flags over comments this branch added. The ruling below is what the comment pass applies. Everything the audit marks DELETE is deleted, except the entries under "Kept, trimmed to one sentence"; every KEEP stands; the four MUST KILL flags are ruled one by one.

## Kept, trimmed to one sentence (a non-obvious why the code cannot show)

Each survives as ONE plain sentence, no acceptance id, no ruling number, no restatement of the code beneath it.

- `supabase/functions/_shared/write-routes.ts`, on `WriteStanding`: "`unreadable` is a third state: a read that did not happen is not a judgement about the caller."
- `supabase/functions/_shared/write-routes.ts`, on `writeGateDecision`: "Deactivation is judged before type and before presence, so a deactivated caller is told it is deactivated and nothing else."
- `supabase/functions/_shared/edge.ts`, on `callDatabaseFunction`: "Not exported: a route reaches the database only through `writeRoute`."
- `supabase/functions/_shared/edge.ts`, inside `writeRoute` at the UUID check: "A malformed id is refused here, because PostgREST would fail the cast and answer like an outage."
- `supabase/migrations/20260908120000_...sql`, in `assert_account_active`: "`for share`: a write in flight blocks a concurrent deactivation, and a write that arrives during one reads the committed state." and "A missing account is not a lifecycle refusal; the calling function answers for it."
- `supabase/migrations/20260908120000_...sql`, on the append-only triggers: "The owner can drop these triggers; no object protects against its owner." and "TRUNCATE takes a statement trigger; a row trigger never sees it."
- `supabase/migrations/20260908120000_...sql`, on the two recreated writers: "The revoke and the grant are restated because a recreate once dropped a grant in this tree."
- `supabase/migrations/20260910120000_...sql`, header: "`complete_signup` and `create_organization` set `app.actor_account_id` before their membership insert; a path that sets none records the operator." (Rewritten after the interrogate fix that sets the actor on those two definers.)
- Every `_fixture.ts` mirror keeps its first sentence only: "The mirror of `public.<object>`; the live adapter is the oracle."
- Every new module or migration keeps at most a one-sentence header saying what the file holds, with no rationale, no id, no ruling.
- `tests/at/suites/req-001/_pending.ts`: the header's count sentence is rewritten to the current count in one sentence; the changelog list of landed leaves is deleted as the audit says.

## MUST KILL flags

1. `decideSignupCompletion`, the conditional spread of the four `p_github_*` arguments: ACCEPTED. Extract `githubArguments(handle, stats)` returning `{}` or the four fields; the paragraph goes.
2. `decideSignupCompletion`, the caller fact: ACCEPTED. Bind `const verifiedGithubHandle = input.caller.githubHandle;` at the point of use and pass it; the comment goes.
3. `writeGateDecision` as an array of named guards: DECLINED. Five ordered `if` statements are the legible form; an array of guard functions adds a layer to save one sentence. The one-sentence why above stays.
4. `assert_account_active`'s `for share` in a named wrapper: DECLINED. The lock is one clause of one statement; a wrapper function would state the same thing farther from the read. The one-sentence why above stays.

## Out of scope

The audit's skips stand. Comments in unchanged lines are not touched.
