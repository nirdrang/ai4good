# Read and resume a Discovery conversation

An NGO member returns to a project and reads its conversation and today's allowance together.
Send `POST /functions/v1/discovery-conversation` with the member's token and `{ projectId }`.
Expect 200 with
`{ ok: true, conversation: { projectId, turns, elicitation, scopes, scope }, allowance }`.
Turns include open, settled, failed and abandoned rows in sequence order. Each turn also
carries `billing` (`free`, `fuel` or `retry`), `offTopic`, and the reserved and actual cost
and token counts in camelCase; compare them field by field with the operator read, because
the view drops some columns. Elicitation is the latest non-null record. `scopes` is every
scope version in order, and `scope` is the `current` one or null (`discovery-scope.md`).
`allowance` is null on a 200 when the allowance read fails, for example for a platform
admin who is not a member. Reads do not reserve or spend credits.

This route is a read, not a write route. The write gate in `README.md` does not run: no
standing read, no `account-deactivated`, no `no-account`, no account-type check. Row-level
security on the project read is the only gate.

Send three turns, sign in again, and read the conversation with the new session. Compare
every turn against the operator read of `discovery_turns`. After a UTC reset, the turns
remain and the allowance shows the new day. Send another message and verify its context
contains the prior user and assistant messages. Without a provider key, seed settled rows
as operator, read through the deployed function, and reserve as operator to inspect context;
settle that reservation failed afterwards.

Read without authentication, with another NGO's token, and with an unknown project id.
Expect 401 for missing authentication and the same tenant 404 for invisible and nonexistent
projects. A malformed id is 400, a non-POST request is 405, and a failed project, turns or
scopes read is 502. `scripts/drive-discovery-refusals.ts` proves the empty read and the 404.
The allowance viewer RPC runs with the caller's JWT, checks organisation membership and
writes nothing. Check spend before and after a read, including a day with no spend row.
