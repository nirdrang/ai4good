/**
 * Pure parts of the shared stack module, proved before anything talks to a running stack.
 *
 * The integration adapter and the verify-ai4good drive both import this module. A decode
 * that left `=3D` in a verify link, or a status parse that swallowed a missing field, would
 * turn a live green into a false one. These cases are the ones the module's header claims.
 */

import { describe, expect, it } from 'vitest';

import {
  authPost,
  functionPost,
  functionPostRaw,
  redactString,
  redactUrl,
  redactValue,
  restGet,
  STACK_ENV,
  stackFromEnv,
  verifyLinksFor,
  verifyLinksIn,
  type Stack,
} from './live-stack.ts';

const STACK: Stack = {
  apiUrl: 'http://127.0.0.1:44321',
  dbUrl: 'postgres://127.0.0.1/unused',
  anonKey: 'anon-test-key',
  serviceRoleKey: 'service-test-key',
  mailUrl: 'http://127.0.0.1:54324',
};

describe('verifyLinksIn', () => {
  it('decodes quoted-printable with a soft break inside =3D and &amp; in an HTML part', () => {
    // Soft break sits inside the `=3D` escape (`=3` + `=\r\n` + `D`). Order is load-bearing:
    // unwrap, then `=XX`, then `&amp;`. Decode-first would leave `=3D` in the URL.
    const raw =
      'Click https://127.0.0.1:44321/auth/v1/verify?token=3=\r\nDabc&amp;type=3=\r\nDsignup. extra';
    expect(verifyLinksIn(raw, 'signup')).toEqual([
      'https://127.0.0.1:44321/auth/v1/verify?token=abc&type=signup',
    ]);
  });

  it('returns the verify link whose type= matches kind and drops the other kind', () => {
    const raw =
      'signup https://127.0.0.1:44321/auth/v1/verify?token=3Daaa&type=3Dsignup\n' +
      'reset https://127.0.0.1:44321/auth/v1/verify?token=3Dbbb&type=3Drecovery';
    expect(verifyLinksIn(raw, 'signup')).toEqual([
      'https://127.0.0.1:44321/auth/v1/verify?token=aaa&type=signup',
    ]);
    expect(verifyLinksIn(raw, 'recovery')).toEqual([
      'https://127.0.0.1:44321/auth/v1/verify?token=bbb&type=recovery',
    ]);
  });

  it('strips trailing .,;', () => {
    const raw = 'see https://127.0.0.1:44321/auth/v1/verify?token=3Dabc&type=3Dsignup.; extra';
    expect(verifyLinksIn(raw, 'signup')).toEqual([
      'https://127.0.0.1:44321/auth/v1/verify?token=abc&type=signup',
    ]);
  });

  it('returns [] for a body with no verify link', () => {
    expect(verifyLinksIn('no link here, only https://example.test/other', 'signup')).toEqual([]);
  });
});

describe('stackFromEnv', () => {
  const names = Object.values(STACK_ENV);

  function restore(saved: Record<string, string | undefined>): void {
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }

  it('refuses naming the missing variable for a mandatory coordinate', () => {
    const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    try {
      for (const name of names) delete process.env[name];
      expect(() => stackFromEnv()).toThrow(new RegExp(STACK_ENV.apiUrl));
      process.env[STACK_ENV.apiUrl] = 'http://127.0.0.1:9';
      expect(() => stackFromEnv()).toThrow(new RegExp(STACK_ENV.dbUrl));
    } finally {
      restore(saved);
    }
  });
});

describe('redactString', () => {
  it('replaces a JWT-shaped substring', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.aaaaaaaaaaaaaaaaaaaaaa';
    expect(redactString(`Bearer ${jwt}`)).toBe('Bearer [REDACTED-JWT]');
  });

  it('replaces an sb_publishable or sb_secret key', () => {
    expect(redactString('sb_publishable_abc123XYZ and sb_secret_def456')).toBe(
      '[REDACTED-KEY] and [REDACTED-KEY]',
    );
  });
});

describe('redactUrl', () => {
  it('replaces every query value and cuts the fragment', () => {
    const raw =
      'http://127.0.0.1:44321/auth/v1/verify?token=secret&type=signup#access_token=xyz';
    const redacted = redactUrl(raw);
    expect(redacted).not.toContain('secret');
    expect(redacted).not.toContain('signup');
    expect(redacted).not.toContain('access_token');
    expect(redacted).toContain('token=REDACTED');
    expect(redacted).toContain('type=REDACTED');
    expect(redacted).not.toContain('#');
  });

  it('returns a sentinel for an unparseable URL', () => {
    expect(redactUrl('not a url')).toBe('[UNPARSEABLE-URL-REDACTED]');
  });
});

describe('redactValue', () => {
  it('redacts credential-shaped keys and walks arrays and objects', () => {
    expect(
      redactValue({
        msg: 'ok',
        password: 'secret',
        access_token: 'tok',
        nested: { apikey: 'k', list: ['plain'] },
      }),
    ).toEqual({
      msg: 'ok',
      password: '[REDACTED]',
      access_token: '[REDACTED]',
      nested: { apikey: '[REDACTED]', list: ['plain'] },
    });
  });
});

describe('verifyLinksFor poll bound', () => {
  const searchUrl = `${STACK.mailUrl}/api/v1/search?query=${encodeURIComponent('to:wait@example.test')}&limit=50`;
  const summaries = Array.from({ length: 50 }, (_, i) => ({
    ID: `msg-${i + 1}`,
    Subject: 'mail',
    To: [{ Address: 'wait@example.test' }],
  }));

  function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  function textResponse(body: string): Response {
    return new Response(body, { status: 200 });
  }

  async function delay(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw signal.reason instanceof Error ? signal.reason : new DOMException('The operation was aborted.', 'AbortError');
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      const onAbort = () => {
        clearTimeout(timer);
        reject(signal?.reason instanceof Error ? signal.reason : new DOMException('The operation was aborted.', 'AbortError'));
      };
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  it('returns [] within about 1.5 seconds when fifty slow raw reads carry no verify link', async () => {
    const original = globalThis.fetch;
    try {
      const stub: typeof fetch = async (input, init) => {
        const url = String(input);
        if (url === searchUrl) return jsonResponse({ messages: summaries });
        if (url.includes('/raw')) {
          await delay(200, init?.signal ?? undefined);
          return textResponse('no verify link here');
        }
        throw new Error(`unexpected fetch ${url}`);
      };
      globalThis.fetch = stub;

      const started = Date.now();
      const links = await verifyLinksFor(STACK, 'wait@example.test', 'signup', 1_000);
      const elapsed = Date.now() - started;
      expect(links).toEqual([]);
      expect(elapsed, `poll ran ${elapsed} ms`).toBeLessThan(1_500);
    } finally {
      globalThis.fetch = original;
    }
  });

  it('stops after the third raw read when that message carries the link', async () => {
    const original = globalThis.fetch;
    let rawReads = 0;
    try {
      const stub: typeof fetch = async (input) => {
        const url = String(input);
        if (url.includes('/api/v1/search')) return jsonResponse({ messages: summaries });
        if (url.includes('/raw')) {
          rawReads += 1;
          if (rawReads === 3) {
            return textResponse('see https://127.0.0.1:44321/auth/v1/verify?token=3Dabc&type=3Dsignup');
          }
          return textResponse('no verify link here');
        }
        throw new Error(`unexpected fetch ${url}`);
      };
      globalThis.fetch = stub;

      const links = await verifyLinksFor(STACK, 'wait@example.test', 'signup');
      expect(links).toEqual(['https://127.0.0.1:44321/auth/v1/verify?token=abc&type=signup']);
      expect(rawReads).toBe(3);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('authPost and functionPost request shape', () => {
  function captureFetch(): { calls: { url: string; method?: string; headers: Record<string, string> }[] } {
    const calls: { url: string; method?: string; headers: Record<string, string> }[] = [];
    const stub: typeof fetch = async (input, init) => {
      const headers = { ...(init?.headers as Record<string, string> | undefined) };
      calls.push({ url: String(input), method: init?.method, headers });
      return new Response('{}', { status: 200 });
    };
    globalThis.fetch = stub;
    return { calls };
  }

  it('sends POST with apikey, Bearer anon, and Content-Type', async () => {
    const original = globalThis.fetch;
    try {
      const { calls } = captureFetch();
      await authPost(STACK, '/auth/v1/signup', { a: 1 });
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('POST');
      expect(calls[0].url).toBe('http://127.0.0.1:44321/auth/v1/signup');
      expect(calls[0].headers.apikey).toBe(STACK.anonKey);
      expect(calls[0].headers.Authorization).toBe(`Bearer ${STACK.anonKey}`);
      expect(calls[0].headers['Content-Type']).toBe('application/json');
    } finally {
      globalThis.fetch = original;
    }
  });

  it('replaces the anon key with the given bearer', async () => {
    const original = globalThis.fetch;
    try {
      const { calls } = captureFetch();
      await authPost(STACK, '/auth/v1/signup', { a: 1 }, 'user-token');
      expect(calls[0].headers.apikey).toBe(STACK.anonKey);
      expect(calls[0].headers.Authorization).toBe('Bearer user-token');
    } finally {
      globalThis.fetch = original;
    }
  });

  it('omits x-forwarded-for unless an ip is given', async () => {
    const original = globalThis.fetch;
    try {
      const { calls } = captureFetch();
      await functionPost(STACK, 'complete-signup', {}, 'tok');
      expect(calls[0].method).toBe('POST');
      expect(calls[0].url).toBe('http://127.0.0.1:44321/functions/v1/complete-signup');
      expect(calls[0].headers.apikey).toBe(STACK.anonKey);
      expect(calls[0].headers.Authorization).toBe('Bearer tok');
      expect(calls[0].headers['Content-Type']).toBe('application/json');
      expect(calls[0].headers['x-forwarded-for']).toBeUndefined();
      await functionPost(STACK, 'complete-signup', {}, 'tok', '203.0.113.7');
      expect(calls[1].headers['x-forwarded-for']).toBe('203.0.113.7');
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('restGet and functionPostRaw request shape', () => {
  function captureFetch(): { calls: { url: string; method?: string; headers: Record<string, string> }[] } {
    const calls: { url: string; method?: string; headers: Record<string, string> }[] = [];
    const stub: typeof fetch = async (input, init) => {
      const headers = { ...(init?.headers as Record<string, string> | undefined) };
      calls.push({ url: String(input), method: init?.method, headers });
      return new Response('{"ok":true}', { status: 200 });
    };
    globalThis.fetch = stub;
    return { calls };
  }

  it('restGet sends GET with apikey, Accept, and the caller bearer', async () => {
    const original = globalThis.fetch;
    try {
      const { calls } = captureFetch();
      const answer = await restGet(STACK, '/organizations?id=eq.1&select=id', 'user-token');
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('GET');
      expect(calls[0].url).toBe('http://127.0.0.1:44321/rest/v1/organizations?id=eq.1&select=id');
      expect(calls[0].headers.apikey).toBe(STACK.anonKey);
      expect(calls[0].headers.Authorization).toBe('Bearer user-token');
      expect(calls[0].headers.Accept).toBe('application/json');
      expect(answer.status).toBe(200);
      expect(answer.text).toBe('{"ok":true}');
    } finally {
      globalThis.fetch = original;
    }
  });

  it('restGet with a null bearer sends the anon key as bearer', async () => {
    const original = globalThis.fetch;
    try {
      const { calls } = captureFetch();
      await restGet(STACK, 'org_memberships?select=role', null);
      expect(calls[0].headers.Authorization).toBe(`Bearer ${STACK.anonKey}`);
      expect(calls[0].url).toBe('http://127.0.0.1:44321/rest/v1/org_memberships?select=role');
    } finally {
      globalThis.fetch = original;
    }
  });

  it('functionPostRaw returns the raw text and sends the anon key when bearer is null', async () => {
    const original = globalThis.fetch;
    try {
      const { calls } = captureFetch();
      const withToken = await functionPostRaw(STACK, 'organization-dashboard', { organizationId: 'x' }, 'tok');
      expect(calls[0].method).toBe('POST');
      expect(calls[0].url).toBe('http://127.0.0.1:44321/functions/v1/organization-dashboard');
      expect(calls[0].headers.Authorization).toBe('Bearer tok');
      expect(withToken.text).toBe('{"ok":true}');
      const asVisitor = await functionPostRaw(STACK, 'public-project', { projectId: 'x' }, null);
      expect(calls[1].headers.Authorization).toBe(`Bearer ${STACK.anonKey}`);
      expect(asVisitor.status).toBe(200);
    } finally {
      globalThis.fetch = original;
    }
  });
});
