export type GithubVisibility = "public" | "private";

export type GithubConfig = {
  org: string;
  appId: string;
  privateKey: string;
  visibility: GithubVisibility;
};

export type GithubFailureKind = "auth" | "rate-limited" | "not-found" | "invalid" | "uncertain";

export type GithubFailure = {
  ok: false;
  kind: GithubFailureKind;
  reason: string;
};

export type GithubFetch = (url: string, init?: RequestInit) => Promise<Response>;

export type GithubHttp =
  | { ok: true; status: number; value: unknown }
  | { ok: false; status: number | null; value: unknown; failure: GithubFailure };

const API = "https://api.github.com";
const REFRESH_EARLY_MS = 5 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return "the request failed";
  const message = error.message.trim();
  if (message === "" || message.length > 300 || message.includes("PRIVATE KEY")) return error.name;
  return message;
}

function derLength(length: number): number[] {
  if (length < 0x80) return [length];
  const bytes: number[] = [];
  let rest = length;
  while (rest > 0) {
    bytes.unshift(rest & 0xff);
    rest = Math.floor(rest / 256);
  }
  return [0x80 | bytes.length, ...bytes];
}

function der(tag: number, content: Uint8Array): Uint8Array {
  const length = derLength(content.length);
  const out = new Uint8Array(1 + length.length + content.length);
  out[0] = tag;
  out.set(length, 1);
  out.set(content, 1 + length.length);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  let size = 0;
  for (const part of parts) size += part.length;
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function bytesFromBinary(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function binaryFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return binary;
}

export function encodeBase64(bytes: Uint8Array): string {
  return btoa(binaryFromBytes(bytes));
}

export function decodeBase64(value: string): Uint8Array {
  return bytesFromBinary(atob(value.replace(/\s/g, "")));
}

function pemDer(pem: string): { format: "pkcs1" | "pkcs8"; der: Uint8Array } | null {
  const match =
    /-----BEGIN (RSA PRIVATE KEY|PRIVATE KEY)-----([A-Za-z0-9+/=\s]+)-----END \1-----/.exec(pem);
  if (match === null || match[1] === undefined || match[2] === undefined) return null;
  try {
    return {
      format: match[1] === "RSA PRIVATE KEY" ? "pkcs1" : "pkcs8",
      der: decodeBase64(match[2]),
    };
  } catch {
    return null;
  }
}

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

// GitHub issues RSA keys as PKCS#1, and crypto.subtle.importKey accepts only PKCS#8.
function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  const version = Uint8Array.from([0x02, 0x01, 0x00]);
  const algorithm = Uint8Array.from([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]);
  return der(0x30, concat([version, algorithm, der(0x04, pkcs1)]));
}

async function signingKey(pem: string): Promise<CryptoKey> {
  const parsed = pemDer(pem);
  if (parsed === null) throw new Error("the key is not a PEM private key");
  const derBytes = parsed.format === "pkcs1" ? pkcs1ToPkcs8(parsed.der) : parsed.der;
  return crypto.subtle.importKey(
    "pkcs8",
    arrayBuffer(derBytes),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function base64Url(bytes: Uint8Array): string {
  return encodeBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function appJwt(config: GithubConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64Url(
    new TextEncoder().encode(
      JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: config.appId }),
    ),
  );
  const input = `${header}.${payload}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      await signingKey(config.privateKey),
      new TextEncoder().encode(input),
    ),
  );
  return `${input}.${base64Url(signature)}`;
}

function githubMessage(value: unknown): string {
  if (!isRecord(value)) return "GitHub returned an error";
  const message = typeof value.message === "string" ? value.message.trim() : "";
  const details: string[] = [];
  if (Array.isArray(value.errors)) {
    for (const error of value.errors) {
      if (isRecord(error) && typeof error.message === "string" && error.message.trim() !== "") {
        details.push(error.message.trim());
      }
    }
  }
  if (message === "") return details.length === 0 ? "GitHub returned an error" : details.join("; ");
  return details.length === 0 ? message : `${message} ${details.join("; ")}`;
}

function rateLimited(status: number, value: unknown, headers: Headers): boolean {
  if (status === 429) return true;
  if (status !== 403) return false;
  if (headers.get("x-ratelimit-remaining") === "0") return true;
  return githubMessage(value).toLowerCase().includes("rate limit");
}

function classify(status: number, value: unknown, headers: Headers): GithubFailure {
  const reason = `GitHub returned ${status}: ${githubMessage(value)}`;
  if (status === 429 || rateLimited(status, value, headers)) {
    return { ok: false, kind: "rate-limited", reason };
  }
  if (status === 401 || status === 403) return { ok: false, kind: "auth", reason };
  if (status === 404) return { ok: false, kind: "not-found", reason };
  if (status >= 400 && status < 500) return { ok: false, kind: "invalid", reason };
  return { ok: false, kind: "uncertain", reason };
}

export async function githubHttp(
  fetchImpl: GithubFetch,
  bearer: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<GithubHttp> {
  let response: Response;
  try {
    response = await fetchImpl(path.startsWith("https://") ? path : `${API}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${bearer}`,
        "User-Agent": "ai4good-prd",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    return {
      ok: false,
      status: null,
      value: null,
      failure: {
        ok: false,
        kind: "uncertain",
        reason: `the GitHub request failed: ${errorText(error)}`,
      },
    };
  }
  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    return {
      ok: false,
      status: response.status,
      value: null,
      failure: {
        ok: false,
        kind: "uncertain",
        reason: `the GitHub response was lost: ${errorText(error)}`,
      },
    };
  }
  let value: unknown = null;
  if (text.trim() !== "") {
    try {
      value = JSON.parse(text);
    } catch {
      const kind = response.status >= 400 && response.status < 500 ? "invalid" : "uncertain";
      return {
        ok: false,
        status: response.status,
        value: null,
        failure: {
          ok: false,
          kind,
          reason: `GitHub returned ${response.status} with a body that is not JSON`,
        },
      };
    }
  }
  if (response.status >= 200 && response.status < 300)
    return { ok: true, status: response.status, value };
  return {
    ok: false,
    status: response.status,
    value,
    failure: classify(response.status, value, response.headers),
  };
}

export function githubConfig(
  env: Record<string, string | undefined>,
): { ok: true; config: GithubConfig } | { ok: false; reason: string } {
  const org = env.PRD_GITHUB_ORG?.trim() ?? "";
  const appId = env.GITHUB_APP_ID?.trim() ?? "";
  const privateKeyRaw = env.GITHUB_APP_PRIVATE_KEY ?? "";
  if (org === "") return { ok: false, reason: "PRD_GITHUB_ORG is missing" };
  if (appId === "") return { ok: false, reason: "GITHUB_APP_ID is missing" };
  if (!/^\d+$/.test(appId)) return { ok: false, reason: "GITHUB_APP_ID is not a number" };
  if (privateKeyRaw.trim() === "")
    return { ok: false, reason: "GITHUB_APP_PRIVATE_KEY is missing" };
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
  if (pemDer(privateKey) === null) {
    return { ok: false, reason: "GITHUB_APP_PRIVATE_KEY is not a PKCS#1 or PKCS#8 PEM" };
  }
  const visibilityRaw = env.PRD_GITHUB_REPO_VISIBILITY;
  let visibility: GithubVisibility = "private";
  if (visibilityRaw !== undefined) {
    const named = visibilityRaw.trim();
    if (named !== "public" && named !== "private") {
      return { ok: false, reason: "PRD_GITHUB_REPO_VISIBILITY must be public or private" };
    }
    visibility = named;
  }
  return { ok: true, config: { org, appId, privateKey, visibility } };
}

export type GithubApp = {
  installationToken(fetchImpl: GithubFetch): Promise<{ ok: true; token: string } | GithubFailure>;
};

export function githubApp(config: GithubConfig): GithubApp {
  let cached: { token: string; refreshAt: number } | null = null;
  let installationId: number | null = null;
  let pending: Promise<{ ok: true; token: string } | GithubFailure> | null = null;

  async function mint(
    fetchImpl: GithubFetch,
  ): Promise<{ ok: true; token: string } | GithubFailure> {
    let jwt: string;
    try {
      jwt = await appJwt(config);
    } catch (error) {
      return {
        ok: false,
        kind: "auth",
        reason: `the GitHub App private key could not sign the request: ${errorText(error)}`,
      };
    }
    if (installationId === null) {
      const found = await githubHttp(
        fetchImpl,
        jwt,
        "GET",
        `/orgs/${encodeURIComponent(config.org)}/installation`,
      );
      if (!found.ok) return found.failure;
      if (!isRecord(found.value) || typeof found.value.id !== "number") {
        return { ok: false, kind: "invalid", reason: "GitHub did not return an installation id" };
      }
      installationId = found.value.id;
    }
    const issued = await githubHttp(
      fetchImpl,
      jwt,
      "POST",
      `/app/installations/${installationId}/access_tokens`,
      {},
    );
    if (!issued.ok) return issued.failure;
    if (
      !isRecord(issued.value) ||
      typeof issued.value.token !== "string" ||
      issued.value.token === "" ||
      typeof issued.value.expires_at !== "string"
    ) {
      return { ok: false, kind: "invalid", reason: "GitHub did not return an installation token" };
    }
    const expires = Date.parse(issued.value.expires_at);
    if (Number.isNaN(expires))
      return { ok: false, kind: "invalid", reason: "the installation token has no expiry" };
    cached = { token: issued.value.token, refreshAt: expires - REFRESH_EARLY_MS };
    return { ok: true, token: issued.value.token };
  }

  return {
    installationToken(fetchImpl) {
      if (cached !== null && Date.now() < cached.refreshAt) {
        return Promise.resolve({ ok: true as const, token: cached.token });
      }
      if (pending === null)
        pending = mint(fetchImpl).finally(() => {
          pending = null;
        });
      return pending;
    },
  };
}
