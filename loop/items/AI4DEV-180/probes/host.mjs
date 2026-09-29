import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
const { chromium } = createRequire('C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-180-unit1/package.json')('playwright-core');

let browser;
const pages = new Map();
let next = 1;

function locate(page, chain) {
  let loc = page;
  for (const step of chain) loc = step.role ? loc.getByRole(step.role, { name: step.name, exact: true }) : loc.getByText(step.text, { exact: true });
  return loc;
}

const ops = {
  async open({ html, viewport }) {
    browser ??= await chromium.launch();
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.setContent(html);
    const id = next++;
    pages.set(id, page);
    return id;
  },
  async box({ page, chain }) { return locate(pages.get(page), chain).boundingBox(); },
  async fill({ page, chain, text }) { await locate(pages.get(page), chain).fill(text); return null; },
  async text({ page, chain }) { return locate(pages.get(page), chain).textContent(); },
  async close() { await browser?.close(); return null; },
};

createInterface({ input: process.stdin }).on('line', async (line) => {
  const { id, op, args } = JSON.parse(line);
  try { process.stdout.write(JSON.stringify({ id, ok: true, value: await ops[op](args) }) + '\n'); }
  catch (e) { process.stdout.write(JSON.stringify({ id, ok: false, error: String(e?.message ?? e) }) + '\n'); }
});
