# Project need intake (start, autosave, attach, submit, snapshot)

An NGO admin describes a project's need: a title, a problem description, an urgency, and
optional reference files. The need starts as a draft, autosaves as the admin types, and moves to
Discovery only when a description is present. Once submitted, a permanent audit snapshot of the
submitted text and files is kept, even as the admin keeps editing afterward.

## Sub-features

- NGO admin caller, `start`: a new project and its need row are created together, in the
  `draft` stage, with no description and the base file-disclosure notice.
- NGO admin caller, `save`: a partial patch (title, description, urgency) is applied; an
  identical save is a no-op (`changed: false`, the same `updatedAt`); whitespace-only text
  collapses to `null`.
- NGO admin caller, `attach`: one reference-file entry (name, media type, byte size,
  description) is appended, stamped with the adding account's id.
- NGO admin caller, `submit`: refused as `missing-description` while the description is empty;
  once present, moves the need to `discovery_in_progress`, stamps `submittedAt`, and writes one
  `audit_events` row (`event_kind = 'need_intake_submitted'`) holding a snapshot of the title,
  description, urgency and reference files at that moment. A second submit is a no-op and the
  audit table still holds exactly one row for the project. Edits made after submission change the
  live need but never the audit snapshot.
- File-disclosure level: `base` until the operator classifies the project Tier 2
  (`need_intakes.tier2_classified_at`), then `tier2-hardened` — the disclosure text and the
  required acknowledgment text both come from `REFERENCE_FILE_DISCLOSURE` in
  `supabase/functions/_shared/need-intake-copy.ts`. The classification is monotonic: clearing or
  rewriting `tier2_classified_at` is refused by a database trigger (SQLSTATE `42501`).
- Read-only caller, `need-intake`: any signed-in caller with standing reads the need back by
  project id; an unauthenticated call is refused with 401.
- Public project page: a project with an intake — draft or submitted — is never public. It
  stays 404 on `public-project` regardless of stage, until a separate publication rule (owned by
  another requirement) says otherwise.
- Refusals: a caller with no matching need in its own organisation (a different NGO's project,
  or a stale project id) is refused `no-such-need`; a malformed field (for example a project id
  that is not a uuid) is refused `invalid-request`.

## How to get to it (user POV)

A signed-in, completed NGO admin starts a need for one of their organisation's projects, types
into the description as Discovery reads it back, attaches sample files, and submits when ready.
The API is two edge functions: `project-need` (the four actions above) and `need-intake` (the
read).

## Driving it with the HTTP harness

`POST {API}/functions/v1/project-need`, headers `Authorization: Bearer <access_token>` and
`apikey: <ANON_KEY>`, body `{"organizationId", "action": "start"|"save"|"attach"|"submit", ...}`:

- `start`: `{organizationId, action: "start", title, description?, urgency?}` → 200, a new
  `need` in `draft`.
- `save`: `{organizationId, action: "save", projectId, patch: {title?, description?, urgency?}}`
  → 200, `changed` true or false.
- `attach`: `{organizationId, action: "attach", projectId, file: {fileName, mediaType,
  byteSize, description?}}` → 200, one more entry in `need.referenceFiles`.
- `submit`: `{organizationId, action: "submit", projectId}` → 200 once a description exists, or
  409 `missing-description` before that.

`POST {API}/functions/v1/need-intake`, headers as above, body `{"projectId"}` → 200 with the
same `need` shape as `project-need`'s response, or 401 with no bearer.

`POST {API}/functions/v1/public-project`, no auth required, body `{"projectId"}` → 404 for any
project carrying a need, `{level not public}`.

Readback: `public.need_intakes` joined to `public.projects` for the title, and
`public.audit_events` where `event_kind = 'need_intake_submitted' and detail->>'project_id' =
<id>` for the submission snapshot.

## What proves it

The response pair for each action, the `need_intakes` row after each write, and — for
submission — the single `audit_events` row whose `detail` matches the description and reference
files at the moment of submit, unchanged by any later edit.

## Gotchas

- `description` is kept verbatim, leading/trailing whitespace and line breaks included; only an
  all-whitespace string collapses to `null`, which is what the submission gate checks.
- The Tier-2 classification is set directly over SQL in this drive (`update ... set
  tier2_classified_at = now()`), because the classifier is a separate, unbuilt operator surface —
  see `create-organization.md`'s note on driving what the surface can produce itself; here no
  surface exists yet, so a direct SQL write is the only way to reach the state.
- `public-project` answers the same 404 whether the project does not exist or simply is not
  public; the drive cannot and should not try to tell the two apart.
