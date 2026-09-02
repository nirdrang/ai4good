/**
 * Pure parts of the shared stack module, proved before anything talks to a running stack.
 *
 * The integration adapter and the verify-ai4good drive both import this module. A decode
 * that left `=3D` in a verify link, or a status parse that swallowed a missing field, would
 * turn a live green into a false one. These cases are the ones the module's header claims.
 */

import { describe, expect, it } from 'vitest';

import {
  parseStatusJson,
  redactString,
  redactUrl,
  redactValue,
  stackFromStatusJson,
  verifyLinksIn,
} from './live-stack.ts';

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

describe('parseStatusJson', () => {
  it('returns the object when text sits before and after it', () => {
    const stdout = 'Stopped services.\n{"API_URL":"http://127.0.0.1:44321","DB_URL":"db"}\nDone.\n';
    expect(parseStatusJson(stdout)).toEqual({
      API_URL: 'http://127.0.0.1:44321',
      DB_URL: 'db',
    });
  });

  it('throws a message that names bun run db:start when there is no JSON object', () => {
    expect(() => parseStatusJson('Stopped services. no object here')).toThrow(/bun run db:start/);
  });
});

describe('stackFromStatusJson', () => {
  const full = {
    API_URL: 'http://127.0.0.1:44321',
    DB_URL: 'postgresql://127.0.0.1:54322/postgres',
    ANON_KEY: 'anon',
    SERVICE_ROLE_KEY: 'service',
    MAILPIT_URL: 'http://127.0.0.1:44324',
  };

  it('builds a Stack from the five status fields', () => {
    expect(stackFromStatusJson(full)).toEqual({
      apiUrl: full.API_URL,
      dbUrl: full.DB_URL,
      anonKey: full.ANON_KEY,
      serviceRoleKey: full.SERVICE_ROLE_KEY,
      mailUrl: full.MAILPIT_URL,
    });
  });

  it('accepts INBUCKET_URL when MAILPIT_URL is absent', () => {
    const { MAILPIT_URL: _dropped, ...rest } = full;
    expect(stackFromStatusJson({ ...rest, INBUCKET_URL: 'http://127.0.0.1:54324' }).mailUrl).toBe(
      'http://127.0.0.1:54324',
    );
  });

  it('throws naming the missing field', () => {
    const { ANON_KEY: _dropped, ...rest } = full;
    expect(() => stackFromStatusJson(rest)).toThrow(/ANON_KEY/);
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
