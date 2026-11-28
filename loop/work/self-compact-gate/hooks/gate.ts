// Unit-gate compaction. The lead's gate question offers Continue, Run /compact and Fast compact.
// On either compact answer the lead ends its turn; this hook then compacts and starts the next turn.
const FAST = 'Fast compact';
const FULL = 'Run /compact';
const INSTRUCTIONS =
  'Keep it short and point at files: the item, the branch, the resume note path, the next unit. The first action after compacting is to read the resume note.';
const GO = 'Compaction done. Read the resume note of the item on this branch (loop/items/<item>/resume.md), then start the next unit.';
const STUB = '[output removed by fast compact]';

type Mode = 'fast' | 'full';
type Run = { mode: Mode; gateId: string | undefined; compacted: boolean };

const isGate = (q: any) => (q.options ?? []).some((o: any) => String(o.label).startsWith(FAST));

function chosen(out: any): string[] {
  const answers = out?.result?.answers;
  if (answers && typeof answers === 'object') return Object.values(answers).map(String);
  return [...String(out?.text ?? '').matchAll(/"="([^"]+)"/g)].map((m) => m[1]);
}

async function contextSize($: any) {
  const b = (await $.session.usage({ breakdown: 'full' })).context.breakdown;
  return b ? `${Math.round(b.totalTokens / 1000)}k tokens (${b.percentage}% of the window)` : 'unknown';
}

export const register = (on: any) => {
  let pending: Run | null = null;
  let current: Run | null = null;

  on('tool.call', async ($: any, e: any, next: any) => {
    if (e.tool !== 'AskUserQuestion' || e.agentId !== undefined || !Array.isArray(e.questions) || !e.questions.some(isGate)) return next(e);
    const size = await contextSize($).catch(() => undefined);
    if (size) e = { ...e, questions: e.questions.map((q: any) => (isGate(q) ? { ...q, question: `Context now: ${size}. ${q.question}` } : q)) };
    const out = await next(e);
    const labels = chosen(out);
    const mode: Mode | null = labels.some((l) => l.startsWith(FAST)) ? 'fast' : labels.some((l) => l.startsWith(FULL)) ? 'full' : null;
    if (!mode) return out;
    pending = { mode, gateId: e.tool_use_id, compacted: false };
    $.ui.log(`SELFCOMPACT gate answered ${mode}`);
    return out;
  });

  // $.session.compact() is refused in SDK sessions (the desktop app); /compact queued from here runs at idle.
  on('turn.complete', async ($: any, e: any, next: any) => {
    const r = await next(e);
    if (e.agentId !== undefined || !pending) return r;
    const run = pending;
    pending = null;
    current = run;
    $.ui.log(`SELFCOMPACT ${run.mode} compact queued at ${await contextSize($).catch(() => 'unknown')}`);
    $.command
      .run({ command: 'compact', args: INSTRUCTIONS })
      .then((res: any) => {
        if (!run.compacted) throw new Error(res?.text ?? 'the compaction did not run');
        return $.prompt.submit({ text: GO });
      })
      .catch((err: any) => {
        $.ui.log('SELFCOMPACT gate compaction failed: ' + (err?.message ?? String(err)));
        $.ui.toast('Gate compaction failed; see the debug log. Type /compact or continue by hand.');
      })
      .finally(() => {
        if (current === run) current = null;
      });
    return r;
  });

  on('session.compact', async ($: any, e: any, next: any) => {
    const run = current;
    if (!run || e.agentId !== undefined || e.instructions !== INSTRUCTIONS) return next(e);
    if (run.mode === 'full') {
      const res = await next(e);
      run.compacted = !res?.skip;
      return res;
    }
    const rows = e.messages;
    const cut = rows.findIndex((m: any) => m.toolResults?.some((t: any) => t.tool_use_id === run.gateId));
    const end = cut < 0 ? rows.length : cut;
    run.compacted = true;
    return {
      messages: rows.map((m: any, i: number) =>
        i >= end
          ? m
          : {
              ...m,
              toolUses: (m.toolUses ?? []).map(({ result, text, ...u }: any) => u),
              toolResults: (m.toolResults ?? []).map((t: any) => ({ tool_use_id: t.tool_use_id, text: STUB, isError: !!t.isError })),
            },
      ),
    };
  });
};
