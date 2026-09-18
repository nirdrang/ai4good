# Candidate: scope generation inside the Discovery turn

Attribution: unattributed / AI4DEV-135 structured scope output and rendering / architecture exploration.

## Problem

Discovery already has a transactional boundary: reserve one turn, call the model, and settle that turn. This design adds scope generation to that boundary through a second strict tool, `record_scope`. The settling turn stores the scope beside the unchanged five-key elicitation record, becomes its immutable version, and atomically updates the need’s cause labels. The difficult parts are preserving both tool calls, enforcing free-phase behavior without applying it to fuel, and making regeneration and system-error retries cost zero credits without losing provider-spend accounting. The existing chat stream, tenant isolation, notification emitter, and two need stages remain the integration boundaries.

## Usage (caller’s view)

The current chat request continues to work. Completion adds a scope snapshot to its JSON response and a `data-scope` stream part. The backend supplies the rendered document as assistant text, so the existing page can display it without understanding the new part.

```ts
// Existing chat caller: unchanged request.
const response = await fetch("/functions/v1/discovery-message", {
  method: "POST",
  headers: authenticatedJsonHeaders,
  body: JSON.stringify({
    organizationId,
    projectId,
    message: "Yes. Only our coordinators should change a delivery date.",
  }),
});

// JSON response adds scope: ScopeSnapshot | null.
// SSE still contains text parts and data-turn; data-scope is additive.
```

Regeneration uses the same chat route with a discriminated action. The request identifies the scope being rejected and records the reason. A repeated request identifier returns its existing operation rather than generating again.

```ts
const response = await fetch("/functions/v1/discovery-message", {
  method: "POST",
  headers: authenticatedJsonHeaders,
  body: JSON.stringify({
    organizationId,
    projectId,
    action: "regenerate",
    requestId,
    baseScopeTurnId: rejectedScope.version.turnId,
    reason: "Start with volunteer availability; leave delivery routing for later.",
  }),
});

// Outcome: a new scope, an in-progress operation, a budget deferral,
// or an escalation receipt. No credit debit for regeneration.
```

Future PRD authoring resolves “latest” once and retains that version. The scorer reads that exact version, even if the NGO regenerates meanwhile. These downstream callers are interface examples, not implementations delivered here.

```ts
import { readScopeSnapshot } from "./scope.ts";

const source = await readScopeSnapshot(reads, projectId, { kind: "latest" });
if (source.kind !== "found") throw new Error("A scope is required");

const draft = await prdAuthorStub.author({
  source: source.snapshot,
});

const reference = await readScopeSnapshot(reads, projectId, {
  kind: "version",
  version: draft.sourceScopeVersion,
});
if (reference.kind !== "found") throw new Error("The source scope is unavailable");

await completionScorerStub.score({
  draft,
  reference: reference.snapshot,
});
```

Label correction is a separate deletion-only write:

`POST remove-need-cause-label { organizationId, projectId, label }`

The label must already belong to that need, or already have been removed from it. There is no caller-supplied label array, vocabulary insertion endpoint, rename operation, or taxonomy-management surface.

## Shape

### Turn ledger as the aggregate

A scope lives in `discovery_turns.scope`, with its schema version inside the JSON. Its version identity is `{ projectId, turnId, seq }`; sequence numbers may have gaps between scopes because ordinary chat turns also occupy the sequence.

“Completed Discovery” means a validated scope committed on a settled turn. An elicitation with `complete: true` makes scope generation eligible; it does not, by itself, mark the Discovery completed. The ceiling forces a wrap-up attempt, but a fresh-Discovery instruction is an allowed outcome when there is insufficient information.

The normal completing model response emits both tools. A scope-only response is also valid when a previously settled elicitation already exists, including regeneration. Validation examines the complete tool list, independent of block order. Duplicate calls to either tool, malformed scope output, or scope output without a current or prior completed elicitation fail the attempted completion. They never silently become a completed Discovery.

The need remains `discovery_in_progress`. Its read model gains a derived `scopeState`:

- `not_generated` when no settled scope exists;
- `available` with the latest scope version otherwise.

This is an artifact-availability mark, not a lifecycle transition or permission to publish. No stored `scoped` stage, task decomposition, fit-decline workflow, or publish engine is introduced.

Per **encode-lessons-in-structure**, the scope type requires both build-split parts and distinguishes a version reference from a project identifier. Per **single source of truth**, scope history and current scope derive from the ledger rather than a separately maintained current-scope pointer.

### Generation and transaction flow

1. `discoveryPrepare` reads the need, mission, settled history, current scope, removed labels, and shared vocabulary. It constructs and counts the exact model request.
2. Reserve checks current billing, conversation sequence, current scope version when applicable, and available budgets under database locks. A funding change between preparation and reservation produces `stale-context`; preparation must repeat with the correct policy.
3. The existing Anthropic port makes one chat model call. Both `create` and `stream` preserve every tool block.
4. The turn module validates the tools and assistant text, renders any scope, and prepares the settlement.
5. `discovery_turn_settle` atomically stores the scope, inserts genuinely new vocabulary strings, applies current label removals, updates `need_intakes.cause_labels`, records guardrail facts, settles metering, and emits any required notification.
6. Only committed output is published as final assistant text and structured stream data.

The immutable trigger permits the new outcome columns to change only during the existing `open → terminal` transition. Extending its allow-list does **not** permit changes after settlement.

The public capability remains shallow in size and deep in behavior: one chat operation, one versioned scope read, and one label-removal operation. Callers supply intent and version identity; they do not coordinate model calls, vocabulary writes, refunds, counters, or notifications. Transport parsing stays in the route and port adapters, per **boundary-discipline**.

### Scope contract and rendering

The contract contains:

- Summary.
- User stories with nested acceptance criteria.
- Suggested stack.
- Complexity tier, rationale, and start-small advice.
- Risk flags.
- Data-sensitivity tier and rationale.
- Maintainability-fit verdict and rationale.
- Zero to three normalized cause labels.
- Lovable recommendation and rationale.
- Both Lovable-built and Claude-Code-coded parts, each nonempty.

The sensitivity and maintainability fields have explicit shapes now. This run tests their presence and rendering, not whether the model’s judgments satisfy the later sensitivity and fit requirements. No `publishable: true` assertion is inferred from these fields.

`scope.ts` owns the domain contract, boundary validation, versioned reads, and renderer. `scope-copy.ts` owns fixed explanatory copy. The renderer uses CommonMark headings and lists supported by the current page.

Every rendered scope explains its assigned data tier. Tier 2 states that builds use synthetic or anonymized fixtures, the NGO connects real data after completion, and real Tier-2 data must not reach Anthropic, Lovable, or the volunteer. All documents explain complexity without money, start-small advice, evolving the application through chat, NGO ownership of the code, and the approximate Lovable maintenance subscription paid directly by the NGO. A positive Lovable recommendation includes the fixed pricing link.

The prescribed approximately `$25/month` statement is requirement copy, not a claim that this run verified current vendor pricing.

Money-free output requires more than omitting a cost field:

- The prompt forbids project and build estimates.
- Validation checks every model-authored string in the scope and assistant reply before storage or delivery.
- Currency figures and recognizable project/build-estimate constructions cause output validation failure. Fixed maintenance copy and separately rendered turn-cost metadata are permitted by provenance, not by globally allowing the number 25.
- The renderer escapes model strings as text and supplies its own links.
- Tests cover numeric, currency-symbol, spelled-out, and money-denominated complexity examples.
- Live semantic fixtures test claims that lexical checks cannot comprehensively prove.

To avoid leaking an estimate or decline marker before validation, this design buffers provider text. It retains the SSE protocol but emits validated text after settlement. A scope turn’s `assistant_message` stores its rendered document, preserving the document shown for that version. The stream sequence remains `start`, `text-start`, validated `text-delta`, `text-end`, `data-turn`, optional `data-scope`, `finish`, `[DONE]`.

### Versioned read and downstream stubs

The existing `discovery-conversation` read adds the latest scope and accepts an optional exact scope-turn selector. The common domain read validates project membership and confirms that the selected turn belongs to that project, is settled, and contains a supported scope schema. An explicit missing version returns `not_found`; it never falls back to latest.

Two test-only consumer stubs establish the future contract:

1. **PRD author stub:** receives the complete scope snapshot and returns a draft carrying that exact source version.
2. **Completion scorer stub:** receives the draft and the same source snapshot; rejects a different version, including a newer scope generated between authoring and scoring.

A companion type-level fixture makes initial decomposition accept a passing PRD reference, not a `ScopeSnapshot`. A nonempty-source scan covers routes, shared modules, UI, and migrations for scope-to-task producers.

These checks establish the interface and present absence. They cannot prove that unbuilt production authoring, scoring, or backlog generation obeys it. AT-004.24 and AT-004.52 therefore stay pending at both tiers.

### Cause vocabulary and deletion

`discovery_cause_vocabulary` is a shared, append-only set of canonical label strings. It contains no organization identifiers, mission text, or examples from private conversations.

The table uses the existing `unreachable-by-client-roles` posture. A caller-authenticated, security-definer **read** function exposes only label strings to the backend’s `CallerReads` adapter. This avoids adding a third tenant posture merely to support global vocabulary selection. The edge route remains the UI’s only access path; no UI database calls are introduced.

The prompt has three system blocks:

1. Static instructions and generated Discovery skills, cached.
2. Need details, uncached.
3. Mission, vocabulary, removed labels, prior structured artifacts, and the current free/fuel policy, uncached.

The third block instructs the model to select existing labels before proposing new ones and to emit none when evidence is thin. User and mission text remain source material, never instructions.

At settle, label strings are trimmed, whitespace-normalized, case-normalized, deduplicated, and limited to three. Exact canonical collisions use `INSERT … ON CONFLICT DO NOTHING`. All vocabulary insertion happens inside scope settlement; no client can submit a scope payload or labels as part of a write request.

Semantic synonym reuse remains a model judgment. A uniqueness constraint cannot prove that “hunger relief” means the same thing as “food security.” Loop tests prove vocabulary delivery and the handling of a scripted choice; live tests prove the model’s choice.

The NGO and the model own separate state, per **separate-before-serializing-shared-state**:

- The model owns immutable generated labels in scope history.
- The NGO owns `need_intakes.removed_cause_labels`.
- The current need label projection is the latest generated set minus removed labels.

Removal and settlement acquire the project lock before the need row lock. Settlement applies the latest removal set, so an in-flight generation cannot undo an NGO deletion. A repeated removal is a no-op success. Historical scope snapshots remain unchanged; current classification displays read the need projection. Regeneration is instructed to exclude removed labels, and settlement enforces the exclusion on the current projection even if the model ignores it.

Different projects can add vocabulary labels concurrently. Exact duplicates converge through the primary key; semantic synonyms proposed from concurrent stale snapshots remain a stated model-quality risk. No global vocabulary lock is held across a model call.

### Free-phase guardrails

Reserve snapshots `billing` from the project. This value controls all free-phase behavior for that turn.

**Scope rule.** Only the free-policy prompt contains the instruction to decline or redirect unrelated general questions, document drafting, translation, and coding help. The currently unconditional “stay within the stated need” restriction must move into that conditional policy; the skill bodies are audited for equivalent unconditional restrictions.

**Deterministic decline fact.** On an off-topic free request, the model returns exactly the reserved response:

`[[DISCOVERY_OFF_TOPIC_DECLINE_V1]]`

The response parser recognizes only the complete trimmed assistant response, with no tool calls. It does not count a quoted marker, a marker in user text, or a phrase resembling a refusal. The backend replaces it with fixed, plain redirection copy and sets `off_topic = true`.

Thus the platform counts actual emitted decline events, not a model-supplied cumulative count or its opinion that the user “often” goes off topic. The classification that chooses the marker remains a model judgment, tested live.

**Repeated declines.** At the proposed threshold of three settled free decline events in this project conversation, settlement appends:

> Discovery has redirected several requests because the free conversation is for scoping this need. You can continue scoping. The platform founder can see this notice.

The threshold-crossing turn records `off_topic_notice = true` and emits one `discovery.off_topic_review` event for `platform_admin`, with an in-app delivery. The notification and turn commit together. Subsequent declines do not emit duplicate founder notifications. The flag never changes account access, organization switches, or reserve eligibility.

**Ceiling.** Propose ten settled free conversational turns, including decline turns. Failed, abandoned, regeneration, escalation, and fresh-instruction control turns do not increment the ceiling. A retry of a failed conversational turn counts once when it succeeds.

On the tenth conversational turn, the request instructs the model to emit the elicitation and scope if enough information exists. If it cannot, settlement substitutes the fixed fresh-Discovery instruction. A malformed attempted scope remains a system failure and can be retried; it does not advance the settled-turn count.

After the ceiling, ordinary free chat requests receive the same instruction without a model call or credit debit. A settled, zero-usage control turn records that instruction for reloads. A fresh Discovery means starting a new need through the existing intake flow, not deleting history or silently resetting this project’s counters. Regeneration of an existing scope remains available up to its separate bound.

**Fuel bypass.** Funded turns have no scope restriction, decline marker protocol, ceiling wrap-up, repeated-decline notice, or founder flag. Their persisted guardrail booleans must be false. Switching to fuel leaves old history intact but produces no new free-phase effects. Fuel cost and gauge behavior remain owned by the existing and pending billing surfaces.

The ceiling pin is provisional until the founder rules. The repeated-decline threshold is also an explicit proposed pin rather than an unexplained literal.

### Regeneration, retries, and zero-credit accounting

Regeneration is a new turn using the same prompt, tool, port, and settle path. It is not a separate model workflow.

The server verifies that `baseScopeTurnId` identifies the latest scope, logs a nonempty reason at reserve time, and allocates one of three regeneration slots. The bound is per project, so regeneration cannot reset it by creating a new scope version.

A slot represents a requested replacement, not every provider attempt. Failed attempts retain the slot and are retried through `retryOfTurnId`; a successful retry completes that same slot. A caller cannot open a fourth slot or pass an arbitrary zero-cost flag. There is one open turn per project throughout.

`credit_policy` is separate from `billing`:

- Ordinary free conversation: `billing = free`, `credit_policy = metered`.
- Free regeneration and eligible system retry: `billing = free`, `credit_policy = waived`.
- Fuel turns still route to fuel and always touch zero free credits.
- Model-free control turns have zero token and provider reservations.

For waived free turns, `reserved_credits = charged_credits = 0`. They never call the allowance debit or release functions, including transiently. Actual provider usage remains recorded; success is a measured settled turn, never a fake failed turn.

A system retry requires a persisted eligible predecessor in the same project. Eligibility is computed by the server:

- Provider transport errors, provider server errors, and invalid required structured output qualify.
- A missing-status transport failure is explicitly settled as failed rather than intentionally left open.
- An expired open turn can be abandoned under the existing conservative reservation rule and retried as an uncertain system interruption.
- User cancellation and ordinary provider refusal do not create a retry entitlement.
- A retry reuses the original user request and regeneration reason; it cannot substitute unrelated work.
- One predecessor can have only one retry child. A further retry must reference the failed child.

Request identifiers and predecessor uniqueness prevent duplicate HTTP requests from making duplicate model calls. Repeating a settled operation returns the recorded result. Repeating an open operation returns its identity and in-progress status. Settlement replay returns the existing terminal row without rewriting it or re-emitting notifications, per **make-operations-idempotent**.

**Provider-spend bound.** Zero credits do not mean zero provider cost. To preserve AT-004.49, reserve derives committed free-phase provider exposure from the organization’s turn ledger for the UTC day:

- Known completed usage contributes actual micros.
- Open, abandoned, and failed attempts with unknown usage contribute reserved micros.
- Known pre-provider failures contribute zero.
- Model-free control turns contribute zero.

All Discovery reserve and settle operations take the same organization-scoped transaction advisory lock before project locks. The existing `(org_id, utc_day)` index supports the sum. Available provider headroom is the daily grant converted at the existing ratio, minus this committed exposure. A metered turn must fit both provider headroom and credit headroom; a waived turn must fit provider headroom but does not consume credits.

If a waived operation cannot fit, it returns a plain budget-deferral response and is not allocated a new regeneration slot. It can run on a later day. No supplemental credits are created, and no charge is hidden in the credit gauge. Failed or unknown attempts remain in provider exposure, preventing repeated “free retries” from bypassing the platform-spend bound.

This is an explicit policy interpretation: zero-credit operations remain subject to the daily provider-spend limit. If regeneration must always run immediately at zero daily headroom, the founder must authorize a separate subsidy policy; the present requirements cannot promise both simultaneously.

**Exhaustion.** After three successful replacement slots, another regeneration request creates a zero-usage settled control turn with `purpose = regeneration_escalation`, the attempted reason, the referenced scope, and an admin-notification identifier. It performs no model call.

The reserve definer emits `discovery.regeneration_review` for `platform_admin`, with email and in-app delivery, in the same transaction. The ledger control turn is the durable escalation record. This run does not build an operations queue or disposition workflow. A unique partial index permits one escalation per project; repeated attempts return that record and do not notify again.

### Type sketch

All bodies below intentionally remain unimplemented. Existing caller, read-result, allowance, elicitation, and turn types are imported rather than duplicated.

```ts
// supabase/functions/_shared/scope.ts

import type { CallerReads } from "./discovery-reads.ts";

declare const checkedScope: unique symbol;

export type NonEmpty<T> = readonly [T, ...T[]];
export type CauseLabels =
  | readonly []
  | readonly [string]
  | readonly [string, string]
  | readonly [string, string, string];

export type ScopeContractV1 = Readonly<{
  schemaVersion: 1;
  summary: string;
  userStories: NonEmpty<{
    story: string;
    acceptanceCriteria: NonEmpty<string>;
  }>;
  suggestedStack: NonEmpty<string>;
  complexity: {
    tier: "small" | "medium" | "large";
    rationale: string;
    startSmallAdvice: string;
  };
  riskFlags: readonly string[];
  dataSensitivity: {
    tier: 0 | 1 | 2;
    rationale: string;
  };
  maintainabilityFit: {
    verdict: "fit" | "decline";
    rationale: string;
  };
  causeLabels: CauseLabels;
  lovable: {
    recommended: boolean;
    rationale: string;
  };
  buildSplit: {
    lovableBuilt: NonEmpty<string>;
    claudeCodeCoded: NonEmpty<string>;
  };
}>;

export type ValidatedScope =
  ScopeContractV1 & { readonly [checkedScope]: true };

export type ScopeVersion = Readonly<{
  projectId: string;
  turnId: string;
  seq: number;
}>;

export type ScopeSnapshot = Readonly<{
  version: ScopeVersion;
  settledAt: string;
  contract: ValidatedScope;
  /** Frozen assistant document from the scope-bearing turn. */
  markdown: string;
}>;

export type ScopeSelector =
  | { kind: "latest" }
  | { kind: "version"; version: ScopeVersion };

export type ScopeRead =
  | { kind: "found"; snapshot: ScopeSnapshot }
  | { kind: "not_found" }
  | { kind: "unavailable"; reason: string };

export type ScopeValidation =
  | { ok: true; scope: ValidatedScope }
  | {
      ok: false;
      kind: "invalid-shape" | "invalid-labels" | "money-estimate";
      paths: readonly string[];
    };

/** Validate unknown tool input once; reject unknown keys at every level. */
export function parseScope(input: unknown): ScopeValidation {
  throw new Error("not implemented");
}

/** Pure CommonMark rendering; fixed copy owns pricing and links. */
export function renderScope(scope: ValidatedScope): string {
  throw new Error("not implemented");
}

/** Explicit version misses never fall back to latest. */
export async function readScopeSnapshot(
  reads: Pick<CallerReads, "project" | "discoveryTurnsOf">,
  projectId: string,
  selector: ScopeSelector,
): Promise<ScopeRead> {
  throw new Error("not implemented");
}
```

```ts
// Additions to discovery-turn.ts / discovery-reads.ts.

import type {
  ValidatedScope, ScopeSnapshot, ScopeVersion,
} from "./scope.ts";

export type DiscoveryIntent =
  | { kind: "message"; message: string; requestId: string }
  | {
      kind: "regenerate";
      requestId: string;
      baseScopeTurnId: string;
      reason: string;
    }
  | {
      kind: "retry";
      requestId: string;
      retryOfTurnId: string;
    };

export type TurnPurpose =
  | "message"
  | "regenerate"
  | "retry"
  | "fresh_instruction"
  | "regeneration_escalation";

export type ModelToolCall = Readonly<{
  name: string;
  input: unknown;
}>;

export type DiscoveryPolicy =
  | { kind: "fuel" }
  | {
      kind: "free";
      settledConversationTurns: number;
      settledDeclines: number;
      ceiling: number;
      declineNoticeThreshold: number;
      wrapUp: boolean;
    };

export type ValidatedTurnOutput =
  | { kind: "reply"; text: string }
  | { kind: "off_topic_decline" }
  | {
      kind: "scope";
      scope: ValidatedScope;
      elicitation: Elicitation | null;
      markdown: string;
    }
  | { kind: "fresh_instruction" };

export type TurnOutputValidation =
  | { ok: true; output: ValidatedTurnOutput }
  | {
      ok: false;
      kind: "invalid-output";
      retryEligible: true;
      reason: string;
    };

/**
 * Fold every tool block. Scope requires same-answer or prior elicitation.
 * Never infer counters from text beyond the exact reserved decline marker.
 */
export function validateTurnOutput(input: {
  text: string;
  tools: readonly ModelToolCall[];
  previousElicitation: Elicitation | null;
  policy: DiscoveryPolicy;
  expectsReplacementScope: boolean;
}): TurnOutputValidation {
  throw new Error("not implemented");
}

export type DiscoveryOutcome =
  | {
      kind: "settled";
      turn: DiscoveryTurnView;
      scope: ScopeSnapshot | null;
      allowance: Allowance | null;
    }
  | { kind: "in_progress"; turnId: string }
  | {
      kind: "deferred";
      reason: "provider-budget-exhausted";
      retryAfter: string;
    }
  | {
      kind: "escalated";
      turnId: string;
      sourceScopeVersion: ScopeVersion;
      notificationEventId: string;
    };

/**
 * SQL wire arguments remain internal. Policy is derived by reserve,
 * never accepted as a client-selected billing or free-retry switch.
 */
export type ScopeSettlementFields = {
  p_scope: ValidatedScope | null;
  p_off_topic: boolean;
  p_failure_kind:
    | "system_error"
    | "invalid_output"
    | "provider_refusal"
    | "user_cancelled"
    | null;
  p_provider_not_started: boolean;
};
```

```ts
// Test-only downstream interfaces, not product services.

export type PrdDraftStub = Readonly<{
  text: string;
  sourceScopeVersion: ScopeVersion;
}>;

export type PassingPrdStub = Readonly<{
  prdVersion: string;
  sourceScopeVersion: ScopeVersion;
  gate: "passed";
}>;

export interface PrdAuthorStub {
  author(input: { source: ScopeSnapshot }): Promise<PrdDraftStub>;
}

export interface CompletionScorerStub {
  score(input: {
    draft: PrdDraftStub;
    reference: ScopeSnapshot;
  }): Promise<{ sourceScopeVersion: ScopeVersion; passed: boolean }>;
}

export interface InitialBacklogStub {
  decompose(input: { source: PassingPrdStub }): Promise<readonly string[]>;
}
```

### Strict tool JSON schema

`record_elicitation` remains unchanged, including its exact five keys. This is the second tool exposed beside it:

```json
{
  "name": "record_scope",
  "description": "Record the complete technical scope of the NGO need. Reuse supplied cause vocabulary before introducing a genuinely new domain. Emit no project or build-cost estimate. Include both build-split parts.",
  "strict": true,
  "input_schema": {
    "type": "object",
    "additionalProperties": false,
    "$defs": {
      "text": {
        "type": "string",
        "minLength": 1
      },
      "nonEmptyTexts": {
        "type": "array",
        "minItems": 1,
        "items": { "$ref": "#/$defs/text" }
      },
      "story": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "story": { "$ref": "#/$defs/text" },
          "acceptanceCriteria": { "$ref": "#/$defs/nonEmptyTexts" }
        },
        "required": ["story", "acceptanceCriteria"]
      }
    },
    "properties": {
      "schemaVersion": {
        "type": "integer",
        "enum": [1]
      },
      "summary": { "$ref": "#/$defs/text" },
      "userStories": {
        "type": "array",
        "minItems": 1,
        "items": { "$ref": "#/$defs/story" }
      },
      "suggestedStack": { "$ref": "#/$defs/nonEmptyTexts" },
      "complexity": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "tier": {
            "type": "string",
            "enum": ["small", "medium", "large"]
          },
          "rationale": { "$ref": "#/$defs/text" },
          "startSmallAdvice": { "$ref": "#/$defs/text" }
        },
        "required": ["tier", "rationale", "startSmallAdvice"]
      },
      "riskFlags": {
        "type": "array",
        "items": { "$ref": "#/$defs/text" }
      },
      "dataSensitivity": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "tier": {
            "type": "integer",
            "enum": [0, 1, 2]
          },
          "rationale": { "$ref": "#/$defs/text" }
        },
        "required": ["tier", "rationale"]
      },
      "maintainabilityFit": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "verdict": {
            "type": "string",
            "enum": ["fit", "decline"]
          },
          "rationale": { "$ref": "#/$defs/text" }
        },
        "required": ["verdict", "rationale"]
      },
      "causeLabels": {
        "type": "array",
        "minItems": 0,
        "maxItems": 3,
        "items": { "$ref": "#/$defs/text" }
      },
      "lovable": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "recommended": { "type": "boolean" },
          "rationale": { "$ref": "#/$defs/text" }
        },
        "required": ["recommended", "rationale"]
      },
      "buildSplit": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "lovableBuilt": { "$ref": "#/$defs/nonEmptyTexts" },
          "claudeCodeCoded": { "$ref": "#/$defs/nonEmptyTexts" }
        },
        "required": ["lovableBuilt", "claudeCodeCoded"]
      }
    },
    "required": [
      "schemaVersion",
      "summary",
      "userStories",
      "suggestedStack",
      "complexity",
      "riskFlags",
      "dataSensitivity",
      "maintainabilityFit",
      "causeLabels",
      "lovable",
      "buildSplit"
    ]
  }
}
```

The runtime parser additionally enforces trimmed nonempty text, canonical distinct labels, and the money-output policy. If the provider’s strict-schema subset requires inlining local references, the emitted tool schema inlines these definitions without changing the domain contract.

### SQL DDL sketch

These are proposed migration fragments, not an executable migration. Existing reserve and settle bodies must be replaced from their latest definitions, preserving the organization switch and fuel routing.

```sql
create table public.discovery_cause_vocabulary (
  label text primary key,
  constraint discovery_cause_label_canonical check (
    label <> ''
    and label = lower(btrim(label))
    and label !~ '[[:space:]]{2,}'
  )
);

revoke all on table public.discovery_cause_vocabulary
  from public, anon, authenticated, service_role;
alter table public.discovery_cause_vocabulary enable row level security;

-- No direct client policies or grants.
-- TENANT_CATALOG: unreachable-by-client-roles.
-- A SECURITY DEFINER read function returns labels only, after validating
-- the authenticated caller's active account.

alter table public.need_intakes
  add column removed_cause_labels text[] not null default '{}';

alter table public.need_intakes
  add constraint need_intakes_draft_has_no_removed_labels
  check (stage <> 'draft' or removed_cause_labels = '{}');

alter table public.discovery_turns
  add column scope jsonb,
  add column purpose text not null default 'message',
  add column request_id uuid not null default gen_random_uuid(),
  add column credit_policy text not null default 'metered',
  add column base_scope_turn_id uuid,
  add column regeneration_slot integer,
  add column regeneration_reason text,
  add column retry_of_turn_id uuid,
  add column counts_as_conversation boolean not null default true,
  add column off_topic boolean not null default false,
  add column off_topic_notice boolean not null default false,
  add column failure_kind text,
  add column provider_not_started boolean not null default false,
  add column notification_event_id uuid
    references public.notification_events(id);

alter table public.discovery_turns
  add constraint discovery_turns_identity_with_project unique (id, project_id),
  add constraint discovery_turns_request_unique unique (project_id, request_id),
  add constraint discovery_turns_base_scope_same_project
    foreign key (base_scope_turn_id, project_id)
    references public.discovery_turns(id, project_id),
  add constraint discovery_turns_retry_same_project
    foreign key (retry_of_turn_id, project_id)
    references public.discovery_turns(id, project_id),
  add constraint discovery_turns_purpose_known check (
    purpose in (
      'message', 'regenerate', 'retry',
      'fresh_instruction', 'regeneration_escalation'
    )
  ),
  add constraint discovery_turns_credit_policy_known check (
    credit_policy in ('metered', 'waived')
  ),
  add constraint discovery_turns_scope_only_when_settled check (
    scope is null or (
      status = 'settled'
      and jsonb_typeof(scope) = 'object'
      and scope @> '{"schemaVersion": 1}'::jsonb
    )
  ),
  add constraint discovery_turns_regeneration_reason_present check (
    purpose not in ('regenerate', 'regeneration_escalation')
    or (
      base_scope_turn_id is not null
      and regeneration_reason is not null
      and btrim(regeneration_reason) <> ''
    )
  ),
  add constraint discovery_turns_retry_has_predecessor check (
    (purpose = 'retry') = (retry_of_turn_id is not null)
  ),
  add constraint discovery_turns_slot_in_range check (
    regeneration_slot is null or regeneration_slot between 1 and 3
  ),
  add constraint discovery_turns_regenerate_has_slot check (
    purpose <> 'regenerate' or regeneration_slot is not null
  ),
  add constraint discovery_turns_waived_touches_no_credits check (
    credit_policy <> 'waived'
    or (reserved_credits = 0 and coalesce(charged_credits, 0) = 0)
  ),
  add constraint discovery_turns_fuel_has_no_guardrail_facts check (
    billing <> 'fuel' or (not off_topic and not off_topic_notice)
  ),
  add constraint discovery_turns_guardrail_facts_are_settled check (
    (not off_topic and not off_topic_notice)
    or status = 'settled'
  ),
  add constraint discovery_turns_notice_requires_decline check (
    not off_topic_notice or off_topic
  ),
  add constraint discovery_turns_control_has_no_provider_usage check (
    purpose not in ('fresh_instruction', 'regeneration_escalation')
    or (
      credit_policy = 'waived'
      and not counts_as_conversation
      and reserved_micros = 0
      and max_output_tokens = 0
      and estimated_input_tokens = 0
      and coalesce(actual_micros, 0) = 0
      and coalesce(input_tokens, 0) = 0
      and coalesce(output_tokens, 0) = 0
    )
  );

create unique index discovery_turns_one_retry_child
  on public.discovery_turns(retry_of_turn_id)
  where retry_of_turn_id is not null;

create unique index discovery_turns_regeneration_slot_root
  on public.discovery_turns(project_id, regeneration_slot)
  where purpose = 'regenerate';

create unique index discovery_turns_one_regeneration_escalation
  on public.discovery_turns(project_id)
  where purpose = 'regeneration_escalation';

create unique index discovery_turns_one_off_topic_notice
  on public.discovery_turns(project_id)
  where off_topic_notice;

create index discovery_turns_latest_scope
  on public.discovery_turns(project_id, seq desc)
  where status = 'settled' and scope is not null;

alter table public.discovery_turns
  drop constraint discovery_turns_free_reserved_at_ratio;

alter table public.discovery_turns
  add constraint discovery_turns_free_reserved_at_ratio check (
    billing <> 'free'
    or (
      credit_policy = 'metered'
      and reserved_credits = ceil(reserved_micros::numeric / micros_per_credit)
    )
    or (
      credit_policy = 'waived'
      and reserved_credits = 0
    )
  );

alter table public.discovery_turns
  drop constraint discovery_turns_settled_is_measured;

alter table public.discovery_turns
  add constraint discovery_turns_settled_is_measured check (
    status <> 'settled'
    or (
      input_tokens is not null
      and output_tokens is not null
      and actual_micros is not null
      and charged_credits is not null
      and overrun_micros is not null
      and input_tokens >= 0
      and output_tokens >= 0
      and output_tokens <= max_output_tokens
      and assistant_message is not null
      and actual_micros =
        input_tokens::bigint * input_micros_per_token
        + output_tokens::bigint * output_micros_per_token
      and overrun_micros = greatest(0, actual_micros - reserved_micros)
      and charged_credits = case
        when billing = 'fuel' or credit_policy = 'waived' then 0
        else least(
          reserved_credits,
          ceil(actual_micros::numeric / micros_per_credit)
        )
      end
    )
  );
```

The unchanged failed-turn constraint still forces zero charge. The unchanged abandoned-turn constraint still retains the reservation; a waived abandoned turn has a zero-credit reservation.

The immutable allow-list adds only settlement outputs: `scope`, `off_topic`, `off_topic_notice`, `failure_kind`, `provider_not_started`, and `notification_event_id`. Purpose, request identity, retry lineage, regeneration reason and slot, credit policy, and conversation-count participation are fixed at insertion.

SQL validates scope structure at the service-only settlement boundary as well as checking it in TypeScript. Regeneration entitlement, retry eligibility, same-project scope ancestry, and slot inheritance are checked under lock; the DDL alone does not claim to establish them.

Every write definer uses `SECURITY DEFINER SET search_path = ''`, active-account checks, organization-admin checks, project ownership checks, revoke baseline, and `service_role` execution only. Old RPC overloads are removed or explicitly revoked so they cannot bypass the new invariants.

### Module map

| Surface | New or changed | Responsibility |
|---|---|---|
| `_shared/scope.ts` | New | Scope types, validation, rendering, latest/exact-version domain reads. |
| `_shared/scope-copy.ts` | New | Tier explanations, maintenance copy, pricing link, fixed closing text. |
| `_shared/discovery-turn.ts` | Changed | Intent parsing, complete tool-list folding, scope completion, regeneration, retry, terminal control outcomes. |
| `_shared/discovery-prompt.ts` | Changed | Second strict tool, mission/vocabulary block, conditional free policy, exact decline marker. |
| `_shared/discovery-skills/*.md`, generated `index.ts` | Changed | Completion instruction and conditional scope restriction; regenerate through the existing generator. |
| `_shared/anthropic-messages.ts` | Changed | Preserve all tool calls in JSON and streaming final answers. |
| `_shared/discovery-metering.ts` | Changed | Pins, waived-credit math, provider-headroom calculation. |
| `_shared/discovery-reads.ts` | Changed | Scope-bearing rows and caller vocabulary read. |
| `_shared/discovery-stream.ts` | Changed | `data-scope` helper; retain existing parts. |
| `_shared/edge.ts` | Changed | Buffered validated output, terminal reserve results, read projections, vocabulary read adapter. |
| `_shared/need-intake.ts` | Changed | Derived scope availability; keep stage enumeration unchanged. |
| `_shared/need-cause-labels.ts` | New | Deletion-only request validation and result mapping. |
| `_shared/write-routes.ts` | Changed | Register removal route and necessary refusal kinds; keep discovery-message as the generation authority. |
| `discovery-message/index.ts` | Changed as needed | Existing route handles message, regeneration, and retry intents. |
| `discovery-conversation/index.ts` | Changed | Latest scope and optional exact-version read; absent from write inventory. |
| `remove-need-cause-label/index.ts` | New | `writeRoute` wrapper for `remove_need_cause_label`. |
| `supabase/config.toml` | Changed | JWT configuration for removal route. |
| `_shared/notification-taxonomy.ts`, `notification-copy.ts` | Changed | Off-topic review and regeneration review events and copy. |
| `_shared/notifications.ts` | Changed | Extend `scope.service` path declaration to cover participating Discovery modules and route; retain non-sender status. |
| New scope-turn migration | New | Scope column, indexes, trigger, reserve/settle signatures and validation. |
| New cause-label migration | New | Vocabulary, read definer, removed-label state, removal definer, atomic settle projection. |
| New guardrail migration | New | Guardrail facts, uniqueness, reserve ceiling behavior, off-topic taxonomy seed. |
| New regeneration migration | New | Request identity, lineage, slots, waived constraints, escalation taxonomy seed, final reserve/settle definitions. |

Migration filenames must sort after the repository’s latest migration, including the organization Discovery switch migration. Existing migrations are not edited.

New taxonomy rows:

| Event | Recipient | Channels | Class | Durable producer |
|---|---|---|---|---|
| `discovery.off_topic_review` | `platform_admin` | `inapp` | `other` | Threshold-crossing turn. |
| `discovery.regeneration_review` | `platform_admin` | `email`, `inapp` | `other` | Escalation control turn. |

Both names avoid the forbidden patterns. Both SQL seeds and TypeScript rows include project, organization, and source-turn context. Neither creates a separate operations workflow. Production emits only through `public.emit_notification` inside its producer definer.

New pins:

| At-config key | Proposed value | Source |
|---|---:|---|
| `req-004.discovery.conversation_turn_ceiling` | 10, provisional | This candidate; founder ruling required before guardrail implementation. |
| `req-004.discovery.off_topic_notice_threshold` | 3, provisional | This candidate’s interpretation of repeated declines. |
| `req-004.discovery.scope_regeneration_limit` | 3 | Architecture notes, REQ-004 regeneration bound. |

`_source-pins.ts` checks the TypeScript constants, SQL bounds where present, and at-config values. Tests consume dotted configuration keys rather than literals.

### Acceptance and verification

The following is the target evidence state after implementation, not a claim that these tests have run.

`Green with model key` means the integration test calls the real model and applies the semantic oracle. Without a key it declares `vendors.anthropic` pending. A scripted result never substitutes for that integration proof.

| Acceptance ID | Loop target | Integration target | Evidence or remaining dependency |
|---|---|---|---|
| AT-004.20 | Green | Green with model key | Complete scope from a completing turn, persisted and read back with all fields. |
| AT-004.21 | Green | Green with model key | Whole-output checks, poisoned fixtures, rendered-document checks, source scan, and live semantic inspection. |
| AT-004.22 | Green | Green with model key | Both nonempty build-split parts survive tool parsing, settlement, and reads. |
| AT-004.24 | Pending: `discovery.initial-backlog-from-prd` | Same pending name | Absence and interface checks pass; real initial backlog production from a passing PRD is unbuilt. |
| AT-004.25 | Green | Green | Tier 0/1/2 fixtures pass through real backend rendering and versioned reads; assignment judgment is outside this ID. |
| AT-004.52 | Pending: `discovery.prd-authoring-and-scoring` | Same pending name | Stubs prove version identity, but production authoring and scoring do not exist. |
| AT-004.58 | Green | Green with model key | Seed “food security”; verify vocabulary prompt and exact reuse, with no synonym inserted. |
| AT-004.59 | Green | Green with model key | New-domain fixture grows vocabulary; thin fixture emits zero labels. |
| AT-004.60 | Green | Green | Authenticated deletion, repeated deletion, forbidden writes, and nonempty whole-product surface scan. |
| AT-004.12 | Green | Green with model key | All four unrelated-task categories produce the decline protocol and plain scoping redirect. |
| AT-004.13 | Green | Pending: `ui.discovery-surface` | Backend notice, exactly one founder event, and continued eligibility are proved; browser display remains an explicit integration gap. |
| AT-004.14 | Green | Green | Operator-seeded boundary history plus deployed route proves deterministic fresh-Discovery fallback without a model. |
| AT-004.15 | Green | Pending: `checkout.project-fuel`, `ui.discovery-surface` | Full funded sequence runs in the fixture; live positive fuel and gauge evidence are unavailable. |
| AT-004.37 | Green | Green with model key | Three replacement slots, logged reasons, scope history, duplicate request replay, and no credit deltas. |
| AT-004.38 | Green | Green | Seed exhausted slots through operator setup; deployed request atomically records escalation and emits one admin notification. |
| AT-004.39 | Green | Green | Controlled system-failure settlement followed by authorized retry proves zero credit reservation and charge; transport classification gets separate boundary tests. |

New tests:

- `scope-output.test.ts`: AT-004.20 and AT-004.22.
- `scope-rendering.test.ts`: AT-004.21 and AT-004.25.
- `scope-contract.test.ts`: interface evidence followed by the named pending results for AT-004.24 and AT-004.52.
- `scope-labels.test.ts`: AT-004.58–60.
- `free-guardrails.test.ts`: AT-004.12–15.
- `scope-regeneration.test.ts`: AT-004.37–39.
- Scope semantic oracle and tier fixtures; food-security, novel-domain, thin-conversation, and rejected-scope fixtures.
- Harness selftests for multi-tool preservation, exact decline-marker detection, output buffering, money validation, replay handling, and source-scan false positives.
- Notification producer tests for atomic rollback, recipient resolution, repeated invocation, and emitter-only delivery.

Extend `_contract.ts`, `_fixture.ts`, and `_live.ts` together. The fixture must expose the organization’s actual mission rather than returning an empty organization result. Extend the Anthropic script format to support several tool calls while retaining the existing single-tool shorthand. The real port and simulator must fold the same answer shape.

Add dedicated concurrency cases for two regeneration requests, a repeated settlement, deletion during generation, cross-project vocabulary insertion, and shared organization provider-headroom reservations. Include failed and abandoned rows around midnight and ensure releases refer to the original UTC day.

Move each ID out of `z-later-runs.test.ts` exactly once and update its expected declaration in the same unit. A keyless integration run records model-dependent pending results; a key-enabled run must use an expectation profile that requires those IDs to pass, rather than treating unexpected green results as permission to weaken the manifest.

Run the prescribed typecheck, build, acceptance registration check, harness selftests, and both tiers of the Discovery suite. Re-run authentication, NGO profile, intake, and notification suites because the vocabulary posture, write inventory, profile input, label projection, and taxonomy affect them. Preserve the existing provider-spend, zero-label draft, credit transparency, and no-supplemental-grant assertions.

## Synthesis decision

Not selected. This is the tool-in-turn candidate for comparison; the parent records the base choice and any adaptations.

## Tradeoffs accepted

- We accept additional columns and control turns in the ledger in exchange for one durable aggregate for Discovery output, retries, guardrails, and escalation.
- We accept buffering model text in exchange for validating money policy and replacing internal decline markers before delivery.
- We accept delayed zero-credit operations when daily provider headroom is exhausted in exchange for preserving the existing platform-spend bound.
- We accept a read definer for the global vocabulary in exchange for preserving the current two-posture tenant catalog.
- We accept immutable historical labels alongside a deletion projection in exchange for preserving source contracts and honoring NGO corrections during concurrent generation.
- We accept model-dependent semantic reuse in exchange for avoiding a speculative synonym service or human taxonomy-curation surface.
- We accept two downstream acceptance IDs remaining pending in exchange for an honest boundary between interface evidence and unbuilt production behavior.

## Alternatives considered

- **Dedicated scope-generation route and scope-version table.** It hides model orchestration behind a separate service, but exposes an additional completion operation and requires callers to coordinate chat completion with scope generation. The assigned direction instead makes the settled chat turn the scope version.
- **Mutable scope on the need.** It makes the latest read short but exposes history reconstruction and race handling to downstream consumers. A scorer cannot safely reproduce the author’s source without a second version store.
- **Automatic model generation after elicitation settlement.** It hides the trigger from the chat caller but introduces another provider reservation, partial-completion state, and recovery boundary. One tool-bearing turn keeps the output and its settlement together.
- **Credit debit followed by a full regeneration refund.** It reuses existing formulas but exposes transient credit loss and insufficient-credit rejection for a promised zero-credit action. An explicit waived policy preserves zero credit movement throughout.

## Open questions and risks

- Will the founder pin the free conversation ceiling at ten settled conversational turns and the repeated-decline notice threshold at three?
- Does “zero credits” permit waiting for the next daily provider budget, or must an explicitly separate subsidy fund immediate regeneration and retries?
- Is starting a new need through the existing intake flow the intended meaning of “fresh Discovery,” or should a later change introduce conversation sessions within one project?
- Is buffered assistant output acceptable for this backend release, given that it preserves stream compatibility but removes incremental text display?
- Should NGO label removals remain effective across every regeneration of the project, as proposed?
- Can the later fit implementation treat a stored scope carrying `maintainabilityFit.verdict = decline` as nonpublishable without needing a different artifact shape?
- At what vocabulary size should full prompt inclusion be replaced by retrieval, and what live oracle will prove that retrieval still exposes the correct existing label?
- What adversarial money-estimate fixtures are required before accepting the lexical output gate, given that arbitrary natural-language estimates cannot be excluded by schema alone?
- Should an expired open turn always qualify for a zero-credit retry, or will provider receipts become available to distinguish worker failure from other uncertain interruptions?

## Next implementation step

Build the complete two-tool answer path and atomic scope-bearing settlement, then prove scope immutability, exact-version reads, both build-split parts, and rollback before adding rendering and the remaining units.