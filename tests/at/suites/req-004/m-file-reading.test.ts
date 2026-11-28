import { expect } from 'vitest';
import { atTest, AtPending } from './_bind.ts';
import { stackFromEnv } from '../../harness/live-stack.ts';
import { seedFileProject, uploadFile, waitForFile } from '../req-032/_files.ts';
import { fileReport, type FileRow } from '../../../../supabase/functions/_shared/discovery-files.ts';
import type { DiscoverySut, Session } from './_contract.ts';
import { pdfFromText } from '../../harness/pdf.ts';

const SATURDAY = 'Harbor kitchen volunteers\nThe Harbor kitchen needs 17 volunteers on Saturday mornings, and they sign in at the blue cupboard.\n';
const SHIFT_RULES = 'rule,detail\nShift swaps,A swap is approved by the duty lead Marisol at least 36 hours before the shift.\nLate arrival,Volunteers text the kitchen phone when they will be late.\n';
const ASKS_FOR_FILE = /Your files|\b(add|upload|attach|share)\b[^.?!]*\b(spreadsheet|file|sheet|document|it)\b/i;
const noStack = (id: string) => async () => { throw new AtPending(id, 'sut-missing', 'The loop tier has no stack to read files from.'); };

async function say(sut: DiscoverySut, session: Session, scope: { organizationId: string; projectId: string }, message: string, files: readonly FileRow[] = []) {
  const sent = await sut.sendMessage(session, { ...scope, message });
  if (!sent.ok) throw new Error(`the turn "${message}" was refused: ${sent.reason}`);
  return files.reduce((text, file) => text.replace(fileReport(file), ''), sent.reply);
}

atTest('AT-004.16', 'Discovery answers from a fact only an uploaded file holds', { timeoutMs: { integration: 600_000 } }, {
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const stack = stackFromEnv();
    const seed = await seedFileProject(stack, sut, w.email('file-fact'));
    const scope = { organizationId: seed.ngo.organizationId, projectId: seed.projectId };
    try {
      const added = await uploadFile(stack, seed.bearer, scope.organizationId, scope.projectId, 'harbor-saturdays.pdf', pdfFromText(SATURDAY));
      expect(added, JSON.stringify(added)).toMatchObject({ status: 200, body: { ok: true } });
      const file = await waitForFile(stack, seed.freshBearer, scope.projectId, String((added.body.file as { id: string }).id));
      const reply = await say(sut, seed.ngo.session, scope, 'How many volunteers does the Harbor kitchen need on Saturday mornings, and where do they sign in?', [file]);
      expect(reply, 'the reply gives the count from the file').toMatch(/\b17\b/);
      expect(reply, 'the reply gives the place from the file').toMatch(/blue cupboard/i);
    } finally { await seed.sql.close(); }
  },
  default: noStack('AT-004.16'),
});

atTest('AT-004.18', 'mid-conversation, the AI asks for a file and uses it in a later turn', { timeoutMs: { integration: 600_000 } }, {
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const stack = stackFromEnv();
    const seed = await seedFileProject(stack, sut, w.email('file-ask'));
    const scope = { organizationId: seed.ngo.organizationId, projectId: seed.projectId };
    try {
      await say(sut, seed.ngo.session, scope, 'Our main priority is less time spent coordinating volunteers each week.');
      const ask = await say(sut, seed.ngo.session, scope, 'The rules for swapping shifts are all in a spreadsheet our kitchen leads keep.');
      expect(ask, 'the reply asks the NGO to add the spreadsheet').toMatch(ASKS_FOR_FILE);
      const added = await uploadFile(stack, seed.bearer, scope.organizationId, scope.projectId, 'shift-rules.pdf', pdfFromText(SHIFT_RULES));
      expect(added, JSON.stringify(added)).toMatchObject({ status: 200, body: { ok: true } });
      const file = await waitForFile(stack, seed.freshBearer, scope.projectId, String((added.body.file as { id: string }).id));
      const used = await say(sut, seed.ngo.session, scope, 'I added the rules as a PDF. Who approves a shift swap, and how early?', [file]);
      expect(used, 'the later reply names the approver from the file').toMatch(/Marisol/);
      expect(used, 'the later reply gives the notice from the file').toMatch(/\b36\b/);
    } finally { await seed.sql.close(); }
  },
  default: noStack('AT-004.18'),
});
