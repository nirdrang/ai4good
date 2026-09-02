/**
 * Pure parts of the shared stack module, proved before anything talks to a running stack.
 *
 * The integration adapter and the verify-ai4good drive both import this module. A decode
 * that left `=3D` in a verify link, or a status parse that swallowed a missing field, would
 * turn a live green into a false one. These cases are the ones the module's header claims.
 */

import { describe, expect, it } from 'vitest';

import { redactString, redactUrl, redactValue, STACK_ENV, stackFromEnv, verifyLinksIn } from './live-stack.ts';

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
