import { readFileSync } from 'node:fs';
import { expect } from 'vitest';
import { atTest, AtPending } from './_bind.ts';
import { functionPost, stackFromEnv, type Stack } from '../../harness/live-stack.ts';
import { testOpening } from '../../harness/discovery-topic-plan.ts';
import { fileReport, type FileRow } from '../../../../supabase/functions/_shared/discovery-files.ts';
import type { NeedsSut } from '../req-003/_contract.ts';
import { seedFileProject, uploadFile, waitForFile } from './_files.ts';
import { FILE_FORMATS, fixtureUrl, type FormatFixture } from './fixtures/file-formats.ts';

const NEED = 'Coordinate volunteers across our community kitchens.';
const noStack = (id: string) => async () => { throw new AtPending(id, 'sut-missing', 'The loop tier has no stack to read files from.'); };

type Uploaded = { fixture: FormatFixture; row: FileRow };
type Seeded = { stack: Stack; bearer: () => Promise<string>; organizationId: string; projectId: string; files: Uploaded[] };

async function seedFormatFiles(email: string, sut: NeedsSut): Promise<Seeded> {
  const stack = stackFromEnv();
  const seed = await seedFileProject(stack, sut, email, { title: 'Kitchen volunteer rota', description: NEED, brief: testOpening(NEED) });
  try {
    await seed.sql`update public.projects set funded_at = clock_timestamp() where id = ${seed.projectId}::uuid`;
    const added = [];
    for (const fixture of FILE_FORMATS) {
      const name = `rota-${crypto.randomUUID().slice(0, 8)}.${fixture.file.split('.').pop()}`;
      const bytes = new Uint8Array(readFileSync(fixtureUrl(fixture)));
      const upload = await uploadFile(stack, seed.bearer, seed.ngo.organizationId, seed.projectId, name, bytes, fixture.mediaType);
      expect(upload, `${fixture.format}: ${JSON.stringify(upload)}`).toMatchObject({ status: 200, body: { ok: true } });
      added.push({ fixture, id: String((upload.body.file as { id: string }).id) });
    }
    const files: Uploaded[] = [];
    for (const { fixture, id } of added) files.push({ fixture, row: await waitForFile(stack, seed.freshBearer, seed.projectId, id) });
    return { stack, bearer: seed.freshBearer, organizationId: seed.ngo.organizationId, projectId: seed.projectId, files };
  } finally { await seed.sql.close(); }
}

async function ask(seed: Seeded, message: string): Promise<string> {
  const answer = await functionPost(seed.stack, 'discovery-message', {
    mode: 'answer', userMessageId: crypto.randomUUID(), answers: [], expectedCharge: 'free',
    organizationId: seed.organizationId, projectId: seed.projectId, message,
  }, await seed.bearer());
  expect(answer.json.ok, `the turn "${message}" was refused: ${JSON.stringify(answer.json)}`).toBe(true);
  return seed.files.reduce((text, file) => text.replace(fileReport(file.row), ''), String(answer.json.reply));
}

const derives = (fixture: FormatFixture, text: string) =>
  new RegExp(`${fixture.kitchen}[^\\n]{0,120}\\b${fixture.volunteers}\\b|\\b${fixture.volunteers}\\b[^\\n]{0,120}${fixture.kitchen}`, 'i').test(text);

const EVERY_FORMAT = Object.fromEntries(FILE_FORMATS.map((fixture) => [fixture.format, true]));

atTest('AT-032.12', 'reads derive content from a PDF, an image and a scanned PDF', { timeoutMs: { integration: 900_000 } }, {
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const seed = await seedFormatFiles(w.email('file-formats'), sut);
    const reply = await ask(seed, 'Before your next question, list every kitchen my files mention, one line per kitchen, giving on that line the kitchen name, its shift and how many volunteers it needs.');
    const derived = Object.fromEntries(seed.files.map(({ fixture }) => [fixture.format, derives(fixture, reply)]));
    expect(derived, `reply: ${reply}`).toEqual(EVERY_FORMAT);
  },
  default: noStack('AT-032.12'),
});

atTest('AT-032.08', 'file digests and citations in Discovery', async () => { throw new AtPending('AT-032.08', 'sut-missing', 'A Discovery question cannot cite a file yet: question text comes from the planned topic questions in discovery-brief.ts, not from the model.'); });
