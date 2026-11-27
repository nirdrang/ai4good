import { edgeHandler, empty, prdProjectForRepo, refusal, syncPrdFromGithub } from "../_shared/edge.ts";

const encoder = new TextEncoder();

function bytesOfHex(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  const bytes = new Uint8Array(32);
  for (let index = 0; index < 32; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function signatureMatches(secret: string, body: Uint8Array, header: string | null): Promise<boolean> {
  if (header === null || !header.startsWith("sha256=")) return false;
  const given = bytesOfHex(header.slice("sha256=".length));
  if (given === null) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify("HMAC", key, given, body);
}

function repoIdOf(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  const repository = (value as { repository?: unknown }).repository;
  if (typeof repository !== "object" || repository === null) return null;
  const id = (repository as { id?: unknown }).id;
  if (typeof id === "number" && Number.isSafeInteger(id) && id > 0) return id;
  if (typeof id === "string" && /^\d+$/.test(id)) {
    const parsed = Number(id);
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

Deno.serve(
  edgeHandler("prd-github-hook", async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return refusal("prd-github-hook accepts POST only", 405);
    const secret = Deno.env.get("GITHUB_WEBHOOK_SECRET")?.trim() ?? "";
    if (secret === "") return refusal("GITHUB_WEBHOOK_SECRET is missing", 503);
    const body = new Uint8Array(await request.arrayBuffer());
    const signed = await signatureMatches(secret, body, request.headers.get("x-hub-signature-256"));
    if (!signed) return refusal("the webhook signature does not match", 401);
    if (request.headers.get("x-github-event") !== "push") return empty(200);
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(body));
    } catch {
      return refusal("a push delivery is JSON", 400);
    }
    const repoId = repoIdOf(parsed);
    if (repoId === null) return empty(202);
    const projectId = await prdProjectForRepo(repoId);
    if (projectId === null) return empty(202);
    const synced = await syncPrdFromGithub(projectId);
    if (!synced.ok) return refusal(synced.reason, synced.status);
    return empty(200);
  }),
);
