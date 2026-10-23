import {
  edgeHandler,
  empty,
  json,
  readJsonBody,
  readPrdSnapshot,
  refusal,
  requireEnv,
  resolveCaller,
} from "../_shared/edge.ts";
import { snapshotFromRecord, viewerFromRecord } from "../_shared/prd/snapshot.ts";
import {
  integerField,
  parseWriteRefusalKind,
  rpcRefusalStatus,
  uuidField,
} from "../_shared/write-routes.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const ANON_KEY = requireEnv("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY");

Deno.serve(
  edgeHandler("prd-snapshot", async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return refusal("prd-snapshot accepts POST only", 405);
    const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
    if (!caller) return refusal("authenticate before calling prd-snapshot", 401);
    const body = await readJsonBody(request);
    if (!body.ok) return refusal(body.reason, 400);
    const projectId = uuidField(body.value.projectId);
    if (projectId === null) return refusal("prd-snapshot names the project as a uuid", 400);
    const rawSince = body.value.sinceSequence;
    let sinceSequence: number | null = null;
    if (rawSince !== undefined && rawSince !== null) {
      const parsed = integerField(rawSince);
      if (parsed === null || parsed < 0) return refusal("sinceSequence is a whole number", 400);
      sinceSequence = parsed;
    }
    const outcome = await readPrdSnapshot(caller.id, projectId, sinceSequence);
    if (!outcome.ok) {
      const status = rpcRefusalStatus(outcome);
      const kind = status === 409 ? parseWriteRefusalKind(outcome.details) : "refused";
      return json({ ok: false, kind, reason: outcome.message }, status);
    }
    if (outcome.value === null) return empty(204);
    return json(snapshotFromRecord(outcome.value, viewerFromRecord(outcome.value)), 200);
  }),
);
