export type Grant = { project: string; chat: string; session: string; exp: number };

const encoder = new TextEncoder();
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const fromBase64url = (text: string) => Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (char) => char.charCodeAt(0));
const key = (secret: string) => crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

export async function mintGrant(secret: string, grant: Grant): Promise<string> {
  const payload = encoder.encode(JSON.stringify(grant));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), payload));
  return `${base64url(payload)}.${base64url(signature)}`;
}

export async function verifyGrant(secret: string, token: string): Promise<Grant | null> {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const bytes = fromBase64url(payload);
  if (!(await crypto.subtle.verify('HMAC', await key(secret), fromBase64url(signature), bytes))) return null;
  const grant = JSON.parse(new TextDecoder().decode(bytes)) as Grant;
  return grant.exp > Date.now() / 1000 ? grant : null;
}
