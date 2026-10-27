import type { SettleDatabase } from "../write-routes.ts";

export type GrantClaims = {
  grantId: string;
  projectId: string;
  chatId: string;
  expiresAt: string;
};

export type GrantVerify =
  | { ok: true; claims: GrantClaims }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();
const MIN_KEY_LENGTH = 32;

export function usableGrantKey(key: string): boolean {
  return key.length >= MIN_KEY_LENGTH;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function encode(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decode(text: string): Uint8Array<ArrayBuffer> | null {
  if (text.length === 0 || !/^[A-Za-z0-9_-]+$/.test(text)) return null;
  const padded = text + "=".repeat((4 - (text.length % 4)) % 4);
  try {
    const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

function claimsOf(value: unknown): GrantClaims | null {
  if (!isRecord(value)) return null;
  const { grantId, projectId, chatId, expiresAt } = value;
  if (typeof grantId !== "string" || !UUID.test(grantId)) return null;
  if (typeof projectId !== "string" || !UUID.test(projectId)) return null;
  if (typeof chatId !== "string" || !UUID.test(chatId)) return null;
  if (typeof expiresAt !== "string" || !Number.isFinite(Date.parse(expiresAt))) return null;
  return { grantId, projectId, chatId, expiresAt };
}

async function hmacKey(secret: string, use: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [use],
  );
}

/** Signs the grant, project, chat, and expiry. The SQL grant check stays the authority. */
export async function signGrant(claims: GrantClaims, key: string): Promise<string> {
  if (!usableGrantKey(key)) throw new Error("the grant signing key is missing or too short");
  const payload = encode(
    encoder.encode(
      JSON.stringify({
        grantId: claims.grantId,
        projectId: claims.projectId,
        chatId: claims.chatId,
        expiresAt: claims.expiresAt,
      }),
    ),
  );
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(key, "sign"), encoder.encode(payload));
  return `${payload}.${encode(new Uint8Array(signature))}`;
}

/** Verifies the HMAC in constant time. A bad token is a result, never a throw. */
export async function verifyGrant(token: string, key: string, now: number): Promise<GrantVerify> {
  if (!usableGrantKey(key)) return { ok: false, reason: "bad-signature" };
  if (typeof token !== "string" || token.length === 0 || token.length > 8192) {
    return { ok: false, reason: "malformed" };
  }
  const dot = token.indexOf(".");
  if (dot <= 0 || dot !== token.lastIndexOf(".")) return { ok: false, reason: "malformed" };
  const payload = token.slice(0, dot);
  const signature = decode(token.slice(dot + 1));
  const payloadBytes = decode(payload);
  if (signature === null || payloadBytes === null) return { ok: false, reason: "malformed" };
  let matches = false;
  try {
    matches = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(key, "verify"),
      signature,
      encoder.encode(payload),
    );
  } catch {
    return { ok: false, reason: "bad-signature" };
  }
  if (!matches) return { ok: false, reason: "bad-signature" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const claims = claimsOf(parsed);
  if (claims === null) return { ok: false, reason: "malformed" };
  if (Date.parse(claims.expiresAt) <= now) return { ok: false, reason: "expired" };
  return { ok: true, claims };
}

function rowClaims(value: unknown, grantId: string): GrantClaims | null {
  if (!isRecord(value)) return null;
  const claims = claimsOf({
    grantId: value.grant,
    projectId: value.project,
    chatId: value.chat,
    expiresAt: value.expiresAt,
  });
  if (claims === null || claims.grantId.toLowerCase() !== grantId.toLowerCase()) return null;
  return claims;
}

/** Issues a grant in SQL and signs the row it stored. Unit 6 calls this before a turn. */
export async function issueGrantToken(
  rpc: SettleDatabase,
  key: string,
  turn: string,
  mode: string,
  ttlSeconds: number,
): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  if (!usableGrantKey(key)) return { ok: false, reason: "unavailable" };
  const issued = await rpc("prd_grant_issue", {
    p_turn: turn,
    p_mode: mode,
    p_ttl_seconds: ttlSeconds,
  });
  if (!issued.ok) return { ok: false, reason: issued.details ?? "invalid-request" };
  if (typeof issued.value !== "string" || !UUID.test(issued.value)) {
    return { ok: false, reason: "invalid-request" };
  }
  const read = await rpc("prd_grant_claims", { p_grant: issued.value });
  if (!read.ok) return { ok: false, reason: read.details ?? "invalid-request" };
  const claims = rowClaims(read.value, issued.value);
  if (claims === null) return { ok: false, reason: "invalid-request" };
  return { ok: true, token: await signGrant(claims, key) };
}
