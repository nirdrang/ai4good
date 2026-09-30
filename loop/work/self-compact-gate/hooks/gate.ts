// Unit-gate compaction. The lead's gate question offers Continue, Run /compact and Fast compact.
// On either compact answer the lead ends its turn; this hook then compacts and starts the next turn.
const FAST = 'Fast compact';
const FULL = 'Run /compact';
const INSTRUCTIONS =
  'Keep it short and point at files: the item, the branch, the resume note path, the next unit. The first action after compacting is to read the resume note.';
const GO = 'Compaction done. Read the resume note of the item on this branch (loop/items/<item>/resume.md), then start the next unit.';
const STUB = '[output removed by fast compact]';

function chosen(out: any): string[] {
  const answers = out?.result?.answers;
  if (answers && typeof answers === 'object') return Object.values(answers).map(String);
  return [...String(out?.text ?? '').matchAll(/"="([^"]+)"/g)].map((m) => m[1]);
}

async function contextSize($: any) {
  const b = (await $.session.usage({ breakdown: 'full' })).context.breakdown;
  return b ? `${Math.round(b.totalTokens / 1000)}k tokens (${b.percentage}% of the window)` : 'unknown';
}

async function fullCompact($: any) {
  await $.session.compact({ instructions: INSTRUCTIONS });
  await $.prompt.submit({ text: GO });
}

export const register = (on: any) => {
  let pending: 'fast' | 'full' | null = null;
  let trimming = false;
  let gateId: string | undefined;

  on('tool.call', async ($: any, e: any, next: any) => {
    const out = await next(e);
    if (e.tool !== 'AskUserQuestion' || e.agentId !== undefined) return out;
    const labels = chosen(out);
    if (labels.some((l) => l.startsWith(FAST))) pending = 'fast';
    else if (labels.some((l) => l.startsWith(FULL))) pending = 'full';
    else return out;
    gateId = e.tool_use_id;
    $.ui.log(`SELFCOMPACT gate answered ${pending}`);
    return out;
  });

  on('turn.complete', async ($: any, e: any, next: any) => {
    const r = await next(e);
    if (e.agentId !== undefined || !pending) return r;
    const mode = pending;
    pending = null;
    try {
      if (mode === 'full') {
        await fullCompact($);
        return r;
      }
      const before = await contextSize($);
      trimming = true;
      await $.session.compact({ instructions: INSTRUCTIONS });
      const after = await contextSize($);
      $.ui.log(`SELFCOMPACT fast compact: ${before} -> ${after}`);
      const pick = await $.ui.ask(`Fast compact done. Context was ${before}, now ${after}. Continue, or run /compact as well?`, [
        'Continue',
        FULL,
      ]);
      if (pick === FULL) await fullCompact($);
      else await $.prompt.submit({ text: pick === 'Continue' ? GO : pick });
    } catch (err: any) {
      $.ui.log('SELFCOMPACT gate compaction failed: ' + (err?.message ?? String(err)));
      $.ui.toast('Gate compaction failed; see the debug log. Type /compact or continue by hand.');
    } finally {
      trimming = false;
    }
    return r;
  });

  on('session.compact', async ($: any, e: any, next: any) => {
    if (!trimming) return next(e);
    trimming = false;
    const rows = e.messages;
    const cut = rows.findIndex((m: any) => m.toolResults?.some((t: any) => t.tool_use_id === gateId));
    const end = cut < 0 ? rows.length : cut;
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
