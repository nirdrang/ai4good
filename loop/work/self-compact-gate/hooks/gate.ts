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

const CARD = 'mcp__hearthbot__request_decision';
const LEAD_NOTE = 'The fast compact gate compacts this session when this turn ends. End the turn now and start nothing; the next unit starts after the compaction.';

const isGate = (q: any) => (q.options ?? []).some((o: any) => String(o.label).startsWith(FAST));
const modeOf = (labels: string[]): Mode | null =>
  labels.some((l) => l.startsWith(FAST)) ? 'fast' : labels.some((l) => l.startsWith(FULL)) ? 'full' : null;

function chosen(out: any): string[] {
  const answers = out?.result?.answers;
  if (answers && typeof answers === 'object') return Object.values(answers).map(String);
  return [...String(out?.text ?? '').matchAll(/"="([^"]+)"/g)].map((m) => m[1]);
}

async function contextSize($: any) {
  const b = (await $.session.usage({ breakdown: 'full' })).context.breakdown;
  return b ? `${Math.round(b.totalTokens / 1000)}k tokens (${b.percentage}% of the window)` : 'unknown';
}

type Cards = Map<string, { labels: string[]; gateId: string | undefined }>;

// A project thread cannot show AskUserQuestion, so its lead opens the gate as a decision card,
// and the answer arrives later as a new prompt.
async function openCard($: any, e: any, next: any, cards: Cards) {
  const size = await contextSize($).catch(() => undefined);
  const out = await next(size ? { ...e, question: `Context now: ${size}. ${e.question}` } : e);
  const id = /message_id\W+(cmsg_[A-Za-z0-9]+)/.exec(out?.text ?? JSON.stringify(out?.result ?? ''))?.[1];
  if (id) cards.set(id, { labels: (e.options ?? []).map((o: any) => String(o.label)), gateId: e.tool_use_id });
  return out;
}

export const register = (on: any) => {
  let pending: Run | null = null;
  let current: Run | null = null;
  const cards: Cards = new Map();

  on('prompt.submit', async ($: any, e: any, next: any) => {
    const id = /decision_id=(cmsg_\S+?)</.exec(e.text)?.[1];
    const card = id ? cards.get(id) : undefined;
    const index = Number(/option_index=(\d+)/.exec(e.text)?.[1]);
    const mode = card && Number.isInteger(index) ? modeOf([card.labels[index] ?? '']) : null;
    if (!card || !mode) return next(e);
    cards.delete(id!);
    pending = { mode, gateId: card.gateId, compacted: false };
    $.ui.log(`SELFCOMPACT gate card answered ${mode}`);
    return next({ ...e, context: [...(e.context ?? []), LEAD_NOTE] });
  });

  on('tool.call', async ($: any, e: any, next: any) => {
    if (e.tool === CARD && e.agentId === undefined && isGate(e)) return openCard($, e, next, cards);
    if (e.tool !== 'AskUserQuestion' || e.agentId !== undefined || !Array.isArray(e.questions) || !e.questions.some(isGate)) return next(e);
    const size = await contextSize($).catch(() => undefined);
    if (size) e = { ...e, questions: e.questions.map((q: any) => (isGate(q) ? { ...q, question: `Context now: ${size}. ${q.question}` } : q)) };
    const out = await next(e);
    const mode = modeOf(chosen(out));
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
