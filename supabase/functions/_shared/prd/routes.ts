import { snapshotFromRecord, viewerFromRecord } from "./snapshot.ts";
import {
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
