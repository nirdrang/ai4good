# Candidate design: the smallest change that works (Opus lane)

Direction: one `discovery_briefs` row per project. The row holds the current brief as JSONB and the
revision as an integer column. A security-definer function updates the row in place under a row
lock. A confirmations table sits beside it. The design reuses `discovery_turns`, the
reserve-and-settle functions and the `writeRoute` pipeline wherever they fit.

## Problem

The phase 2 screen talks to one port with nine members. The backend serves one of them on the
wrong contract and three only in part. The brief, its revision, the confirmation, file storage
and file reads do not exist. The fixture world (`design/astra/src/fixture-world.ts`) already
defines every rule the server must reproduce: revision bumps, dependent topics marked for review,
`stale-revision`, finish that is idempotent per revision, the three-file limit, and
`mode-changed`. These constraints decide the shape:

- `src/components/discovery/` and the screen tests stay unchanged, except where the founder's
  usage ruling removes the beta counter.
- The hook reads only `data-brief` and `data-usage` from the stream. It adds a new file row only
  when `subscribe` delivers it. It discards the return value of `addFile`. It takes the person
  lines that an edit writes only from `ServerChange.transcript`.
- `discovery_turns` has check constraints that set token-priced credits. The founder's ruling is
  one credit per turn, so those constraints must change.
- Edge functions cannot import from `src/`. No file does that today.
- `writeRoute` maps one route to one RPC. An optional reserve, act and settle step already follows
  the RPC.
- The screen tests assert scripted model text: "38 of your 45 volunteers", "From the chat,
  round 5" and the ready sentence. A real model cannot produce that text on demand. Open
  question 1 covers this.

## Usage (caller's view)

**Route** (`src/routes/discovery/$organizationId.$projectId.tsx`). The route signs the user in,
builds one port per project and mounts the phase 2 components. It copies no code from Astra.

```tsx
export const Route = createFileRoute("/discovery/$organizationId/$projectId")({
  ssr: false,
  validateSearch: (s): { view?: "review" } => (s.view === "review" ? { view: "review" } : {}),
  component: DiscoveryPage,
});

function DiscoveryPage() {
  const { organizationId, projectId } = Route.useParams();
  const { view } = Route.useSearch();
  const navigate = Route.useNavigate();
  const session = useSession();                       // the existing sign-in form when signed out
  const port = useMemo(() => createDiscoveryPort({ organizationId, projectId }), [organizationId, projectId]);
  useEffect(() => () => port.close(), [port]);        // stops polling
  const [returnFocus, setReturnFocus] = useState<{ questionId: string; nonce: number } | null>(null);
  if (session !== "signed-in") return session === "signed-out" ? <SignInForm /> : null;
  return (
    <>
      <div hidden={view === "review"} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DiscoveryScreen port={port} active={view !== "review"} returnFocus={returnFocus}
          onOpenReview={() => navigate({ search: { view: "review" } })} />
      </div>
      {view === "review" ? (
        <DiscoveryReview port={port}
          onBackToChat={(q) => { setReturnFocus(q ? { questionId: q, nonce: Date.now() } : null); navigate({ search: {} }); }}
          onFindVolunteer={() => { /* publication review is a later item */ }} />
      ) : null}
    </>
  );
}
```

**Port**: what the screen calls is unchanged. Inside the port, every member is one POST to an
edge function:

```ts
const port = createDiscoveryPort({ organizationId, projectId });
await port.load();                      // POST discovery-state. If needsOpening: POST discovery-message {opening:true}, then read again
port.chat;                              // DefaultChatTransport -> discovery-message, Accept: text/event-stream
await port.addFile(file);               // POST discovery-file {name, mediaType, sizeBytes, contentBase64}; then refresh + poll
await port.saveBriefEdit({ sectionId: "need", text, baseRevision: 6 });  // POST discovery-brief {action:"edit", ...}
await port.finish({ revision: 7, acks });                                 // POST discovery-finish
```

**Server, a review write** (`supabase/functions/discovery-brief/index.ts`). The route reuses the
pipeline. The rules are pure, and the commit is a compare-and-swap:

```ts
Deno.serve(writeRoute({
  name: 'discovery-brief',
  target: organizationIdField,
  decide: decideBriefWrite,                 // parse {action, projectId, sectionId|topicId|label, baseRevision}
  prepare: prepareBriefWrite,               // read the brief row (RLS), run applyEdit/applyAccept/applyAsk/applyRemoveLabel
  render: renderBriefCommit,                // {brief: BriefSnapshot}
}));
// prepareBriefWrite -> args for discovery_brief_commit(p_base_revision = revision it read, p_snapshot | null, p_line, p_removed_label)
```

**Server, a chat turn**. `discoveryPrepare` already counts tokens before the debit. Now it also
applies the NGO's structured answers to the brief. The model call writes the rest of the update
through one forced `reply` tool. Settle commits the turn and the brief together:

```ts
// prepare: brief0 = read; afterAnswers = applyAnswers(brief0, body.answers, {round, userMessageId})
// reserve(p_brief_revision = brief0.revision, p_expected_charge, p_answers) -> refuses mode-changed / stale-context / daily-limit
// stream: deltas come from the reply tool's "text" field, decoded from input_json_delta
// act:    next = applyReply(afterAnswers, parseReplyInput(toolUse.input), {round})
// settle(p_brief = next.snapshot, p_base_revision = brief0.revision, p_outcome = {filed, questions}) -> one transaction
// parts:  data-filed? data-charge data-question* data-ready? data-brief(transient) data-usage(transient)
```

**Integration screen test** (unit 5). The test body is the same function at both tiers:

```ts
atTest('AT-004.70', '...', { surface: 'ui' }, { loop: body, integration: body, drill: pendingSurface });
// withDiscovery at integration: seedDiscoveryWorld(ctx, scenario) -> sign in -> open /discovery/<org>/<project>[?view=review]
// screen.modelCalls() at integration: turns with seq > seeded max -> 'chat-turn'; files added after the seed -> 'file-read'
```

## Shape

### Data first

| Store | Holds | Writers | Read path |
|---|---|---|---|
| `discovery_briefs` (new; one row per project) | `revision int`; `snapshot jsonb` (the `BriefSnapshot` without `revision`); `depends_on jsonb`; `removed_labels text[]`; `lines jsonb` (person lines from edits and accepted suggestions) | `discovery_brief_commit` and `discovery_turn_settle` only | RLS select for organisation members |
| `discovery_confirmations` (new) | PK `(project_id, revision)`, approver, time, accepted gaps, acks; immutable | `discovery_finish` only | the current row is the one whose `revision` equals the brief's revision |
| `discovery_turns` (existing, extended) | plus `answers jsonb`, `user_message_id text`, `outcome jsonb`; billing gains `opening` | reserve and settle (existing) | the transcript is assembled at read time |
| `discovery_files` (new) + bucket `discovery-files` (private) | status, parts, running digest, `took_from_it`, `facts`, `reported_seq`, heartbeat | `discovery_file_add`, the read job's progress function, and settle (the `reported_seq` column only) | merged into `DiscoveryState.files` at read time |
| `discovery_spend` (existing) | the daily count, now one credit per turn, grant 10 or 30 | reserve and settle | `discovery_usage()` |

The decisions that carry the design:

1. **The rules are pure TypeScript. The commit is one compare-and-swap in SQL.**
   `_shared/discovery-brief.ts` holds the fixture's rules, ported: edit, accept, ask, remove label,
   apply answers, apply reply, dependents, readiness, accepted gaps. `prepare` reads the row and
   computes the next snapshot. `discovery_brief_commit` locks the row `for update`. It checks
   `revision = p_base_revision`, writes the snapshot, adds one to `revision`, and appends the
   person line with id `you-<new revision>`, the id the fixture uses. A non-change sends
   `p_snapshot = null`. The function then checks only for a stale revision and returns the current
   brief, the fixture's order. This follows boundary-discipline: the logic is pure and the shell
   is thin. If the client's `baseRevision` differs from the revision `prepare` read, `prepare`
   refuses `stale-revision` itself. The commit always swaps on the revision that `prepare` read,
   so a client cannot claim a future revision.
2. **The brief has two writers, and the existing one-open-turn rule already serializes them.** A
   brief commit refuses `turn-in-flight` while a fresh open turn exists. Reserve takes
   `p_brief_revision` and refuses `stale-context` when it moved, as it already does for
   `p_counted_through_seq`. Settle swaps on the revision it reserved against. A mismatch is
   practically impossible, because the provider timeout (120 s) is shorter than the abandon
   deadline (150 s). If it happens, the turn settles `failed` and the credit is released.
3. **File reads never write the brief.** This follows
   separate-before-serializing-shared-state. A read writes only its own `discovery_files` row:
   status, digest and `took_from_it`. The screen already renders "From <file> / The AI took from
   it:" from `DiscoveryFile.tookFromIt` (`BriefPanel.tsx` lines 17 to 25). So "facts enter the
   brief marked as from the file" happens at the read boundary, and the read job and the chat
   never contend. Later turns get the digests in the system block, and the model may turn a fact
   into a topic `suggestion`. A file fact never agrees a topic, as the contract says.
4. **The confirmation is derived, never cleared.** The current confirmation is the row where
   `confirmation.revision = brief.revision`. That is the screen's own `confirmationCurrent` rule.
   So a real edit invalidates approval with no code, because the bump does it. Finish is
   idempotent by primary key: `on conflict do nothing`, then return the row. An edit leaves no
   orphan rows to delete. Old confirmations stay as history. `finished` refusals check the same
   derived condition. This follows single source of truth: derive instead of sync.
5. **Code applies the structured answers. The model does not.** `applyAnswers` turns
   `DiscoveryAnswer[]` into agreed or not-sure topics, with source `chat` and the round. It uses
   option labels from the stored question, not the client's text, and the client message id as
   `answerMessageId`. The model fills only what code cannot: new questions, suggestions, empty
   sections, tier, fit, labels, the text, and topics the NGO answered in its free note. The
   prototype found that Haiku lists earlier agreed topics again. That is now harmless: a topic
   answered from the note applies only to topics that are open or not sure, and the revision goes
   up only when the snapshot really changed (`briefChanged`). When every required topic is
   settled, `applyReply` drops new questions. `act` then emits the ready sentence as a last text
   delta if the model left it out, so the ready state does not depend on the model.
6. **One credit per turn, and one function decides the mode.** Two constraints change. The free
   reservation becomes `reserved_credits = 1`, and a settled free turn charges 1. Both are added
   `not valid`, so old token-priced rows stay legal. Reserve debits 1. Free turns are no longer
   sized by remaining credits. `discovery_usage(org, project)` is the only place that computes
   `dailyLeft`, `nextReply` and the rest. Reserve calls it to choose billing, and every read
   returns it. The `mode-changed` check is therefore exact: the server's "next reply" is the same
   function the screen saw. Billing order: retry (zero credits, matches either shown mode), then
   free when `dailyLeft > 0` even on a funded project, then fuel when funded and the available
   amount covers the hold, else `daily-limit`. Fuel stays the stub that returns 0.
7. **Files reuse reserve, act and settle.** `discovery_file_add` is the route RPC. It takes the
   project lock, then refuses `finished`, then `file-limit` (three live discovery files while
   unfunded), then `duplicate-file` (a partial unique index on live names). `act` uploads the
   bytes to the bucket and starts the read with `EdgeRuntime.waitUntil`. Settle confirms, or marks
   the row failed. The read is a fold, `digest_n = model(digest_{n-1}, part_n)`. The digest after
   each part is stored by a compare-and-swap on `parts_done`. A crash therefore resumes from the
   stored digest, and running the same part twice writes once (make-operations-idempotent). A read
   with no heartbeat for 5 minutes shows as `failed` at the read boundary (derived, not swept). A
   failed file counts toward neither the limit nor the name check, so the NGO can add it again.
8. **The first reply is a turn with `opening` billing.** A constraint enforces `seq = 1`, zero
   credits and an empty user message. `port.load()` sees `needsOpening` and posts
   `discovery-message {opening: true}` as JSON, not a stream, then reads again. The unique open
   index and `seq = 1` make a double load harmless: the second call gets `turn-in-flight` and only
   reads again. `load` itself stays a pure read.
9. **Live updates come from polling, and only while something can change.** The port polls
   `discovery-state` every 1.5 s while any discovery file is `reading`. It also refreshes once
   after each of its own writes. It pushes `ServerChange` only when something differs, and
   `transcript` carries only person lines it has not pushed before. Live chat messages have client
   ids, so a load's turn lines would duplicate them in the hook's merge.

### What the public surface hides

The port keeps nine members. The screen never sees revisions, locks, credit math, parts or
stalls. Five edge functions serve the port: `discovery-state` (read), `discovery-message`,
`discovery-brief` (four actions, one RPC), `discovery-finish` and `discovery-file`. No wire type
reaches the screen beyond `src/lib/discovery-stream.ts`. The server keeps mirror types in
`_shared/discovery-wire.ts`. A typed selftest checks that the two sets of types can be assigned
to each other and that the server copy strings equal `TEXT`.

### Invariants by where they are enforced

- **In the database** (types or constraints): one brief per project (PK). A snapshot carries no
  revision (check), so the revision has one home. At most 3 cause labels (check). An opening turn
  is first and free. A free turn is one credit. A turn carries a message or answers. One live file
  per name (partial unique index). A ready file has facts and is fully read. A confirmation is
  immutable, one per revision.
- **At runtime in the functions**: the stale-revision compare-and-swap, `turn-in-flight`, the
  three-file limit under the project lock, `finished`, `file-reading` (ignores stalled reads).
- **At the boundary**: `parseReplyInput` (bad questions are dropped one by one; missing `text`
  means a failed turn), `decideBriefWrite`, `decideDiscoveryMessage` (answers checked against the
  stored brief in `prepare`), the file type and size cap.

### What it deliberately does not do

No realtime channel. No file chat. No fuel ledger, fee or checkout: the paid path stays the stub.
No change to the intake stage when Discovery finishes; confirmation stays derived. No fit-decline
operations item. No model call on load, review or finish.

### Stream parts (`use-discovery.ts` works unchanged)

`start`, `text-start`, `text-delta`* (the decoded `reply.text`, plus the ready sentence when it is
due), `text-end`, then after settle: `data-filed` (when certain answers were saved), `data-charge`
(`free` for free, retry and opening; `paid` with `actual_micros` and fee 0 for fuel),
`data-question` once for each open question of the new brief, `data-ready` when every required
topic is settled, `data-brief` and `data-usage` (both with `transient: true`), `finish`, `[DONE]`.
`data-turn` is no longer emitted. Refusals stay `{ok:false, kind, reason}` with status 4xx.
`DefaultChatTransport` throws the body text and `parseRefusal` reads it.

## Synthesis decision

Filled in by arena.

## Tradeoffs accepted

- We accept the brief as one opaque JSONB document instead of normalized
  topic/question/suggestion tables. In exchange there is one compare-and-swap row lock, an exact
  match with the screen's `BriefSnapshot`, and no assembly join. Per-topic SQL queries, for
  example matching by topic, must use JSON paths later.
- We accept that the rules run in TypeScript, so SQL trusts the snapshot it is given. In exchange
  the rules exist once, as pure functions ported from the fixture, and are unit-testable. The SQL
  function enforces only concurrency and shape.
- We accept that the server copy strings (`You changed …`, the ready sentence, refusal reasons)
  duplicate `TEXT`, because edge functions cannot import `src/`. A selftest keeps them equal.
- We accept that `need_intakes.cause_labels` is synced from the brief by the same functions, not
  derived. Existing readers keep working, and no other surface moves in this item.
- We accept `not valid` constraints, so old token-priced rows stay. The alternative is rewriting
  history in the one shared database.
- We accept base64 JSON uploads capped at 10 MiB. In exchange uploads use the unchanged
  `writeRoute` pipeline, and the browser never talks to storage. The bucket's limit in
  `config.toml` (50 MiB) stays higher.
- We accept `EdgeRuntime.waitUntil` for the read. A read that outlives the isolate shows as
  failed after 5 minutes, and the NGO adds the file again. In exchange there is no job queue.

## Alternatives considered

- **Normalized brief tables** (topics, questions, suggestions, sections rows, with the revision on
  the parent). This exposes more to SQL and hides nothing more from the screen. `load` would join
  five tables and rebuild the snapshot. Every rule would be written either as row updates in
  PL/pgSQL or as TypeScript plus a multi-row write. That is more surface for the same port, and
  the dependent-marking rule crosses rows. It lost on depth.
- **Rules in PL/pgSQL** (send the operation, let SQL change the JSONB). It is atomic without a
  compare-and-swap, but it ports `fixture-world.ts` into jsonb_set code that nobody can unit-test
  beside the screen types. The compare-and-swap costs one integer comparison.
- **File facts written into the brief** (a topic suggestion or a section with source `file`).
  That makes the read job a third writer of the brief, which races the chat and needs
  serialization. The screen already renders file facts from the file row. Rejected per
  separate-before-serializing.
- **A Supabase realtime channel for `subscribe`.** The founder chose polling. Realtime would also
  give the UI a database channel, against the edge-functions-only rule.
- **The first reply generated at intake submit.** It removes load latency but ties
  `project-need submit` to a model call. Discovery "opens" when the NGO opens it. Kept as open
  question 4.

## Open questions and risks

1. **Which model answers at the integration tier?** The screen bodies assert scripted text: the
   ready sentence, "38 of your 45 volunteers", "Ready · 4 facts", and a specific next question.
   AT-004.10 also needs a model at integration. My recommendation: the integration run starts
   functions with `ANTHROPIC_BASE_URL` pointing at the existing `createAnthropicMessagesSim`,
   served over HTTP and scripted from `design/astra/src/fixture-data.ts`. The SDK reads that
   variable itself, so product code does not change. The verify drive starts functions without
   it and uses Haiku. This is a new transport for an existing stand-in, and the project rule says
   "the harness takes no new machinery". Does the founder allow this exception, or do these
   assertions stay at the loop tier only? The second choice means the bodies are not unchanged.
2. **How do the fuel-dependent screen steps run at integration?** These are `mid-interview-paid`
   ($1.60 available) and "Buy fuel opens the fuel page". Fuel is a stub that returns 0, and the app
   has no fuel page. Do these sub-steps stay pending on the existing `checkout.project-fuel`
   capability, or does the route get a placeholder fuel panel?
3. **Does the target model accept a forced tool choice?** `design/discovery-model-calls.md` says
   Claude Opus 5.5 and Fable 5.1 refuse a forced `tool_choice`. The production default
   `claude-opus-5` and Haiku accept it. The parser already accepts text blocks when the tool input
   has no `text`. Is "automatic choice plus a strict reply tool" the planned fallback, and should
   it be built now or when the model changes?
4. **When does the first reply run: on first load (this design) or at intake submit?** On load,
   the NGO waits for one model call before the screen appears.
5. **Where does `Confirmation.approver` come from?** Which accounts column holds the person's
   name? The fallback is the auth email.
6. **Word and Excel extraction in Deno** (`npm:mammoth`, `npm:xlsx`) is unproven in the edge
   runtime. Should an unsupported file fail with a plain reason in this item, as a "Not done here"
   entry?
7. **Does the shared process bar need a stage change after confirmation?** This design keeps the
   need's stage at `discovery_in_progress` and derives "confirmed".
8. **Blast radius of one credit per turn.** It reaches the bodies and helpers that assert
   token-priced credits: `a-metering.test.ts`, `f-transparency.test.ts`,
   `b-funded-routing.test.ts` (free-first flips "funded never uses free"), `_fixture.ts`,
   `_live.ts`, `_source-pins.ts`, `_source-absences.ts`, and `discovery-metering.ts`
   (`reservationFor`/`settlementFor`). Should those ids change in this item under the founder's
   usage ruling, or be listed as moved work?
9. **Does `cause_labels` grant select to `authenticated`?** `prepare` must put the vocabulary in
   the prompt before it counts tokens.

## Next implementation step

Write `supabase/functions/_shared/discovery-brief.ts` with its pure functions. A harness selftest
should port every rule case from `fixture-world.ts`: stale, unchanged, dependents, "not sure",
accept with no question, ask once, remove an absent label, finish refusals. After that, write the
first migration that stores the result.

---

# Type sketch

## SQL

### `supabase/migrations/20261002120000_discovery_brief_store.sql` (unit 1)

```sql
create table public.discovery_briefs (
  project_id      uuid primary key,
  org_id          uuid not null,
  revision        integer not null default 0 check (revision >= 0),
  -- BriefSnapshot minus "revision": the column is the only revision.
  snapshot        jsonb not null,
  -- topicId -> topicId[] it depends on. Set by the opening reply; drives needsReview marking. Never sent to the screen.
  depends_on      jsonb not null default '{}'::jsonb,
  -- labels the NGO removed; a later reply may not add them back.
  removed_labels  text[] not null default '{}',
  -- person lines saved with an edit or an accepted suggestion: [{id, text, afterSeq, at}]
  lines           jsonb not null default '[]'::jsonb,
  updated_at      timestamptz not null default clock_timestamp(),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  constraint discovery_briefs_no_inner_revision check (not (snapshot ? 'revision')),
  constraint discovery_briefs_shape check (
    jsonb_typeof(snapshot->'topics') = 'array' and jsonb_typeof(snapshot->'questions') = 'array'
    and jsonb_typeof(snapshot->'causeLabels') = 'array' and jsonb_array_length(snapshot->'causeLabels') <= 3
    and jsonb_typeof(snapshot->'need') = 'object' and jsonb_typeof(lines) = 'array')
);
revoke all on table public.discovery_briefs from anon, authenticated, service_role;
alter table public.discovery_briefs enable row level security;
grant select on public.discovery_briefs to authenticated;
create policy discovery_briefs_select_org_member on public.discovery_briefs for select to authenticated
  using (public.viewer_is_org_member(org_id));
create policy discovery_briefs_select_platform_admin on public.discovery_briefs for select to authenticated
  using (public.viewer_is_platform_admin());

create table public.discovery_confirmations (
  project_id           uuid not null,
  org_id               uuid not null,
  revision             integer not null check (revision >= 1),
  approver_account_id  uuid not null,
  approver_name        text not null check (btrim(approver_name) <> ''),
  confirmed_at         timestamptz not null default clock_timestamp(),
  accepted_gaps        jsonb not null check (jsonb_typeof(accepted_gaps) = 'array'),  -- [{topicId,title,importance,reason}]
  acks                 jsonb not null,                                                 -- {reviewed, openGaps, data}
  primary key (project_id, revision),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade
);
-- same RLS posture as discovery_briefs; a trigger forbids UPDATE and DELETE (history, never cleared).
-- The current confirmation is DERIVED: the row whose revision = discovery_briefs.revision.

-- Review writes. Concurrency and shape only; the rules ran in TypeScript.
create function public.discovery_brief_commit(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid,
  p_base_revision integer,          -- the revision prepare read and computed against
  p_snapshot jsonb,                 -- null = no change: check staleness, return current
  p_depends_on jsonb,               -- null = keep
  p_line text,                      -- null = no person line; else id 'you-' || new revision
  p_removed_label text,             -- null = none; also array_remove on need_intakes.cause_labels
  p_while_finished boolean,         -- true only for the edit action (the reopen path)
  p_turn_deadline_seconds integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  -- assert_account_active; org admin (not-a-member / not-an-admin); project in org (no-such-project);
  -- need stage discovery_in_progress (need-not-in-discovery);
  -- select ... from discovery_briefs where project_id = p_project_id for update  (absent -> discovery-not-started);
  -- fresh open turn on the project -> raise 'turn-in-flight';
  -- revision <> p_base_revision -> raise 'stale-revision' (P0001, detail 'stale-revision');
  -- not p_while_finished and exists confirmation at current revision -> raise 'finished';
  -- if p_snapshot is null: return discovery_brief_view(row);
  -- update set snapshot, revision = revision + 1, depends_on = coalesce(p_depends_on, depends_on),
  --   removed_labels = removed_labels || p_removed_label (when given),
  --   lines = lines || {id:'you-'||(revision+1), text:p_line, afterSeq:max settled seq, at:now} (when given);
  -- when p_removed_label: update need_intakes set cause_labels = array_remove(cause_labels, p_removed_label);
  -- return jsonb_build_object('revision', new revision, 'snapshot', snapshot);
  raise exception 'not implemented';
end $$;
-- execute: service_role only.

create function public.discovery_finish(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid,
  p_revision integer, p_acks jsonb, p_accepted_gaps jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  -- admin, active; lock brief row;
  -- existing confirmation at p_revision -> return it (idempotent, before any other check, like the fixture);
  -- exists discovery_files reading with heartbeat_at > now() - 5 min -> raise 'file-reading';
  -- brief.revision <> p_revision -> raise 'stale-revision';
  -- insert (approver_name from the account; see open question 5) on conflict (project_id, revision) do nothing;
  -- return the row as Confirmation jsonb {revision, approver, at, acceptedGaps}.
  raise exception 'not implemented';
end $$;
-- open-gaps and data-ack are refused in prepare (pure, from the brief it read); finish re-checks the revision.
```

### `20261002120100_discovery_billing_opening.sql`

```sql
alter type public.discovery_billing add value 'opening';   -- its own migration: a new enum value is unusable in the adding transaction
```

### `20261002120200_discovery_turn_contract.sql` (units 2 and 3)

```sql
alter table public.discovery_turns
  add column answers          jsonb not null default '[]'::jsonb,  -- canonical DiscoveryAnswer[] (server-side labels)
  add column user_message_id  text,                                 -- the client's id for the user line; becomes answerMessageId
  add column outcome          jsonb;                                -- {filed:[{id,title}], questions:[ids], briefRevision, reportedFileIds}

alter table public.discovery_turns drop constraint discovery_turns_free_reserved_at_ratio;
alter table public.discovery_turns add constraint discovery_turns_free_is_one_credit
  check (billing <> 'free' or reserved_credits = 1) not valid;
alter table public.discovery_turns drop constraint discovery_turns_settled_is_measured;
alter table public.discovery_turns add constraint discovery_turns_settled_is_measured check (
  status <> 'settled' or (input_tokens >= 0 and output_tokens >= 0 and output_tokens <= max_output_tokens
    and assistant_message is not null
    and actual_micros = input_tokens * input_micros_per_token + output_tokens * output_micros_per_token
    and overrun_micros = greatest(0, actual_micros - reserved_micros)));
alter table public.discovery_turns add constraint discovery_turns_free_settles_one_credit
  check (billing <> 'free' or status <> 'settled' or charged_credits = 1) not valid;
alter table public.discovery_turns add constraint discovery_turns_opening_is_first_and_free
  check (billing <> 'opening' or (seq = 1 and reserved_credits = 0 and coalesce(charged_credits, 0) = 0 and user_message = ''));
alter table public.discovery_turns add constraint discovery_turns_says_something
  check (billing = 'opening' or user_message <> '' or jsonb_array_length(answers) > 0);
-- discovery_turn_immutable(): add 'outcome' to the settle-time allowlist (create or replace).

-- The ONE place that computes the screen's usage. Reserve uses it to pick billing; every read returns it.
create function public.discovery_usage(p_organization_id uuid, p_project_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  -- grant := greatest(stored high-water for today, discovery_daily_grant(vetted));  10 or 30
  -- left  := greatest(0, grant - spent today);
  -- avail := project_fuel_available_micros(p_project_id);   -- stub: 0
  -- hold  := 250000;                                          -- mirrored by DISCOVERY_PAID_HOLD_MICROS
  -- next  := case when left > 0 then 'free' when funded and avail >= hold then 'paid' else 'unavailable' end;
  -- return {dailyLeft:left, dailyGrant:grant, availableMicros:avail, reservedMicros:0, allocationMicros:0,
  --         settledMicros:0, holdMicros:hold, nextResetAt:(utc today + 1) at 00:00Z, nextReply:next}
  raise exception 'not implemented';
end $$;
-- execute: none (internal). viewer_discovery_usage(p_project_id) wraps it with viewer_is_org_member; granted to authenticated.

drop function public.discovery_turn_reserve(uuid, uuid, uuid, text, jsonb, integer);
create function public.discovery_turn_reserve(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid,
  p_message text,                 -- the note; '' allowed when answers exist or opening
  p_answers jsonb,                -- canonical answers, already validated against the brief in prepare
  p_user_message_id text,
  p_expected_charge text,         -- 'free' | 'paid' ; null for opening
  p_opening boolean,
  p_initial_snapshot jsonb,       -- opening only: insert discovery_briefs at revision 0 on conflict do nothing
  p_brief_revision integer,       -- the revision prepare built the prompt from
  p_settings jsonb, p_counted_through_seq integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  -- unchanged: active, org admin, kill switch, verified email, settings, project lock, stage, open-turn / abandon, stale-context.
  -- new: brief revision <> p_brief_revision -> 'stale-context';
  --      confirmation current -> 'finished' (not for opening; an opening needs no brief yet);
  --      opening and any turn exists -> 'turn-in-flight' (the caller just reads again).
  -- billing: opening -> 'opening';
  --          previous row failed/abandoned with same note AND same answers -> 'retry' (matches either shown mode);
  --          usage.dailyLeft > 0 -> 'free'  (also when funded: free first);
  --          funded and usage.availableMicros >= hold -> 'fuel';
  --          else raise 'daily-limit' (screen sentence).
  -- mode check (not opening, not retry): (billing='free') <> (p_expected_charge='free') -> raise 'mode-changed' BEFORE any debit.
  -- free: debit exactly 1 credit; max_output = settings max_output_tokens (no longer sized by credits).
  -- insert the open row with answers, user_message_id. Return {turn, usage}.
  raise exception 'not implemented';
end $$;

drop function public.discovery_turn_settle(uuid, uuid, text, text, integer, integer, text, text, jsonb, boolean, jsonb);
create function public.discovery_turn_settle(
  p_account_id uuid, p_turn_id uuid, p_outcome text, p_assistant_message text,
  p_input_tokens integer, p_output_tokens integer, p_stop_reason text, p_served_model text,
  p_off_topic boolean, p_notice jsonb,
  p_base_revision integer,        -- the brief revision reserved against
  p_snapshot jsonb,               -- null = brief unchanged
  p_depends_on jsonb,
  p_turn_outcome jsonb,           -- {filed, questions}
  p_reported_file_ids uuid[],     -- files whose read this reply reported -> reported_seq
  p_new_cause_labels text[]       -- labels this reply added: insert into cause_labels vocabulary, mirror to need_intakes
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  -- unchanged locking and admin checks.
  -- completed: free charges 1 (no release); retry/opening/fuel charge 0 credits; fuel records actual_micros.
  --   brief: lock row; revision <> p_base_revision -> settle as FAILED instead (credit released), no brief write;
  --          else when p_snapshot not null: update snapshot, revision+1 (and the opening creates topics at revision 1).
  -- failed: charge 0, release 1 (free), no brief write.
  -- off-topic notice: unchanged.
  -- return {turn, brief:{revision, snapshot}, usage: discovery_usage(...), off_topic_count}.
  raise exception 'not implemented';
end $$;
-- both: execute to service_role only.
```

### `20261002120300_discovery_files.sql` (unit 4)

```sql
insert into storage.buckets (id, name, public, file_size_limit)
values ('discovery-files', 'discovery-files', false, 10485760) on conflict (id) do nothing;
-- no storage.objects policies: only the service role reads or writes the bucket.

create type public.discovery_file_status as enum ('reading', 'ready', 'failed');
create table public.discovery_files (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null,
  org_id        uuid not null,
  name          text not null check (btrim(name) <> '' and length(name) <= 255),
  media_type    text not null,
  size_bytes    integer not null check (size_bytes > 0),
  storage_path  text not null,                 -- '<project_id>/<id>'
  status        public.discovery_file_status not null default 'reading',
  parts_total   integer check (parts_total > 0),
  parts_done    integer not null default 0 check (parts_done >= 0),
  digest        jsonb,                         -- running digest {facts:string[], questions:string[], tookFromIt:string}
  took_from_it  text,
  facts         integer,
  failure       text,
  reported_seq  integer,                       -- written by turn settle only
  input_tokens  bigint not null default 0,     -- platform-paid provider usage, never charged
  output_tokens bigint not null default 0,
  added_by      uuid not null,
  added_at      timestamptz not null default clock_timestamp(),
  heartbeat_at  timestamptz not null default clock_timestamp(),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  check (parts_total is null or parts_done <= parts_total),
  check (status <> 'ready' or (facts is not null and took_from_it is not null and parts_done = parts_total)),
  check (status <> 'failed' or failure is not null)
);
create unique index discovery_files_one_live_name on public.discovery_files (project_id, name) where status <> 'failed';
-- RLS select for org members and platform admins, no client writes.

create function public.discovery_file_add(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid,
  p_name text, p_media_type text, p_size_bytes integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  -- active, org admin, stage; lock the project row FOR UPDATE (serializes the count);
  -- confirmation current -> 'finished'; unfunded and count(live discovery files) >= 3 -> 'file-limit';
  -- live file with p_name -> 'duplicate-file'; insert status reading; return the row.
  raise exception 'not implemented';
end $$;

create function public.discovery_file_stored(p_account_id uuid, p_file_id uuid, p_ok boolean, p_failure text)
returns jsonb ...;   -- not ok -> status failed; returns the file row
create function public.discovery_file_progress(
  p_file_id uuid, p_parts_done_before integer, p_parts_total integer, p_digest jsonb,
  p_input_tokens integer, p_output_tokens integer
) returns jsonb ...; -- CAS on parts_done = p_parts_done_before; sets heartbeat; last part -> ready, facts = len(digest.facts)
create function public.discovery_file_fail(p_file_id uuid, p_failure text) returns void ...;
-- all execute to service_role only. A stalled read (heartbeat older than 5 minutes) is rendered failed at read time.
```

## TypeScript: shared server modules

### `supabase/functions/_shared/discovery-wire.ts` (a copy of `src/lib/discovery-stream.ts` minus `UIMessage`)

```ts
export type Importance = 'needed' | 'suggested' | 'later';
export type BriefSource = /* identical union */;
export type BriefQuestion = /* identical */; export type BriefTopic = /* identical */;
export type BriefSnapshot = /* identical */;
export type DiscoveryUsage = {               // beta fields removed (founder ruling)
  dailyLeft: number; dailyGrant: number; availableMicros: number; reservedMicros: number;
  allocationMicros: number; settledMicros: number; holdMicros: number; nextResetAt: string;
  nextReply: 'free' | 'paid' | 'unavailable';
};
export type DiscoveryFile = /* identical */; export type Confirmation = /* identical */;
export type DiscoveryAnswer = { questionId: string; choice: string; text: string; certain: boolean };
export type WireMessage = { id: string; role: 'user' | 'assistant'; parts: WirePart[] };
export type WirePart =
  | { type: 'text'; text: string }
  | { type: 'data-filed'; data: { topics: { id: string; title: string }[] } }
  | { type: 'data-charge'; data: { kind: 'free' } | { kind: 'paid'; usageMicros: number; feeMicros: number } };
export type DiscoveryStateWire = {
  project: { title: string; organizationName: string; funded: boolean };
  transcript: WireMessage[]; brief: BriefSnapshot; files: DiscoveryFile[];
  usage: DiscoveryUsage; confirmation: Confirmation | null;
};
// Drift guard: tests/at/harness/discovery-wire.selftest.ts asserts mutual assignability with src/lib/discovery-stream.ts.
```

### `supabase/functions/_shared/discovery-brief.ts` (pure; the fixture's rules, ported)

```ts
import type { BriefSnapshot, DiscoveryAnswer, Confirmation } from './discovery-wire.ts';
import type { ReplyInput } from './discovery-reply.ts';

/** The row as read under RLS. The snapshot has no revision: the column is the only one. */
export type StoredBrief = {
  revision: number;
  snapshot: Omit<BriefSnapshot, 'revision'>;
  dependsOn: Readonly<Record<string, readonly string[]>>;
  removedLabels: readonly string[];
};
export type Refusal = { kind: BriefRefusalKind; reason: string };
export type BriefRefusalKind = 'unknown-section' | 'unknown-topic' | 'no-suggestion' | 'finished'
  | 'open-gaps' | 'data-ack' | 'discovery-ready' | 'invalid-request';

/** What a review write sends to discovery_brief_commit. 'unchanged' still checks staleness in SQL. */
export type BriefChange =
  | { kind: 'unchanged' }
  | { kind: 'changed'; snapshot: Omit<BriefSnapshot, 'revision'>; dependsOn?: StoredBrief['dependsOn'];
      line: string | null; removedLabel: string | null }
  | { kind: 'refused'; refusal: Refusal };

export const renderBrief = (row: StoredBrief): BriefSnapshot => ({ revision: row.revision, ...row.snapshot });

/** need | usersToday | successMeasure | topic id. Source {edit, revision: base+1}; "I'm not sure" -> not-sure; marks dependents; answerMessageId = 'you-<base+1>'. */
export function applyEdit(row: StoredBrief, input: { sectionId: string; text: string }): BriefChange { throw new Error('not implemented'); }
/** Refuses no-suggestion; inserts the topic's question when absent; source accepted-suggestion; line usedSuggestion. */
export function applyAccept(row: StoredBrief, input: { topicId: string; round: number }): BriefChange { throw new Error('not implemented'); }
/** Unknown topic refused; an existing question for the topic is 'unchanged'; else one question from plannedQuestion. */
export function applyAsk(row: StoredBrief, input: { topicId: string; round: number }): BriefChange { throw new Error('not implemented'); }
/** Absent label is 'unchanged'. */
export function applyRemoveLabel(row: StoredBrief, input: { label: string }): BriefChange { throw new Error('not implemented'); }

/** Before the model call. Canonicalizes answers against stored questions (option label, "custom" text, NAME.notSure). */
export function applyAnswers(
  row: StoredBrief, answers: readonly DiscoveryAnswer[], ctx: { round: number; userMessageId: string },
): { ok: true; snapshot: Omit<BriefSnapshot, 'revision'>; canonical: DiscoveryAnswer[]; filed: { id: string; title: string }[] }
 | { ok: false; refusal: Refusal } { throw new Error('not implemented'); }

/**
 * After the model call. Opening: accepts topics (+dependsOn) once. Later: questions (dropped when the topic is
 * unknown, settled, already asked, or waits on an unsettled dependency; at most three open), note-agreed topics
 * (open/not-sure only), suggestions (unagreed topics only), usersToday/successMeasure (only when null),
 * dataTier (never lowered), fit (once), causeLabels (only when empty, minus removedLabels, max 3).
 * When every required topic is settled: no new questions, and readySentenceDue = !text.includes(READY_REPLY).
 */
export function applyReply(
  row: StoredBrief, afterAnswers: Omit<BriefSnapshot, 'revision'>, reply: ReplyInput, ctx: { round: number; opening: boolean },
): { snapshot: Omit<BriefSnapshot, 'revision'>; dependsOn: StoredBrief['dependsOn']; newLabels: string[];
     changed: boolean; ready: { agreed: number; total: number } | null; readySentenceDue: boolean } { throw new Error('not implemented'); }

export function briefChanged(a: Omit<BriefSnapshot, 'revision'>, b: Omit<BriefSnapshot, 'revision'>): boolean { throw new Error('not implemented'); }
export function progress(s: Omit<BriefSnapshot, 'revision'>): { agreed: number; total: number } { throw new Error('not implemented'); }
/** Pure finish gate: open-gaps / data-ack refusals and the accepted gaps from unsettled topics. */
export function finishGate(row: StoredBrief, acks: { reviewed: true; openGaps: boolean; data: boolean }):
  { ok: true; acceptedGaps: Confirmation['acceptedGaps'] } | { ok: false; refusal: Refusal } { throw new Error('not implemented'); }
export function initialBrief(need: { description: string }): Omit<BriefSnapshot, 'revision'> { throw new Error('not implemented'); }
```

### `supabase/functions/_shared/discovery-reply.ts` (the forced tool and the streaming decoder)

```ts
export const REPLY_TOOL = {
  name: 'reply',
  description: 'Your whole reply: the text the NGO reads, plus the brief update.',
  input_schema: { type: 'object', required: ['text'], properties: {
    text: { type: 'string' },                                     // FIRST property: streamed as it arrives
    agreedFromNote: { type: 'array', items: { /* {topicId, answer} */ } },
    questions: { type: 'array', items: { /* {topicId, text, reason, options:[{label,answer}] 2..4, suggested:int,
                                            importance, recommendation, uncertaintyHelp} */ } },
    topics: { type: 'array', items: { /* opening only: {id,title,required,importance,why,plannedQuestion,dependsOn[]} */ } },
    suggestions: { type: 'array', items: { /* {topicId, suggestion} */ } },
    usersToday: { type: 'string' }, successMeasure: { type: 'string' },
    dataTier: { /* {tier:0|1|2, reason} */ }, fit: { /* {verdict, reason} */ },
    causeLabels: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    offTopic: { type: 'boolean' },                                // replaces decline_off_topic; honoured only with guardrails
  } },
} as const;

export type ReplyInput = { text: string; agreedFromNote: { topicId: string; answer: string }[];
  questions: ReplyQuestion[]; topics: ReplyTopic[] | null; suggestions: { topicId: string; suggestion: string }[];
  usersToday: string | null; successMeasure: string | null; dataTier: { tier: 0 | 1 | 2; reason: string } | null;
  fit: { verdict: 'fits' | 'declined'; reason: string } | null; causeLabels: string[] | null; offTopic: boolean };
/** Boundary parse. null only when text is missing; bad entries are dropped one by one. */
export function parseReplyInput(raw: unknown): ReplyInput | null { throw new Error('not implemented'); }

/** Feeds input_json_delta chunks; returns the newly decoded characters of the top-level "text" string. */
export class ReplyTextStream { push(partialJson: string): string { throw new Error('not implemented'); } }

export const OPENING_USER_PROMPT = 'The NGO opened Discovery.';          // never shown; context for seq 1
export function userLineText(answers: readonly { text: string }[], note: string): string { throw new Error('not implemented'); }
```

### `supabase/functions/_shared/discovery-copy.ts`

```ts
// Server copies of screen strings; tests/at/harness/discovery-wire.selftest.ts compares them with TEXT.
export const COPY = { changedAnswer: (t: string, a: string) => `You changed ${t}: ${a}`,
  usedSuggestion: (t: string, a: string) => `You used the suggestion for ${t}: ${a}`,
  readyReply: 'Discovery is ready for review. I have stopped asking questions.',
  notSure: "I'm not sure", stale: 'The brief changed. Review the latest revision.',
  finished: 'Discovery is finished. No further reply is charged.', fileLimit: 'Free projects can add 3 files in Discovery.',
  fileDuplicate: 'This file is already in your files.', fileReading: 'A file is still being read. You can finish when it is ready.',
  modeChanged: 'The reply cost changed. Review the usage card, then send again.', /* … */ } as const;
```

### `supabase/functions/_shared/discovery-state.ts` (the read boundary)

```ts
export type DiscoveryStateRows = {
  project: { name: string; funded_at: string | null }; organization: { name: string };
  need: { stage: string; reference_files: { id: string; file_name: string; byte_size: number }[] };
  brief: (StoredBrief & { lines: PersonLine[] }) | null; turns: DiscoveryTurnSqlRow[];
  files: DiscoveryFileSqlRow[]; confirmations: ConfirmationSqlRow[]; usage: unknown;
};
export type PersonLine = { id: string; text: string; afterSeq: number; at: string };
/** Settled turns -> user line (id user_message_id ?? `you-turn-<seq>`, text userLineText) + assistant line
 *  (`reply-<seq>`: text, data-filed from outcome, data-charge from billing); opening has no user line;
 *  person lines merged after their afterSeq. Files: intake rows + discovery rows (stalled reading -> failed).
 *  Confirmation: the row whose revision = brief.revision, else null. */
export function renderDiscoveryState(rows: DiscoveryStateRows, now: Date):
  { state: DiscoveryStateWire; needsOpening: boolean } | { refusal: { kind: string; reason: string } } { throw new Error('not implemented'); }
export function parseUsage(raw: unknown): DiscoveryUsage { throw new Error('not implemented'); }
```

### Changes in existing shared modules

```ts
// write-routes.ts
WRITE_ROUTES += {
  'discovery-brief':  { surface: { kind: 'edge', rpc: 'discovery_brief_commit' }, standing: { kind: 'account-required', admits: ['ngo'] } },
  'discovery-finish': { surface: { kind: 'edge', rpc: 'discovery_finish' },       standing: { kind: 'account-required', admits: ['ngo'] } },
  'discovery-file':   { surface: { kind: 'edge', rpc: 'discovery_file_add' },     standing: { kind: 'account-required', admits: ['ngo'] } },
};
WRITE_REFUSAL_KINDS += ['stale-revision','mode-changed','finished','discovery-ready','daily-limit','discovery-not-started',
  'file-limit','duplicate-file','file-reading','file-too-large','file-type','open-gaps','data-ack',
  'no-suggestion','unknown-topic','unknown-section'];
// WriteRouteSpec.settle gains:  parts?: (settled: unknown, args: Args) => string[]   // SSE lines replacing data-turn

// edge.ts, the stream branch: emit `settle.parts(settled.value, args)` instead of dataTurn(render) when present.
// edge.ts, callerReads gains: briefOf(projectId), confirmationsOf(projectId), discoveryFilesOf(projectId),
//   discoveryUsage(projectId) (rpc viewer_discovery_usage), causeVocabulary().

// discovery-stream.ts (server) gains: dataPart(type, data, transient?) -> `data: {"type":"data-<x>","data":…,"transient":true}`.

// discovery-turn.ts
export type DiscoveryReserveArgs = {
  p_account_id: string; p_organization_id: string; p_project_id: string;
  p_message: string; p_answers: DiscoveryAnswer[]; p_user_message_id: string | null;
  p_expected_charge: 'free' | 'paid' | null; p_opening: boolean; p_initial_snapshot: unknown | null;
  p_brief_revision: number; p_settings: DiscoveryReserveSettings; p_counted_through_seq: number;
  [PREPARED]?: { request: DiscoveryModelRequest; row: StoredBrief; afterAnswers: Omit<BriefSnapshot,'revision'>;
                 filed: { id: string; title: string }[]; round: number; reportedFileIds: string[] };
};
/** Body: {organizationId, projectId, message, mode:'answer', expectedCharge, answers, messages?} or {organizationId, projectId, opening:true}.
 *  Message may be '' when answers exist. user_message_id = last entry of body.messages when it is a user message. */
export function decideDiscoveryMessage(input: AccountWriteRouteInput): WriteRouteDecision<DiscoveryReserveArgs>;
/** Reads need, settled turns, project, brief, files, vocabulary. Refuses finished / discovery-ready / invalid answers.
 *  applyAnswers; builds [REPLY_TOOL] with toolChoice {type:'tool', name:'reply'}; uncached block = need + afterAnswers brief
 *  + ready digests + unreported files + file count + vocabulary; drops skill 06 from the chat skills. */
export function discoveryPrepare(port: MessagesPort, skills: readonly DiscoverySkill[]);
/** act/stream: model -> parseReplyInput -> applyReply -> settle args; onDelta(READY_REPLY) when readySentenceDue. */
export function settleArgsFrom(reservation: Reservation, answer: DiscoveryModelAnswer, prepared: Prepared, accountId: string): SettleActResult;
export function discoveryParts(settled: unknown, args: DiscoveryReserveArgs): string[];   // the part list above
// record_elicitation, parseElicitation and decline_off_topic leave the chat path; the elicitation column stays as history.

// anthropic-messages.ts: stream() observes content_block_delta/input_json_delta through ReplyTextStream when
// request.toolChoice names 'reply'; answerFrom() takes text from toolUse.input.text when no text blocks exist.
// discovery-metering.ts: DISCOVERY_PAID_HOLD_MICROS = 250_000; reservationFor/settlementFor become "free = 1 credit".
```

### `supabase/functions/_shared/discovery-file.ts`

```ts
export const DISCOVERY_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const DISCOVERY_FILE_TYPES = ['application/pdf','image/png','image/jpeg','text/csv','text/tab-separated-values',
  'text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] as const;
export type FileAddArgs = { p_account_id: string; p_organization_id: string; p_project_id: string;
  p_name: string; p_media_type: string; p_size_bytes: number; [BYTES]?: Uint8Array };
export function decideFileAdd(input: AccountWriteRouteInput): WriteRouteDecision<FileAddArgs>;   // file-type / file-too-large / invalid-request
/** act: upload to discovery-files/<project>/<id>; on success EdgeRuntime.waitUntil(readDiscoveryFile(...)); settle args for discovery_file_stored. */
export function fileAct(storage: StoragePort, reader: FileReader): (reserved: unknown, args: FileAddArgs) => Promise<SettleActResult>;

export type FilePart = { kind: 'text'; text: string } | { kind: 'document'; base64: string } | { kind: 'image'; base64: string; mediaType: string };
/** text-like: about 60k characters per part; PDF and images: one part; docx/xlsx: extracted to text, then split. */
export function splitIntoParts(bytes: Uint8Array, mediaType: string): FilePart[] { throw new Error('not implemented'); }
export const RECORD_DIGEST_TOOL = { name: 'record_digest', /* {facts:string[], questions:string[], tookFromIt:string} */ } as const;
/** Fold over parts from parts_done; CAS each step via discovery_file_progress; a provider error -> discovery_file_fail. Idempotent per part. */
export async function readDiscoveryFile(deps: { db: ServiceDb; storage: StoragePort; port: MessagesPort }, fileId: string): Promise<void> { throw new Error('not implemented'); }
```

### Edge functions

```
supabase/functions/discovery-state/index.ts    edgeHandler + resolveCaller; POST {projectId}; callerReads -> renderDiscoveryState
                                               -> {ok:true, state, needsOpening}  (404 invisible project; 409 need-not-in-discovery)
supabase/functions/discovery-brief/index.ts    writeRoute('discovery-brief'); body {organizationId, projectId, action:'edit'|'accept'|'ask'|'remove-label', ...}
                                               -> {ok:true, brief}
supabase/functions/discovery-finish/index.ts   writeRoute('discovery-finish'); body {organizationId, projectId, revision, acks} -> {ok:true, confirmation}
supabase/functions/discovery-file/index.ts     writeRoute('discovery-file') with settle {rpc:'discovery_file_stored', act: fileAct}
                                               body {organizationId, projectId, name, mediaType, sizeBytes, contentBase64} -> {ok:true, file}
supabase/functions/discovery-message/index.ts  writeRoute('discovery-message'); settle {rpc, act, stream, parts: discoveryParts}
supabase/config.toml                           verify_jwt = true for the four new functions
```

## TypeScript: the real port (`src/lib/discovery-port.ts`)

```ts
import { DefaultChatTransport } from "ai";
import type { DiscoveryPort, Result, ServerChange } from "@/components/discovery/port";
import type { DiscoveryState, DiscoveryUIMessage } from "@/lib/discovery-stream";
import { getSupabase, supabasePublishableKey, supabaseUrl } from "@/lib/supabase";

export type DiscoveryTarget = { organizationId: string; projectId: string };
export type ClosablePort = DiscoveryPort & { close(): void };

/** POST one edge function with the session token. Parses {ok,…} | {ok:false, kind, reason} into Result. */
type EdgeCall = <T>(fn: string, body: Record<string, unknown>, pick: (body: unknown) => T | null) => Promise<Result<T>>;

export function createDiscoveryPort(target: DiscoveryTarget, options?: { pollMs?: number; call?: EdgeCall }): ClosablePort {
  // load(): read; when needsOpening -> call('discovery-message', {...target, opening:true}) (turn-in-flight ignored) -> read again (bounded).
  // chat: new DefaultChatTransport<DiscoveryUIMessage>({ api: `${supabaseUrl()}/functions/v1/discovery-message`,
  //         headers: async () => ({ Authorization: `Bearer ${token}`, apikey: supabasePublishableKey(), Accept: "text/event-stream" }),
  //         body: { ...target } })                                   // merged with the hook's per-send body
  // addFile(file): size/type pre-check is the server's; base64 -> call('discovery-file'); ok -> refresh() then poll()
  // saveBriefEdit / acceptSuggestion / askTopic / removeCauseLabel -> call('discovery-brief', {action, ...});
  //   ok -> refresh({ personLines: true }); 'stale-revision' -> refresh() so subscribers get {brief}
  // finish -> call('discovery-finish'); ok -> refresh()
  // subscribe(listener): add; poll() while any discovery file is reading; returns unsubscribe
  // refresh(): read; diff against last pushed; notify {files, brief, usage, confirmation, transcript?: unseen person lines}
  // close(): stop timers, drop listeners
  throw new Error("not implemented");
}
/** Boundary check of the discovery-state body: structural, rejects anything that is not a DiscoveryState. */
export function parseDiscoveryState(raw: unknown): { state: DiscoveryState; needsOpening: boolean } | null { throw new Error("not implemented"); }
```

`src/lib/discovery-chat.ts` becomes orphaned when the old route page goes, so it is deleted. Its
selftests go with it if it has any.

## The screen changes, and why (the founder's usage ruling only)

| File | Change |
|---|---|
| `src/lib/discovery-stream.ts` | `DiscoveryUsage` loses `betaLeft` and `betaGrant`. `nextResetAt` becomes `string`, because the daily reset always returns. |
| `src/components/discovery/model.ts` | `usageView` and `freeFill` read the daily counter only. The beta branches and the "Beta replies do not reset" copy go. |
| `src/components/discovery/a11y.ts` | `TEXT.usageValues.beta` goes. |
| `src/components/discovery/UsageCard.tsx` | The Beta value pair goes. |
| `design/astra/src/fixture-data.ts`, `fixture-world.ts` | The seeds lose the beta fields. `replyKind` reads the daily counter only. The `beta-limit` refusal goes. |
| `design/astra/src/screens.tsx` (line 616), `design/astra/src/model.ts` (`betaUsed`) | The mock copy and state lose the beta counter. |
| `tests/at/suites/req-004/_flows.ts` (lines 114, 167, 174, 305, 347), `j-need-brief.test.ts` (lines 538, 543 to 548, 553, 607, 622) | The beta assertions go. The daily assertions stay. |
| `j-need-brief.test.ts` registrations | `integration:` points at the same body as `loop:`. No body text changes. |
| `design/discovery-ui-contract.md`, `.taskmaster/docs/acceptance/at-req-004.md`, PRD REQ-004 text | The beta counter goes. These take the doc-sync path. |

No other file under `src/components/discovery/` changes. The port interface is untouched.

## Test harness (unit 5)

```ts
// tests/at/suites/req-004/_screen.ts
export function discoveryScreens() {
  // loop: unchanged (Astra shell). integration: useScreenDriver({ app: 'vite.config.ts', env: stackViteEnv() }) - the app dev server.
  // withDiscovery(integration): const world = await seedDiscoveryWorld(ctx, scenario);
  //   open `/discovery/${world.orgId}/${world.projectId}${start === 'review' ? '?view=review' : ''}`, sign in as world.account;
  //   DiscoveryPage.modelCalls() -> world.modelCalls(): turns seq > world.seededSeq as 'chat-turn', files added after seed as 'file-read'.
}
// tests/at/suites/req-004/_live.ts
export async function seedDiscoveryWorld(ctx, scenario: ScreenScenario): Promise<SeededWorld>;
// From seedState(scenario) in design/astra/src/fixture-data.ts: org + admin + project + need in discovery;
// discovery_briefs (snapshot, revision, lines); settled discovery_turns from the transcript (seq 1 'opening');
// discovery_spend so dailyLeft matches; discovery_files rows (ready, facts, took_from_it); confirmations; funded_at.
// tests/at/harness/screen.ts: useScreenDriver gains an `app` option (vite dev server, path URLs). No new sentinel or capability.
// tests/at/harness/discovery-wire.selftest.ts: wire-type assignability + COPY equals TEXT.
```

## Module map

```
supabase/migrations/
  20261002120000_discovery_brief_store.sql       unit 1  briefs, confirmations, brief_commit, finish
  20261002120100_discovery_billing_opening.sql   unit 2  enum value 'opening'
  20261002120200_discovery_turn_contract.sql     unit 2+3 turn columns, constraint swap, discovery_usage, reserve/settle
  20261002120300_discovery_files.sql             unit 4  bucket, discovery_files, add/stored/progress/fail
supabase/functions/_shared/
  discovery-wire.ts        new   server mirror of the screen types
  discovery-brief.ts       new   pure rules (edit, accept, ask, remove label, answers, reply, finish gate)
  discovery-reply.ts       new   REPLY_TOOL, parseReplyInput, ReplyTextStream, userLineText
  discovery-copy.ts        new   server copy of screen strings
  discovery-state.ts       new   renderDiscoveryState (read boundary)
  discovery-brief-routes.ts new  decide/prepare for discovery-brief and discovery-finish
  discovery-file.ts        new   decide/act, splitIntoParts, readDiscoveryFile
  discovery-turn.ts        edit  new body, prepare with brief, settle with brief, discoveryParts
  discovery-prompt.ts      edit  system block with brief and digests; record_elicitation leaves chat
  discovery-stream.ts      edit  dataPart(type, data, transient)
  discovery-metering.ts    edit  one credit per turn, paid hold
  anthropic-messages.ts    edit  stream tool text; text from tool input
  write-routes.ts          edit  three routes, refusal kinds, settle.parts
  edge.ts                  edit  stream parts hook, new callerReads
supabase/functions/{discovery-state,discovery-brief,discovery-finish,discovery-file}/index.ts   new
supabase/functions/discovery-message/index.ts                                                  edit
src/lib/discovery-port.ts                                   new   the real DiscoveryPort
src/routes/discovery/$organizationId.$projectId.tsx         rewrite  mounts DiscoveryScreen + DiscoveryReview
src/lib/discovery-chat.ts                                   delete (orphaned)
src/lib/discovery-stream.ts, src/components/discovery/{model.ts,a11y.ts,UsageCard.tsx}   beta removal only
tests/at/suites/req-004/{_screen.ts,_live.ts,j-need-brief.test.ts,_flows.ts}            integration path, beta removal
tests/at/harness/{screen.ts,discovery-wire.selftest.ts}                                   app option, drift guard
```

A trace from input to output: screen, then `discovery-port.ts`, then an edge function `index.ts`,
then `_shared/discovery-brief.ts` (rules) and one SQL function (commit). That is three files of
logic, then the database.
