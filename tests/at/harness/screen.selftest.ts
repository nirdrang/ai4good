import { describe, expect, it } from 'vitest';
import { eventually, mimeType, shellUrl } from './screen.ts';

describe('shellUrl', () => {
  it('opens the chat for a scenario', () => {
    expect(shellUrl('http://127.0.0.1:9', 'first-reply', 'chat')).toBe(
      'http://127.0.0.1:9/?scenario=first-reply&pace=test#discovery',
    );
  });

  it('opens the review for a scenario', () => {
    expect(shellUrl('http://127.0.0.1:9', 'first-reply', 'review')).toBe(
      'http://127.0.0.1:9/?scenario=first-reply&pace=test#discovery-review',
    );
  });
});

describe('mimeType', () => {
  it('names the types the shell serves', () => {
    expect(mimeType('index.html')).toBe('text/html; charset=utf-8');
    expect(mimeType('app.js')).toBe('text/javascript; charset=utf-8');
    expect(mimeType('app.css')).toBe('text/css; charset=utf-8');
    expect(mimeType('data.json')).toBe('application/json');
    expect(mimeType('icon.svg')).toBe('image/svg+xml');
    expect(mimeType('icon.png')).toBe('image/png');
    expect(mimeType('font.woff2')).toBe('font/woff2');
    expect(mimeType('app.js.map')).toBe('application/json');
    expect(mimeType('file.bin')).toBe('application/octet-stream');
  });
});

describe('eventually', () => {
  it('returns the value once it is accepted', async () => {
    let count = 0;
    const value = await eventually('the count reaches 2', async () => ++count, (current) => current === 2, 1_000);
    expect(value).toBe(2);
  });

  it('names the value that never arrived', async () => {
    await expect(eventually('stuck', async () => 1, () => false, 30)).rejects.toThrow(/stuck/);
  });
});
