## Problem

The Discovery screen speaks only to `DiscoveryPort` and the fixture world behind it. The live route is an older chat page. The database has turns, a one-shot elicitation, a technical scope, and a token-priced daily credit, and it has no brief, no revision, and no file bytes. The screen will stay as it is, including `use-discovery.ts`, except where the usage call removes the beta counter. A wired backend has to reproduce the fixture's revision, charge, file, and confirmation behavior, and it has to do it through edge functions.

The revision rules are the part that makes the shape non-obvious. The revision bumps by one on a real change and only then. A note that adds nothing does not bump. Finishing does not bump. The same finish on the same revision returns the same confirmation. A real edit clears that confirmation. Dependent topics are marked for review and keep their old answer. Haiku re-lists topics it already agreed, so a model echo must not bump. File reads, the opening reply, and an edit can land at the same time as a turn, and a turn cannot hold a database lock while the model streams.

## Usage (caller's view)

The route mounts the existing screen on the real port. The screen's call sites do not change.

```ts
// src/routes/discovery/$organizationId.$projectId.tsx
const port = createDiscoveryPort({ organizationId, projectId });
return <DiscoveryScreen port={port} onOpenReview={openReview} onBuyFuel={openFuel} />;
```

Send stays the body the hook already builds. `message` is only the note and may be empty when `answers` is not. The transport adds the two ids.

```ts
await chat.sendMessage({ text }, { body: {
  message: note, mode: "answer", expectedCharge, answers,
}});
// stream, then onData: data-brief, data-usage. The hook ignores every other part.
```

A review edit is the same call the hook makes today. The port pushes the person-line and the cleared confirmation on its listener, because the return value is only the brief.

```ts
const saved = await port.saveBriefEdit({ sectionId: "measure", text, baseRevision: brief.revision });
// saved.ok → brief.revision === base + 1, confirmation gone
// saved.refusal.kind === "stale-revision" → listener already received the current brief
```

What comes back from `load` is a `DiscoveryState`. The revision in that brief equals the number of material events. Callers never see an event, a storage path, or a tool payload.

## Shape

The brief is an append-only log, `brief_events`. There is no brief row, no topic table, and no confirmation table. `fold(events)` is a pure function and the only place that knows what a revision means. Material events count. A `confirmed` event does not. The displayed confirmation is the latest `confirmed` event whose `revision` equals that count, so any later material event clears it by derivation. Finish inserts `confirmed` under the idempotency key `finish:<revision>` and a second call returns the stored row.

Commands are pure too. `decide(snapshot, command)` returns one event, a no-op, or a refusal. The edge appends only an event. SQL does not interpret payloads. It locks the project, and for an edit it refuses when the material count differs from `baseRevision`. That is the whole optimistic check. Turns pass no base. A turn and an edit both append deltas, and the fold replays them in order. The model call is never inside the lock.

The model's forced `reply` tool is narration plus decoration. The server applies `answers` from the request and ignores `agreed`, which is how a re-list cannot bump a revision. The server, not the model, chooses the next topics from the checklist on the `opened` event, including the dependency edges. The question sentence is that checklist's `plannedQuestion`. Options, the suggestion, the tier, the fit, the cause labels, and the prose come from the tool, and a tool that fails validation falls back to the checklist's options so the turn still settles. One turn appends at most one `turn-applied` event, and only when an answer, a new question, a label, a tier, or a fit actually changed.

Files are a separate row, updated in place for percent, because progress is not a brief revision. When a read finishes and the fold shows no confirmation, the job appends one material `file-fact`. `load` copies that sentence onto `DiscoveryFile.tookFromIt`. The digest stays on the file row and enters later prompts. The two aggregates meet only in `load`.

`subscribe` polls `load` once a second while any Discovery file is `reading`, including after a reload mid-read. It does not poll while idle. Each write's response is pushed to listeners inside the port method.

One completed free reply debits and charges exactly one credit. The opening reply is billing `opening` and costs zero. Free replies are spent before fuel, including when the project is funded. Fuel available is still the stub that returns 0, so a day with no credits left is `nextReply: "unavailable"` and the screen kind `daily-limit`. There is no beta field.

The port is the deep surface. Behind those nine methods sit the log, the fold, the tool, the credit, and the file job. The screen still cannot see any of them.

## Synthesis decision

The arena fills this section. This candidate is the event-sourced shape.

## Tradeoffs accepted

- We fold the log on every read. A Discovery log is tens of events, and a stored snapshot would be a second source of the revision.
- A turn does not carry `baseRevision`. An edit that lands while the model streams is replayed beside the turn delta. Last event wins per field. We accept that because the lock cannot cover the model call.
- Reading progress lives on `discovery_files`, not in the log. The sentence the brief shows is a `file-fact` event. Percent would otherwise dominate the log and bump the revision.
- Abandon of a free turn still keeps the reserved credit, as the current settle rule does. The opening turn reserves zero, so its abandon is free.
- The checklist's question sentence is fixed at `opened`. The model does not rephrase the card. Wording changes are a new checklist, not a prompt change.
- Cause labels only grow from the model. Only the NGO event removes one. An empty list from the model does not wipe labels.
- Idle tabs do not see another tab's edit until the next `load`, a stale refusal, or a file poll.

## Alternatives considered

A mutable brief row plus topic, question, and confirmation tables matches the plan's wording and makes each edit one update. It hides less. The revision bump, the cleared confirmation, and the idempotent finish become separate writes that can crash apart, and every reader has to remember which column is authoritative.

An event log plus a snapshot table updated in the same transaction reads faster and still rots. The snapshot becomes the thing the next author trusts, and the fold stops being the source.

Letting the model choose which topic is asked next uses more of the `reply` tool. It also makes the unchanged screen tests depend on Haiku's wording, and it gives the re-list bug a second door. The checklist already names the next topic.

## Open questions and risks

- Should the production checklist be the six product topics (who uses it, how they work today, what must change, how they will know, what data, who maintains it), with the Harbor Kitchen six carried only inside a test seed's `opened` payload?
- Screen bodies that `pick` a specific option label pass on the real route only when the seed's checklist owns those labels. Is that the integration rule, or should those sends call Haiku and accept different labels?
- A file that finishes while Finish is open bumps the revision and the finish returns `stale-revision`. Is that the right nudge, or should `file-fact` be non-material so the open review still confirms?
- The existing abandon-keeps-the-credit rule will charge an NGO for a turn that died with no reply. Should unit 3 release that credit when the assistant text is null?
- `usageView` currently reads `briefRef` one render behind a stale push. This design does not change that hook. Do you want it left as it is?

## Next implementation step

Write `brief-fold.ts` and its tests: `fold` of the nine event kinds, `decide` for an edit that is a no-op, a dependent mark, a finish repeated for the same revision, and a turn whose `agreed` echo adds no event.

## Screen changes forced by the usage call

The beta counter is the only product change inside the screen. These are the places, and why.

| Place | Why |
| --- | --- |
| `src/lib/discovery-stream.ts` `DiscoveryUsage` | Drop `betaLeft` and `betaGrant`. `nextResetAt` is the next 00:00 UTC, because free replies return every day. |
| `src/components/discovery/model.ts` `usageView`, `freeFill` | The free gauge is the daily grant alone. Copy that said beta replies do not reset becomes "Free replies return at {time}." |
| `src/components/discovery/UsageCard.tsx` | The Beta line goes. Daily and fuel stay. |
| `src/components/discovery/a11y.ts` `TEXT.usageValues.beta` | The label goes with the line. |
| `design/astra/src/fixture-data.ts`, `fixture-world.ts` | The fixture builds a `DiscoveryUsage` and charges both counters. `replyKind` becomes daily-then-fuel. The `beta-limit` refusal goes. `daily-limit` remains. |
| `tests/at/suites/req-004/j-need-brief.test.ts` AT-004.72 (one usage bar) and AT-004.73 (brief side panel) | They assert "18 of 50" and "17 of 50". Those expectations become the daily count only. |
| `tests/at/suites/req-004/_flows.ts` `expectUsage` | It looks up the accessible name "Beta". |

No other file under `src/components/discovery/` changes. `use-discovery.ts` already sends `expectedCharge` from `nextReply` and applies `data-brief` and `data-usage`. The first reply needs no screen change: `DiscoveryScreen` awaits `load`, and the port's `load` performs the opening call before it returns, so `initial.transcript` already holds that assistant message. A second `load` does not replace the chat, which is why the opening message has to be in the first result.

`src/routes/discovery/$organizationId.$projectId.tsx` is replaced. That is the mount, not a screen-component change. `src/lib/discovery-chat.ts` stays, because the acceptance tests still read the old conversation shape.

## Type sketch

### Event log and files

```sql
-- 20261002120000_discovery_billing_opening.sql
alter type public.discovery_billing add value if not exists 'opening';

-- 20261002120100_brief_events.sql
create table public.brief_events (
  project_id       uuid        not null references public.projects (id),
  seq              bigint      not null,
  kind             text        not null,
  payload          jsonb       not null,
  actor_account_id uuid        not null,
  turn_id          uuid,
  idempotency_key  text,
  recorded_at      timestamptz not null default clock_timestamp(),
  primary key (project_id, seq),
  constraint brief_events_kind check (kind in (
    'opened', 'turn-applied', 'section-edited', 'suggestion-accepted',
    'topic-asked', 'label-removed', 'file-fact', 'confirmed')),
  constraint brief_events_payload_object check (jsonb_typeof(payload) = 'object'),
  unique (project_id, idempotency_key)
);

revoke all on public.brief_events from public, anon, authenticated, service_role;
grant select on public.brief_events to authenticated;
alter table public.brief_events enable row level security;
-- select policies, same shape as discovery_turns: org member, platform admin.
-- no insert, update, or delete policy. Writers are service_role functions.

create table public.discovery_files (
  id            uuid        primary key,
  project_id    uuid        not null references public.projects (id),
  origin        text        not null check (origin in ('discovery')),
  name          text        not null,
  media_type    text        not null,
  byte_size     bigint      not null check (byte_size >= 0 and byte_size <= 52428800),
  storage_path  text        not null,
  status        text        not null check (status in ('reading', 'ready', 'failed')),
  percent       integer     not null default 0 check (percent between 0 and 100),
  facts         integer     check (facts is null or facts >= 0),
  failure_reason text,
  digest        jsonb,
  parts_total   integer     not null default 1 check (parts_total >= 1),
  parts_done    integer     not null default 0 check (parts_done >= 0),
  added_by      uuid        not null,
  added_at      timestamptz not null default clock_timestamp(),
  unique (project_id, name)
);
-- same revoke, grant select, RLS. Intake files are NOT copied here.

-- private bucket discovery-files. No authenticated storage policy.
-- path: {project_id}/{file_id}. The browser never receives it.

create function public.brief_append(
  p_account_id uuid, p_project_id uuid, p_kind text, p_payload jsonb,
  p_base_revision integer,          -- null means append unconditionally
  p_idempotency_key text, p_turn_id uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
  v_existing jsonb;
begin
  -- assert active org admin, discovery not switched off, need stage discovery_in_progress
  perform 1 from public.projects where id = p_project_id for update;
  if p_idempotency_key is not null then
    select payload into v_existing from public.brief_events
     where project_id = p_project_id and idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('inserted', false, 'replayed', true, 'payload', v_existing);
    end if;
  end if;
  select count(*) into v_count from public.brief_events
   where project_id = p_project_id and kind <> 'confirmed';
  if p_base_revision is not null and p_base_revision is distinct from v_count then
    return jsonb_build_object('inserted', false, 'stale', true, 'revision', v_count);
  end if;
  insert into public.brief_events (project_id, seq, kind, payload, actor_account_id, turn_id, idempotency_key)
  values (p_project_id,
          coalesce((select max(seq) + 1 from public.brief_events where project_id = p_project_id), 1),
          p_kind, p_payload, p_account_id, p_turn_id, p_idempotency_key);
  return jsonb_build_object('inserted', true, 'revision',
    case when p_kind = 'confirmed' then v_count else v_count + 1 end);
end $$;
revoke execute on function public.brief_append(uuid, uuid, text, jsonb, integer, text, uuid)
  from public, anon, authenticated;
grant execute on function public.brief_append(uuid, uuid, text, jsonb, integer, text, uuid) to service_role;
```

`revision = count(kind <> 'confirmed')`. The `opened` row is the first material event, so the first brief the NGO sees is revision 1. SQL never folds.

### Fold and commands

```ts
// supabase/functions/_shared/brief-fold.ts
export type TopicId = string;
export type BriefEventKind =
  | "opened" | "turn-applied" | "section-edited" | "suggestion-accepted"
  | "topic-asked" | "label-removed" | "file-fact" | "confirmed";

export type OpenedTopic = {
  id: TopicId; title: string; required: true; importance: Importance;
  why: string; plannedQuestion: string;
  options: { id: string; label: string; answer: string }[];
  suggestedId: string; recommendation: string; uncertaintyHelp: string;
  dependsOn: TopicId | null;
};

export type BriefEvent =
  | { kind: "opened"; payload: { need: string; topics: OpenedTopic[] } }
  | { kind: "turn-applied"; payload: TurnDelta }
  | { kind: "section-edited"; payload: { sectionId: string; text: string; line: string } }
  | { kind: "suggestion-accepted"; payload: { topicId: TopicId; line: string } }
  | { kind: "topic-asked"; payload: { topicId: TopicId } }
  | { kind: "label-removed"; payload: { label: string } }
  | { kind: "file-fact"; payload: { fileId: string; fileName: string; tookFromIt: string; facts: number } }
  | { kind: "confirmed"; payload: { approver: string; at: string; acceptedGaps: Confirmation["acceptedGaps"] } };

export type Fold = {
  brief: BriefSnapshot;                 // revision === material count
  confirmation: Confirmation | null;    // latest confirmed whose revision === brief.revision
  personLines: { id: string; revision: number; text: string }[]; // id = `you-${revision}`
  fileFacts: { fileId: string; fileName: string; tookFromIt: string; facts: number }[];
};

export function fold(events: readonly BriefEvent[]): Fold {
  throw new Error("not implemented");
}

export type Command =
  | { kind: "turn"; answers: DiscoveryAnswer[]; tool: ReplyTool; round: number; userLineId: string }
  | { kind: "edit"; sectionId: string; text: string; baseRevision: number }
  | { kind: "accept"; topicId: string; baseRevision: number }
  | { kind: "ask"; topicId: string }
  | { kind: "remove-label"; label: string; baseRevision: number }
  | { kind: "file-fact"; fileId: string; fileName: string; tookFromIt: string; facts: number }
  | { kind: "finish"; revision: number; acks: { reviewed: true; openGaps: boolean; data: boolean }; approver: string; at: string };

export type Decision =
  | { kind: "append"; event: BriefEvent; baseRevision: number | null; idempotencyKey: string | null }
  | { kind: "noop"; brief: BriefSnapshot }
  | { kind: "replay"; confirmation: Confirmation }
  | { kind: "refuse"; refusal: DiscoveryRefusal };

export function decide(snapshot: Fold, command: Command): Decision {
  throw new Error("not implemented");
  // turn: apply answers onto topics (certain → agreed source chat+round, uncertain → not-sure).
  //       Ignore tool.agreed. Ask the next one or two topics whose dependsOn is agreed
  //       and which have no question yet. At most three unsettled questions.
  //       Add cause labels up to 3, normalized (trim, lower, collapse spaces), never remove.
  //       Set dataTier and fit only when the value changed.
  //       Mark dependents (topic.dependsOn) needsReview, keep the old answer.
  //       If nothing in the brief changed, return noop. Else one turn-applied, baseRevision null.
  // edit: unknown id → unknown-section. Same text and not needsReview → noop.
  //       Else section-edited, baseRevision set. "I'm not sure" stores not-sure.
  // accept: confirmed → finished. No suggestion → no-suggestion. Else suggestion-accepted.
  // ask: question already present → noop. Unknown topic → unknown-topic. Else topic-asked.
  // remove-label: label absent → noop. Else label-removed.
  // file-fact: snapshot.confirmation set → noop (digest still stored on the file). Else append.
  // finish: confirmation already at this revision → replay.
  //         a discovery file reading → file-reading. revision mismatch → stale-revision.
  //         open topics and !acks.openGaps → open-gaps. tier 1 or 2 and !acks.data → data-ack.
  //         Else confirmed, idempotencyKey finish:${revision}, baseRevision null.
}
```

`TurnDelta` is the applied result, not the tool input: agreed topic ids, new question ids, labels added, tier, fit. `fold` applies that delta. Replaying the log does not consult the model.

Product `opened` payload, used when a project has no events:

```ts
export const PRODUCT_CHECKLIST: OpenedTopic[] = [
  { id: "users",  title: "Who uses it",          dependsOn: null,     importance: "needed", /* plannedQuestion, options */ } as OpenedTopic,
  { id: "today",  title: "How you work today",   dependsOn: null,     importance: "needed" } as OpenedTopic,
  { id: "change", title: "What must change",     dependsOn: null,     importance: "needed" } as OpenedTopic,
  { id: "measure",title: "How you will know",    dependsOn: "change", importance: "needed" } as OpenedTopic,
  { id: "data",   title: "What data it handles", dependsOn: "change", importance: "needed" } as OpenedTopic,
  { id: "owner",  title: "Who maintains it",     dependsOn: "today",  importance: "needed" } as OpenedTopic,
];
```

A test seed inserts an `opened` event whose topics are the Harbor Kitchen six and the fixture's dependency edges (`measure` on `priority`, `rules` on `booking`, `info` on `owner`). Same `fold`, different payload.

### Reply tool and the stream

```ts
// supabase/functions/_shared/reply-tool.ts
export const REPLY_TOOL = {
  name: "reply",
  description: "The whole reply. text is the first property.",
  input_schema: {
    type: "object",
    properties: {
      text: { type: "string" },
      questions: { type: "array" /* topicId, options[2..4], suggested index, importance, recommendation, uncertaintyHelp */ },
      suggestions: { type: "array" /* topicId, text; open topics only */ },
      causeLabels: { type: "array", items: { type: "string" }, maxItems: 3 },
      dataTier: { type: ["object", "null"] /* tier 0|1|2, reason */ },
      fit: { type: ["object", "null"] /* fits|declined, reason */ },
    },
    required: ["text", "questions", "suggestions", "causeLabels", "dataTier", "fit"],
  },
} as const;

export type ReplyTool = {
  text: string;
  questions: { topicId: string; options: string[]; suggested: number; importance: Importance;
    recommendation: string; uncertaintyHelp: string }[];
  suggestions: { topicId: string; text: string }[];
  causeLabels: string[];
  dataTier: { tier: 0 | 1 | 2; reason: string } | null;
  fit: { verdict: "fits" | "declined"; reason: string } | null;
};

/** Incremental decode of the first JSON string property. One-shot fallback if `text` is not first. */
export function textDeltas(previousJson: string, nextJson: string): string {
  throw new Error("not implemented");
}

export function parseReplyTool(input: unknown): ReplyTool | null {
  throw new Error("not implemented");
}
```

`discovery-message` streams, in this order: `start`, `text-start`, `text-delta` from `textDeltas`, `text-end`, then `data-filed` when any answer was certain, `data-charge` (`{ kind: "free" }` or `{ kind: "paid", usageMicros, feeMicros }`), one `data-question` per unsettled question, then transient `data-brief` and `data-usage`, then `finish` and `[DONE]`. It does not emit `data-turn` or `data-ready`. When the fold shows every required topic agreed, the server appends the fixture's ready sentence to `text` itself.

Settle and `brief_append` of `turn-applied` are one RPC, `discovery_turn_settle`, extended with `p_event jsonb`. The turn row stores `brief_intent jsonb` in that same update. If the process dies after the model returns and before the RPC, the open row is abandoned under the existing rule and no event exists. If the RPC commits, the event and the charge commit together. The idempotency key `turn:<turnId>` makes a retry insert nothing.

A tool that does not parse settles the turn as `failed`, releases the credit, and the stream emits `error` with the refusal JSON so the hook restores the draft. Partial text already sent is rolled back by that same hook path.

### Turn body and credits

```ts
// decideDiscoveryMessage reads this. Empty message is legal when answers.length > 0 or kind is opening.
export type DiscoveryMessageBody = DiscoveryRequestBody & {
  kind?: "opening"; // port-only. No credit, no expectedCharge check.
};

export type ChargeMode = "free" | "paid" | "unavailable";

export function chargeMode(input: { dailyLeft: number; availableMicros: number; holdMicros: number }): ChargeMode {
  if (input.dailyLeft > 0) return "free";
  if (input.availableMicros >= input.holdMicros) return "paid";
  return "unavailable";
}
```

Reserve order, replacing the funded-forces-fuel branch:

1. Refuse `finished` when the fold's confirmation is set, `discovery-ready` when every required topic is settled and `answers` is empty, `invalid-request` when the body is not a `DiscoveryRequestBody`.
2. `kind: "opening"` only when the project has no settled turn and no open turn. Billing `opening`, reserved credits 0. A second opener gets `turn-in-flight` and the port polls `load` until that turn settles.
3. Otherwise compute `chargeMode`. If it is `unavailable`, refuse `daily-limit` with the fixture's sentence and do not insert a row. If `expectedCharge` differs, refuse `mode-changed` and do not debit.
4. Billing `free` debits exactly 1 from `discovery_spend`. Billing `fuel` stays the stub: `project_fuel_available_micros` returns 0, so step 3 already refused. Retry of the same text after `failed` stays 0 credits.
5. Completed `free` charges exactly 1, whatever the token count. `opening`, `retry`, and `failed` charge 0. Token micros stay on the row for the receipt and are not converted into credits. The check constraint that equates a free charge with `ceil(micros / 100000)` is replaced in this migration. The metering tests that assert that formula (AT-004.01, AT-004.46, and the reserve/settle bodies beside them) are updated in the usage unit.

`holdMicros` returned to the screen is `250_000`. `availableMicros`, `reservedMicros`, `allocationMicros`, and `settledMicros` are 0 while fuel is a stub. `dailyGrant` is `discovery_daily_grant` (10, or 30 when vetted). `dailyLeft` is `granted - spent`. `nextResetAt` is the next 00:00 UTC.

System-error retry is the existing `retry` billing. The opening call is not a retry.

Skill `06-write-the-scope` leaves the chat prompt. `record_elicitation` leaves the tool list. `decline_off_topic` stays on free and opening turns. Digests of ready files are appended to the uncached system block as text. Bytes are not.

### Files

```ts
// supabase/functions/discovery-file/index.ts  action is the POST itself
export type AddFileResult = Result<DiscoveryFile>;

// discovery_file_insert locks the project, counts origin=discovery rows,
// refuses file-limit when funded_at is null and the count is 3,
// refuses duplicate-file on the same name, refuses finished when the fold has a confirmation.
```

The port sends the bytes to `discovery-file`. The function writes the object, inserts `status = reading`, `percent = 5`, returns the `DiscoveryFile`, and `EdgeRuntime.waitUntil(readDiscoveryFile(fileId))`. The read is not a turn and does not touch `discovery_spend`.

```ts
// supabase/functions/_shared/file-read.ts
export const PART_CHARS = 60_000;
export function extractText(bytes: Uint8Array, mediaType: string): string {
  throw new Error("not implemented"); // utf-8, csv, docx xml. Empty extract → status failed.
}
export const DIGEST_TOOL = { name: "digest", /* facts[], questions[], tookFromIt, done */ };
```

Each part is one forced `digest` call carrying the running digest. After each part the row's `percent` becomes `floor(100 * partsDone / partsTotal)`. The last part sets `status = ready`, `facts`, and `digest`. Then `decide` for `file-fact`: append only when the fold has no confirmation. A confirmed project still reaches `ready` so the row is not stuck on "Reading", and `tookFromIt` stays empty because no event was appended.

`load` builds `files` as intake metadata mapped from `need_intakes.reference_files` (`origin: "intake"`, not counted) plus `discovery_files` rows, with `tookFromIt` taken from `fold.fileFacts`.

### Real port

```ts
// src/lib/discovery-port.ts
export function createDiscoveryPort(input: {
  organizationId: string; projectId: string;
}): DiscoveryPort {
  const listeners = new Set<(change: ServerChange) => void>();
  const push = (change: ServerChange) => { for (const listener of listeners) listener(change); };
  return {
    async load() {
      let state = await postBrief("load");
      if (state.ok && state.value.transcript.length === 0) {
        await postMessage({ kind: "opening", message: "", mode: "answer", expectedCharge: "free", answers: [] });
        state = await postBrief("load"); // turn-in-flight → poll until the opening turn settles
      }
      watchFiles(state);
      return state;
    },
    chat: new DefaultChatTransport<DiscoveryUIMessage>({
      api: functionsUrl("discovery-message"),
      headers: authHeaders,
      body: { organizationId: input.organizationId, projectId: input.projectId },
      fetch: async (url, init) => {
        const response = await fetch(url, init);
        if (!response.ok) throw new Error(JSON.stringify(await refusalOf(response)));
        return response;
      },
    }),
    async addFile(file) {
      const result = await postFile(file);
      if (result.ok) push({ files: await currentFiles() }); // the hook ignores result.value
      watchFiles(await postBrief("load"));
      return result;
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async saveBriefEdit(body) { return writeBrief("edit", body); },
    async acceptSuggestion(body) { return writeBrief("accept", body); },
    async askTopic(body) { return writeBrief("ask", body); },
    async removeCauseLabel(body) { return writeBrief("remove-label", body); },
    async finish(body) { return writeBrief("finish", body); },
  };
  function watchFiles(state: Result<DiscoveryState>): void { throw new Error("not implemented"); }
  // while any discovery file is reading, load() every 1s and push { files, brief, confirmation }.
  // stop when none are reading.
  async function writeBrief(action: string, body: unknown): Promise<Result<never>> {
    throw new Error("not implemented");
    // on stale, push({ brief }) before returning the refusal.
    // on an edit or an accept, push({ brief, transcript: personLines, confirmation: null }).
  }
}
```

Refusal kinds the edge returns, which `parseRefusal` already understands: `finished`, `discovery-ready`, `mode-changed`, `daily-limit`, `stale-revision`, `file-limit`, `duplicate-file`, `file-reading`, `open-gaps`, `data-ack`, `no-suggestion`, `unknown-section`, `unknown-topic`, `email-unverified`, `discovery-disabled`, `turn-in-flight`, `need-not-in-discovery`, `invalid-request`. The port maps the old SQL details `daily-allowance-exhausted`, `debit-exceeds-remaining`, and `fuel-exhausted` to `daily-limit` so the hook's `mode-changed` reload path is the only special case.

`discovery-brief` is one edge function. Actions: `load`, `edit`, `accept`, `ask`, `remove-label`, `finish`. It is a write route for every action except `load`, which is a caller-JWT read of events, files, turns, and `viewer_discovery_allowance`, folded in the function. `load` returns `DiscoveryState`. The other actions return the folded brief or the confirmation, plus `personLines` and `confirmation` so the port can push them.

`discovery-conversation` is left on its current contract. The old acceptance bodies read it. The screen does not.

### Module map

| Path | Owns |
| --- | --- |
| `supabase/migrations/20261002120000_discovery_billing_opening.sql` | Enum value `opening`, alone in its migration. |
| `supabase/migrations/20261002120100_brief_events.sql` | `brief_events`, `discovery_files`, bucket, RLS, `brief_append`. |
| `supabase/migrations/20261002120200_discovery_one_credit.sql` | Reserve and settle: one credit, free before fuel, `brief_intent`, event insert in the settle transaction. |
| `supabase/functions/_shared/brief-fold.ts` | `fold`, `decide`, `PRODUCT_CHECKLIST`. Pure. |
| `supabase/functions/_shared/reply-tool.ts` | Tool schema, `parseReplyTool`, `textDeltas`. Pure. |
| `supabase/functions/_shared/discovery-usage.ts` | `chargeMode`, `DiscoveryUsage` from the allowance row and the fuel stub. Pure. |
| `supabase/functions/_shared/file-read.ts` | Extract, part, digest tool. |
| `supabase/functions/discovery-brief/index.ts` | The six brief actions. |
| `supabase/functions/discovery-file/index.ts` | Upload and `waitUntil` read. |
| `supabase/functions/discovery-message/index.ts` | Existing route. Body grows `answers`, `expectedCharge`, `kind`. |
| `supabase/functions/_shared/discovery-turn.ts` | Prepare, forced `reply`, settle-with-event. |
| `supabase/functions/_shared/discovery-prompt.ts` | Skill 06 and `record_elicitation` removed. Digests added. |
| `supabase/functions/_shared/discovery-stream.ts` | The screen's data parts. `dataTurn` stops being emitted. |
| `supabase/functions/_shared/write-routes.ts` | Register `discovery-brief` and `discovery-file`. Add the screen refusal kinds. |
| `src/lib/discovery-port.ts` | `createDiscoveryPort`. |
| `src/routes/discovery/$organizationId.$projectId.tsx` | Sign-in, then `DiscoveryScreen` on that port. |
| `tests/at/suites/req-004/_screen.ts` | Loop keeps the Astra shell. Integration builds the app, signs in, opens `/discovery/$organizationId/$projectId`. `modelCalls()` counts new `discovery_turns` as `chat-turn` and new file rows as `file-read`. |
| `supabase/functions/_shared/discovery-metering.ts` | `settlementFor` returns 1 charged credit for a completed free reply. |

Trace for one edit: `discovery-port.ts` → `discovery-brief/index.ts` → `brief-fold.ts` then `brief_append`. Three files. Trace for one send: `discovery-message` → `reply-tool.ts` and `brief-fold.ts` → settle RPC. The route file is wiring, not a step in that chain.