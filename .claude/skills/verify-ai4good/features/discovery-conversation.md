# Read and resume a Discovery conversation

An NGO member returns to a project and reads its conversation and today's allowance together.
Send `POST /functions/v1/discovery-conversation` with the member's token and `{ projectId }`.
Expect 200 with `{ ok: true, conversation: { projectId, turns, elicitation }, allowance }`.
Turns include open, settled, failed and abandoned rows in sequence order. Elicitation is
the latest non-null record. Reads do not reserve or spend credits.

Send three turns, sign in again, and read the conversation with the new session. Compare
every turn against the operator read of `discovery_turns`. After a UTC reset, the turns
remain and the allowance shows the new day. Send another message and verify its context
contains the prior user and assistant messages. Without a provider key, seed settled rows
as operator, read through the deployed function, and reserve as operator to inspect context;
settle that reservation failed afterwards.

Read without authentication, with another NGO's token, and with an unknown project id.
Expect 401 for missing authentication and the same tenant 404 for invisible and nonexistent
projects. A malformed id is 400, a non-POST request is 405, and a failed backend read is 502.
The allowance viewer RPC runs with the caller's JWT, checks organisation membership and
writes nothing. Check spend before and after a read, including a day with no spend row.
