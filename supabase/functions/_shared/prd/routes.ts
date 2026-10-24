import { createHash } from "node:crypto";
import { snapshotFromRecord, viewerFromRecord } from "./snapshot.ts";
import type { ActionKind, ChatScope, PrdIntent, QuestionId, TopicId } from "./wire.ts";
import {
  integerField,
  isRecord,
  refuseWrite,
  stringField,
  uuidField,
  type AccountWriteRouteInput,
  type WriteRouteDecision,
} from "../write-routes.ts";

export type PrdOpenArgs = {
  p_actor: string;
  p_organization: string;
  p_project: string;
};

export type PrdDraftArgs = {
  p_actor: string;
  p_project: string;
  p_key: string;
  p_text: string;
};

export function projectTarget(body: Record<string, unknown>): string | null {
  return stringField(body.projectId);
}

export function decidePrdOpen(input: AccountWriteRouteInput): WriteRouteDecision<PrdOpenArgs> {
  const projectId = uuidField(input.body.projectId);
  const organizationId = uuidField(input.body.organizationId);
  if (projectId === null || organizationId === null) {
    return refuseWrite("invalid-request", 400, "prd-open names the organisation and the project");
  }
  return {
    ok: true,
    args: {
      p_actor: input.caller.id,
      p_organization: organizationId,
      p_project: projectId,
    },
  };
}

export function decidePrdDraft(input: AccountWriteRouteInput): WriteRouteDecision<PrdDraftArgs> {
  const projectId = uuidField(input.body.projectId);
  const key = stringField(input.body.key);
  if (projectId === null || key === null || typeof input.body.text !== "string") {
    return refuseWrite(
      "invalid-request",
      400,
      "prd-draft names the project, a key, and the draft text",
    );
  }
  return {
    ok: true,
    args: {
      p_actor: input.caller.id,
      p_project: projectId,
      p_key: key,
      p_text: input.body.text,
    },
  };
}

export function renderPrdFacts(value: unknown): Record<string, unknown> {
  return { snapshot: snapshotFromRecord(value, viewerFromRecord(value)) };
}

const ACTION_KINDS = [
  "post-question",
  "complete-answer",
  "confirm-topic",
  "reopen-topic",
  "close",
  "close-anyway",
  "keep-working",
] as const satisfies readonly ActionKind[];

export type PrdMessageArgs = {
  p_actor: string;
  p_project: string;
  p_chat_key: string;
  p_request_id: string;
  p_base_revision: number;
  p_intent: PrdIntent;
  p_body_hash: string;
};

export type PrdActionArgs = {
  p_actor: string;
  p_project: string;
  p_kind: ActionKind;
  p_token: string;
  p_request_id: string;
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function prdBodyHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function chatScope(value: unknown): ChatScope | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  if (value.kind === "main") return { kind: "main" };
  if (value.kind === "topic") {
    const topicId = stringField(value.topicId);
    if (topicId === null) return null;
    return { kind: "topic", topicId: topicId as TopicId };
  }
  if (value.kind === "side") {
    const questionId = uuidField(value.questionId);
    if (questionId === null) return null;
    return { kind: "side", questionId: questionId as QuestionId };
  }
  return null;
}

function chatKey(scope: ChatScope): string {
  if (scope.kind === "main") return "main";
  if (scope.kind === "topic") return `topic:${scope.topicId}`;
  return `side:${scope.questionId}`;
}

function stringRecord(value: unknown): Readonly<Record<string, string>> | null {
  if (!isRecord(value)) return null;
  const picks: Record<string, string> = {};
  for (const key of Object.keys(value)) {
    if (typeof value[key] !== "string") return null;
    picks[key] = value[key];
  }
  return picks;
}

function sendIntent(value: unknown): PrdIntent | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  if (value.kind === "text") {
    if (typeof value.text !== "string") return null;
    return { kind: "text", text: value.text };
  }
  if (value.kind === "answers") {
    const picks = stringRecord(value.picks);
    if (picks === null || typeof value.text !== "string") return null;
    return { kind: "answers", picks, text: value.text };
  }
  if (value.kind === "use-answer") {
    const questionId = uuidField(value.questionId);
    if (questionId === null || typeof value.note !== "string") return null;
    if (value.answer !== null && typeof value.answer !== "string") return null;
    return {
      kind: "use-answer",
      questionId: questionId as QuestionId,
      answer: value.answer,
      note: value.note,
    };
  }
  if (value.kind === "close-check") return { kind: "close-check" };
  return null;
}

function actionKind(value: unknown): ActionKind | null {
  const kind = stringField(value);
  if (kind === null || !(ACTION_KINDS as readonly string[]).includes(kind)) return null;
  return kind as ActionKind;
}

export function decidePrdMessage(input: AccountWriteRouteInput): WriteRouteDecision<PrdMessageArgs> {
  const projectId = uuidField(input.body.projectId);
  const scope = chatScope(input.body.scope);
  const requestId = stringField(input.body.requestId);
  const baseRevision = integerField(input.body.baseRevision);
  const intent = sendIntent(input.body.intent);
  if (
    projectId === null ||
    scope === null ||
    requestId === null ||
    baseRevision === null ||
    intent === null
  ) {
    return refuseWrite(
      "invalid-request",
      400,
      "prd-message names the project, the chat, a request, the revision, and an intent",
    );
  }
  const parsed = { projectId, scope, requestId, baseRevision, intent };
  return {
    ok: true,
    args: {
      p_actor: input.caller.id,
      p_project: projectId,
      p_chat_key: chatKey(scope),
      p_request_id: requestId,
      p_base_revision: baseRevision,
      p_intent: intent,
      p_body_hash: prdBodyHash(parsed),
    },
  };
}

export function decidePrdAction(input: AccountWriteRouteInput): WriteRouteDecision<PrdActionArgs> {
  const projectId = uuidField(input.body.projectId);
  const kind = actionKind(input.body.kind);
  const token = stringField(input.body.token);
  const requestId = stringField(input.body.requestId);
  if (projectId === null || kind === null || token === null || requestId === null) {
    return refuseWrite(
      "invalid-request",
      400,
      "prd-action names the project, the action, a token, and a request",
    );
  }
  return {
    ok: true,
    args: {
      p_actor: input.caller.id,
      p_project: projectId,
      p_kind: kind,
      p_token: token,
      p_request_id: requestId,
    },
  };
}

export function renderPrdTurn(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  return { turnId: value.turnId, messageId: value.messageId, sequence: value.sequence };
}

export function renderPrdAction(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  return value;
}
