// Unit 6 measurement: does the local GoTrue throttle password sign-ins past the configured
// `sign_in_sign_ups = 30` per five minutes per IP? Fires wrong-password grants for one address
// from one client and records every status code. Nothing is created: a wrong password mints no
// user and no session. Run: bun loop/items/AI4DEV-56/artifacts/measure/unit6-signin-rate-limit.ts
const API = process.env.API_URL ?? 'http://127.0.0.1:44321';
const ANON = process.env.ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const ATTEMPTS = Number(process.env.ATTEMPTS ?? '45');

const counts = new Map<number, number>();
const firstOf = new Map<number, { attempt: number; body: string; headers: Record<string, string> }>();
const started = new Date().toISOString();
for (let i = 1; i <= ATTEMPTS; i += 1) {
  const response = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: ANON },
    body: JSON.stringify({ email: `rate-limit-probe-${started}@example.invalid`, password: 'not the password' }),
  });
  const body = await response.text();
  counts.set(response.status, (counts.get(response.status) ?? 0) + 1);
  if (!firstOf.has(response.status)) {
    const headers: Record<string, string> = {};
    for (const [k, v] of response.headers) if (/rate|retry|limit/i.test(k)) headers[k] = v;
    firstOf.set(response.status, { attempt: i, body: body.slice(0, 300), headers });
  }
}
console.log(`started ${started}, finished ${new Date().toISOString()}, ${ATTEMPTS} password grants against ${API}`);
for (const [status, n] of [...counts.entries()].sort((a, b) => a[0] - b[0])) {
  const first = firstOf.get(status)!;
  console.log(`status ${status}: ${n} times, first at attempt ${first.attempt}; headers ${JSON.stringify(first.headers)}; body ${first.body}`);
}
