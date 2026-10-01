# Discovery scope (generate, remove a cause label, regenerate)

An NGO organisation admin turns a finished Discovery conversation into a technical scope. The
model writes a structured contract, rendered as markdown: the summary, user stories, stack,
complexity, risk flags, data tier, maintainability fit, up to three cause labels, a Lovable
recommendation and a build split. The scope spends no allowance credits. Decision d94 moves the
technical scope to the PRD step in a later item; until that item lands, this route ships.

## Sub-features

- `generate`: needs a need in `discovery_in_progress` and a latest elicitation with `complete`
  true (`discovery-message` records it through `record_elicitation`). It needs the provider
  credential. The new row is version 1, `current`, and its cause labels are copied to
  `need_intakes.cause_labels`. The reply is `{ok, changed, scope, scopes, need, escalated}`.
- `remove-label {label}`: no model call. The label is canonicalised (trim, lower case, collapse
  spaces) and removed from `need_intakes.cause_labels`. 200 `changed: true` when it was there,
  200 `changed: false` when it was not. The scope row's own labels do not change.
- `regenerate {reason}`: needs a `current` scope and a reason. It writes version N+1 as
  `generating` and gives the model the previous contract and the reason. On success the old row
  becomes `superseded`, the new one `current`, and the need's labels are replaced.
- The bound: after three successful regenerations, the next `regenerate` writes no contract. It
  inserts an `escalated` row and emits `discovery.regeneration_exhausted` by email and in-app to
  every active platform admin, and answers 200 `escalated: true, changed: true`. Once an
  `escalated` row exists, the next call answers 200 `escalated: true, changed: false` with no new
  row or notice.
- Model output is strict: exact keys, at most three labels of at most 40 characters each after
  canonicalising. A money check fails the scope when the model's own text names a price, cost,
  budget, estimate, dollars or USD. Only the fixed maintenance sentence and the Lovable pricing
  URL are allowed.
- The read side: `discovery-conversation` returns `conversation.scopes` and `conversation.scope`.
- The need stays in `discovery_in_progress`.

## How to get to it (user POV)

After the interview is complete, the NGO admin asks for the scope, removes a cause label they
do not want, or asks for a new version with a reason. The API is the `discovery-scope` edge
function, called with the NGO admin's token. No screen calls it yet.

## Driving it with the HTTP harness

`POST {API}/functions/v1/discovery-scope`, headers `Authorization: Bearer <ngo access_token>`
and `apikey: <ANON_KEY>`, body `{organizationId, projectId, action}`, plus `label` for
`remove-label` and `reason` for `regenerate`. Any other field is refused.

Refusals, after the common write gate (`README.md`):

- 400 `invalid-request`: no `organizationId`, a non-uuid `projectId`, an unknown field, an empty
  label, an empty reason or one over 4000 characters, or an action that is not one of the three.
- 409 `no-such-organisation`; 403 `not-a-member` or `not-an-admin`.
- From the begin function, all 409: `discovery-disabled`, `email-unverified`, `no-such-project`,
  `need-not-in-discovery`, `elicitation-incomplete` (`generate` only), `generation-in-flight` (a
  `generating` row younger than 150 seconds), `scope-already-generated` (`generate` when a
  `current` or `superseded` row exists), `scope-not-generated` (`regenerate` with no `current`
  scope).
- From the commit function: 409 `scope-not-open` for a stale or double settle.
- A provider failure is 502 `{ok: false, reason}` with no `kind`, and the row becomes `failed`.
  The reasons are a model refusal, no valid scope recorded, the first money problem found, or
  the port error. A later `generate` reopens that failed row under a fresh id. A `generating`
  row older than 150 seconds is marked `failed` and reopened.

Readback over `DB_URL`:

```sql
select id, version, status, reason, cause_labels, served_model, opened_at, settled_at
  from public.discovery_scopes where project_id = '<projectId>' order by version;
select cause_labels from public.need_intakes where project_id = '<projectId>';
select label, first_project_id from public.cause_labels;
```

`cause_labels` has no grant for any API key. Read it over `DB_URL`. `discovery_spend` must not
change.

## What proves it

Without the provider credential, `scripts/drive-discovery-refusals.ts` proves
`elicitation-incomplete`, `scope-not-generated`, the `remove-label` pass-through
(`changed: false`), an unknown action as `invalid-request`, `discovery-disabled`, and no
`discovery_scopes` row written. With the credential, drive a conversation to a complete
elicitation, then `generate` (version 1 `current`), `generate` again (409
`scope-already-generated`), `remove-label` twice (`changed: true`, then `false`), and
`regenerate` four times to reach the `escalated` row and the platform-admin notice. No shipped
drive covers the credential path yet.

## Gotchas

- Two partial unique indexes allow one `current` and one `generating` row per project.
- An `escalated` row has no contract and no markdown.
- The money check reads the model's text, not the stored copy, so a fixture that names a price
  fails as a provider failure (502), not as a 400.
