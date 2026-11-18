import { readFileSync } from 'node:fs';
import { expect } from 'vitest';
import { atTest, AtPending } from './_bind.ts';
import { functionPost, sqlClient, stackFromEnv, type Stack } from '../../harness/live-stack.ts';
import { openingDocument, type BriefDocument } from '../../../../supabase/functions/_shared/discovery-brief.ts';
import { fileReport, type FileRow } from '../../../../supabase/functions/_shared/discovery-files.ts';
import type { NeedsSut } from '../req-003/_contract.ts';
import { seedFileProject, uploadFile, waitForFile } from './_files.ts';
import { SEVEN_FORMATS, fixtureUrl, type FormatFixture } from './fixtures/seven-formats.ts';

const NEED = 'Coordinate volunteers across our community kitchens.';
const noStack = (id: string) => async () => { throw new AtPending(id, 'sut-missing', 'The loop tier has no stack to read files from.'); };

type Uploaded = { fixture: FormatFixture; token: string; row: FileRow };
type Seeded = { stack: Stack; bearer: () => Promise<string>; organizationId: string; projectId: string; files: Uploaded[] };

let seeding: Promise<Seeded> | undefined;

async function seedSevenFiles(email: string, sut: NeedsSut): Promise<Seeded> {
  const stack = stackFromEnv();
  const seed = await seedFileProject(stack, sut, email, { title: 'Kitchen volunteer rota', description: NEED, brief: openingDocument({ need: NEED }) });
  try {
    await seed.sql`update public.projects set funded_at = clock_timestamp() where id = ${seed.projectId}::uuid`;
    const added = [];
    for (const fixture of SEVEN_FORMATS) {
      const token = crypto.randomUUID().slice(0, 8);
      const name = `rota-${token}.${fixture.file.split('.').pop()}`;
      const bytes = new Uint8Array(readFileSync(fixtureUrl(fixture)));
      const upload = await uploadFile(stack, seed.bearer, seed.ngo.organizationId, seed.projectId, name, bytes, fixture.mediaType);
      expect(upload, `${fixture.format}: ${JSON.stringify(upload)}`).toMatchObject({ status: 200, body: { ok: true } });
      added.push({ fixture, token, id: String((upload.body.file as { id: string }).id) });
    }
    const files: Uploaded[] = [];
    for (const { fixture, token, id } of added) files.push({ fixture, token, row: await waitForFile(stack, seed.freshBearer, seed.projectId, id) });
    return { stack, bearer: seed.freshBearer, organizationId: seed.ngo.organizationId, projectId: seed.projectId, files };
  } finally { await seed.sql.close(); }
}

const seeded = (email: string, sut: NeedsSut) => (seeding ??= seedSevenFiles(email, sut));

async function ask(seed: Seeded, message: string): Promise<string> {
  const answer = await functionPost(seed.stack, 'discovery-message', {
    mode: 'answer', userMessageId: crypto.randomUUID(), answers: [], expectedCharge: 'free',
    organizationId: seed.organizationId, projectId: seed.projectId, message,
  }, await seed.bearer());
  expect(answer.json.ok, `the turn "${message}" was refused: ${JSON.stringify(answer.json)}`).toBe(true);
  return seed.files.reduce((text, file) => text.replace(fileReport(file.row), ''), String(answer.json.reply));
}

async function discoveryDocument(seed: Seeded): Promise<BriefDocument> {
  const sql = sqlClient(seed.stack);
  try {
    const [latest] = await sql`select document from public.brief_revisions where project_id = ${seed.projectId}::uuid order by revision desc limit 1` as { document: BriefDocument }[];
    return latest!.document;
  } finally { await sql.close(); }
}

const derives = (fixture: FormatFixture, text: string) =>
  new RegExp(`${fixture.kitchen}[^\\n]{0,120}\\b${fixture.volunteers}\\b|\\b${fixture.volunteers}\\b[^\\n]{0,120}${fixture.kitchen}`, 'i').test(text);

const EVERY_FORMAT = Object.fromEntries(SEVEN_FORMATS.map((fixture) => [fixture.format, true]));

atTest('AT-032.12', 'reads derive content from all seven formats', { timeoutMs: { integration: 900_000 } }, {
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const seed = await seeded(w.email('seven-formats'), sut);
    const document = await discoveryDocument(seed);
    const reply = await ask(seed, 'Before your next question, list every kitchen my files mention, with its shift and how many volunteers it needs.');
    const derived = Object.fromEntries(seed.files.map(({ fixture, row }) => {
      const cited = (document.fileFacts ?? []).filter((fact) => fact.source.fileId === row.id).map((fact) => fact.text).join('\n');
      return [fixture.format, derives(fixture, reply) || derives(fixture, cited)];
    }));
    expect(derived, `reply: ${reply}\nfile facts: ${JSON.stringify(document.fileFacts)}`).toEqual(EVERY_FORMAT);
  },
  default: noStack('AT-032.12'),
});

atTest('AT-032.08', 'file digests and citations in Discovery', { timeoutMs: { integration: 900_000 } }, {
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const seed = await seeded(w.email('seven-formats'), sut);

    const named = await ask(seed, 'Which files have I added so far? Give each exact file name.');
    expect(Object.fromEntries(seed.files.map(({ fixture, token }) => [fixture.format, named.includes(token)])), `reply: ${named}`).toEqual(EVERY_FORMAT);

    const document = await discoveryDocument(seed);
    const citations = (document.fileFacts ?? []).filter((fact) => seed.files.some(({ fixture, row }) =>
      fact.source.fileId === row.id && fact.source.fileName === row.name && derives(fixture, fact.text)));
    expect(citations.length, `the Discovery document cites a file for a fact it holds: ${JSON.stringify(document.fileFacts)}`).toBeGreaterThan(0);

    throw new AtPending('AT-032.08', 'sut-missing', 'A Discovery question cites a file only about one time in three: the reply prompt never lets Discovery name a file in a question.');
  },
  default: noStack('AT-032.08'),
});
