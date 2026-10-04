import { expect, it } from 'vitest';
import { evolveBrief, openingDocument } from '../../../supabase/functions/_shared/discovery-brief.ts';
import { fileDigestContext, fileLimitReached, fileReport, mergeFileDigests, parseFileDigest, screenFile, splitFileText, type FileRow } from '../../../supabase/functions/_shared/discovery-files.ts';
import { decideDiscoveryFile } from '../../../supabase/functions/_shared/discovery-file-write.ts';
import type { AccountWriteRouteInput } from '../../../supabase/functions/_shared/write-routes.ts';

it('splits the complete text without dropping characters or splitting surrogate pairs', () => {
  const text = 'abcd😀efgh\nijkl';
  const parts = splitFileText(text, 5);
  expect(parts.join('')).toBe(text);
  expect(parts.every((part) => part.length <= 5 && !/[\uD800-\uDBFF]$/.test(part))).toBe(true);
  expect(splitFileText('small')).toEqual(['small']);
  expect(splitFileText('')).toEqual(['']);
});

it('merges all part digests in order, removing only exact repeats', () => {
  const a = { sectionId: 'usersToday', text: '45 volunteers' };
  const b = { sectionId: 'usersToday', text: 'Three kitchens' };
  expect(mergeFileDigests([{ facts: [a], questions: ['Who coordinates?'] }, { facts: [a, b], questions: ['Who coordinates?', 'Which days?'] }]))
    .toEqual({ facts: [a, b], questions: ['Who coordinates?', 'Which days?'] });
});

it('counts only live Discovery files on unfunded projects', () => {
  const files = [{ origin: 'intake' }, ...Array.from({ length: 3 }, () => ({ origin: 'discovery' }))];
  expect(fileLimitReached(false, files)).toBe(true);
  expect(fileLimitReached(false, files.slice(0, 3))).toBe(false);
  expect(fileLimitReached(false, [...files.slice(0, 3), { origin: 'discovery', removedAt: '2026-10-03' }])).toBe(false);
  expect(fileLimitReached(true, Array.from({ length: 100 }, () => ({ origin: 'discovery' })))).toBe(false);
});

it('accepts facts only for known sections and retains questions as digest data', () => {
  expect(parseFileDigest({ facts: [{ sectionId: 'unknown', text: 'fact' }], questions: [] }, ['usersToday'])).toBeNull();
  expect(parseFileDigest({ facts: [], questions: [42] }, ['usersToday'])).toBeNull();
  expect(parseFileDigest({ facts: [{ sectionId: 'usersToday', text: ' Volunteers ' }], questions: ['Who?'] }, ['usersToday']))
    .toEqual({ facts: [{ sectionId: 'usersToday', text: 'Volunteers' }], questions: ['Who?'] });
});

it('publishes file facts with provenance while every required topic remains open', () => {
  const version = openingDocument({ need: 'Coordinate kitchens' });
  const result = evolveBrief(version, { kind: 'apply-file-facts', fileId: 'file', fileName: 'rota.txt', facts: [
    { sectionId: 'usersToday', text: '45 volunteers across three kitchens' },
    { sectionId: 'measure', text: 'Two hours' },
  ] });
  expect(result.kind).toBe('changed');
  if (result.kind !== 'changed') throw new Error('the file fact was not published');
  expect(result.brief.revision).toBe(2);
  expect(result.brief.document.usersToday).toEqual({ text: '45 volunteers across three kitchens', source: { kind: 'file', fileId: 'file', fileName: 'rota.txt' } });
  expect(Object.values(result.brief.document.topics).every((topic) => topic.state.kind === 'open')).toBe(true);
});

it('projects progress, completion and failure to the screen contract', () => {
  const row = { id: 'file', name: 'rota.txt', size_bytes: 20, status: 'reading', total_parts: 4, completed_parts: 2, digest: null } as FileRow;
  expect(screenFile(row).status).toEqual({ kind: 'reading', percent: 50 });
  expect(screenFile({ ...row, status: 'read', facts_count: 3 }).status).toEqual({ kind: 'ready', facts: 3 });
  expect(screenFile({ ...row, status: 'failed', failure_reason: 'Unreadable' }).status).toEqual({ kind: 'failed', reason: 'Unreadable' });
});

it('passes only completed live digests to later turns and composes the report', () => {
  const row = { id: 'file', name: 'rota.txt', status: 'read', removed_at: null,
    digest: { facts: [{ sectionId: 'usersToday', text: '45 volunteers' }], questions: ['Which days?'] } } as FileRow;
  const context = fileDigestContext([row, { ...row, id: 'removed', removed_at: '2026-10-03' }, { ...row, id: 'reading', status: 'reading' }]);
  expect(context).toHaveLength(1);
  expect(context[0]!.content).toContain('45 volunteers');
  expect(context[0]!.content).toContain('Which days?');
  expect(fileReport(row)).toBe('I finished reading rota.txt, and it shows that 45 volunteers');
});

it('refuses unsupported, oversized and non-admin uploads before storage', () => {
  const input = { caller: { id: 'ngo', emailVerified: true, githubHandle: null }, target: 'org', subject: null, ip: null,
    standing: { kind: 'account', accountType: 'ngo', lifecycle: 'active', orgExists: true, orgRole: 'admin', orgSeatAccountId: 'ngo', subject: null },
    body: { projectId: '00000000-0000-4000-8000-000000000001', action: 'add', file: {
      id: '00000000-0000-4000-8000-000000000002', name: 'rota.txt', sizeBytes: 42, mediaType: 'text/plain', contentHash: 'a'.repeat(64),
    } },
  } as AccountWriteRouteInput;
  expect(decideDiscoveryFile(input).ok).toBe(true);
  expect(decideDiscoveryFile({ ...input, body: { ...input.body, file: { ...(input.body.file as object), sizeBytes: 10485761 } } })).toMatchObject({ ok: false, kind: 'file-too-large' });
  expect(decideDiscoveryFile({ ...input, body: { ...input.body, file: { ...(input.body.file as object), mediaType: 'application/zip' } } })).toMatchObject({ ok: false, kind: 'unsupported-file-type' });
  expect(decideDiscoveryFile({ ...input, standing: { ...input.standing, orgRole: 'member' } })).toMatchObject({ ok: false, kind: 'not-an-admin' });
});
