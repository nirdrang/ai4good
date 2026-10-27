import { expect, it } from "vitest";
import { issueGrantToken, signGrant, verifyGrant, type GrantClaims } from "../../../supabase/functions/_shared/prd/grant.ts";
import type { SettleDatabase } from "../../../supabase/functions/_shared/write-routes.ts";

const KEY = "prd-grant-signing-key";
const OTHER_KEY = "another-signing-key";
const NOW = Date.parse("2026-01-01T00:00:00.000Z");
const CLAIMS: GrantClaims = {
  grantId: "44444444-4444-4444-8444-444444444444",
  projectId: "55555555-5555-4555-8555-555555555555",
  chatId: "66666666-6666-4666-8666-666666666666",
  expiresAt: "2026-06-01T00:00:00.000Z",
};

function encodeJson(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index] ?? 0);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

it("signs a grant and reads the same claims back", async () => {
  const token = await signGrant(CLAIMS, KEY);
  expect(await verifyGrant(token, KEY, NOW)).toEqual({ ok: true, claims: CLAIMS });
});

it("refuses a changed payload, a changed signature, and another key", async () => {
  const token = await signGrant(CLAIMS, KEY);
  const signature = token.slice(token.indexOf(".") + 1);
  const changedPayload = encodeJson({ ...CLAIMS, grantId: "77777777-7777-4777-8777-777777777777" });
  expect(await verifyGrant(`${changedPayload}.${signature}`, KEY, NOW)).toEqual({
    ok: false,
    reason: "bad-signature",
  });
  const flipped = signature.slice(0, -1) + (signature.endsWith("A") ? "B" : "A");
  expect(await verifyGrant(`${token.slice(0, token.indexOf("."))}.${flipped}`, KEY, NOW)).toEqual({
    ok: false,
    reason: "bad-signature",
  });
  expect(await verifyGrant(token, OTHER_KEY, NOW)).toEqual({ ok: false, reason: "bad-signature" });
});

it("refuses an expired token and malformed input as their own results", async () => {
  const token = await signGrant(CLAIMS, KEY);
  expect(await verifyGrant(token, KEY, Date.parse(CLAIMS.expiresAt))).toEqual({ ok: false, reason: "expired" });
  const malformed = ["", "not-a-token", "a.b.c", "@@@.abcd", "payload."];
  for (const input of malformed) {
    expect(await verifyGrant(input, KEY, NOW)).toEqual({ ok: false, reason: "malformed" });
  }
});

it("signs the grant row issue stored", async () => {
  const calls: string[] = [];
  const rpc: SettleDatabase = async (name, args) => {
    calls.push(name);
    if (name === "prd_grant_issue") {
      expect(args).toEqual({ p_turn: "33333333-3333-4333-8333-333333333333", p_mode: "reply", p_ttl_seconds: 60 });
      return { ok: true, value: CLAIMS.grantId };
    }
    expect(args).toEqual({ p_grant: CLAIMS.grantId });
    return {
      ok: true,
      value: {
        grant: CLAIMS.grantId,
        project: CLAIMS.projectId,
        chat: CLAIMS.chatId,
        turn: "33333333-3333-4333-8333-333333333333",
        expiresAt: CLAIMS.expiresAt,
      },
    };
  };
  const issued = await issueGrantToken(rpc, KEY, "33333333-3333-4333-8333-333333333333", "reply", 60);
  expect(issued.ok).toBe(true);
  if (!issued.ok) return;
  expect(await verifyGrant(issued.token, KEY, NOW)).toEqual({ ok: true, claims: CLAIMS });
  expect(calls).toEqual(["prd_grant_issue", "prd_grant_claims"]);
});

it("returns the SQL reason when a grant cannot be issued", async () => {
  const rpc: SettleDatabase = async () => ({
    ok: false,
    message: "that turn is not open",
    details: "invalid-request",
  });
  expect(await issueGrantToken(rpc, KEY, CLAIMS.grantId, "reply", 60)).toEqual({
    ok: false,
    reason: "invalid-request",
  });
});
