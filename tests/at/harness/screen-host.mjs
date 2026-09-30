// @ts-nocheck
// The browser callback below names document. This file is the only one that loads Playwright.
// A function named require() would pull Playwright's DOM types into the test project.
// Bun's chromium.launch hangs on this machine. Node owns the browser and answers JSON lines.

import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const load = createRequire(fileURLToPath(new URL('../../../package.json', import.meta.url)));
const { chromium } = load('playwright-core');

const LOCATOR_TIMEOUT_MS = 5_000;
const NAVIGATION_TIMEOUT_MS = 15_000;

let browser;
const pages = new Map();
let next = 1;
let queue = Promise.resolve();

function enqueue(job) {
  const run = queue.then(job, job);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function reply(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function entry(pageId) {
  const found = pages.get(pageId);
  if (!found) throw new Error(`no open page ${pageId}`);
  return found;
}

function locate(page, chain) {
  if (!Array.isArray(chain) || chain.length === 0) throw new Error('a locator needs at least one step');
  let loc = page;
  for (const step of chain) {
    const exact = step.exact !== false;
    if (typeof step.role === 'string') {
      loc = loc.getByRole(step.role, { name: step.name, exact });
    } else if (typeof step.text === 'string') {
      loc = loc.getByText(step.text, { exact });
    } else {
      throw new Error('a locator step needs a role or text');
    }
    if (step.position === 'last') loc = loc.last();
    else if (typeof step.position === 'number') loc = loc.nth(step.position);
  }
  return loc;
}

const ops = {
  async launch() {
    browser ??= await chromium.launch({ headless: true });
    return null;
  },
  async open({ url, viewport, phone, colorScheme, probe }) {
    if (!browser) throw new Error('the browser is not launched');
    if (typeof url !== 'string' || url.length === 0) throw new Error('open needs a url');
    const context = await browser.newContext({
      viewport,
      isMobile: phone === true,
      hasTouch: phone === true,
      colorScheme: colorScheme === 'dark' ? 'dark' : 'light',
    });
    const calls = [];
    if (typeof probe === 'string' && probe.length > 0) {
      await context.exposeFunction(probe, (kind) => {
        calls.push(String(kind));
      });
    }
    const page = await context.newPage();
    page.setDefaultTimeout(LOCATOR_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    const id = next++;
    pages.set(id, { page, context, calls });
    try {
      await page.goto(url, { waitUntil: 'load' });
    } catch (error) {
      pages.delete(id);
      await context.close();
      throw error;
    }
    return id;
  },
  async click({ page, chain }) {
    await locate(entry(page).page, chain).click();
    return null;
  },
  async fill({ page, chain, text }) {
    await locate(entry(page).page, chain).fill(String(text ?? ''));
    return null;
  },
  async press({ page, chain, key }) {
    await locate(entry(page).page, chain).press(String(key));
    return null;
  },
  async text({ page, chain, timeout }) {
    const timeoutMs = typeof timeout === 'number' ? timeout : LOCATOR_TIMEOUT_MS;
    return locate(entry(page).page, chain).innerText({ timeout: timeoutMs });
  },
  async count({ page, chain }) {
    return locate(entry(page).page, chain).count();
  },
  async visible({ page, chain }) {
    return locate(entry(page).page, chain).isVisible();
  },
  async box({ page, chain }) {
    return locate(entry(page).page, chain).boundingBox();
  },
  async attribute({ page, chain, name }) {
    return locate(entry(page).page, chain).getAttribute(String(name));
  },
  async style({ page, chain, name }) {
    return locate(entry(page).page, chain).evaluate((element, prop) => {
      return getComputedStyle(element).getPropertyValue(prop);
    }, String(name));
  },
  async scroll({ page, chain, top }) {
    await locate(entry(page).page, chain).evaluate((element, scrollTop) => {
      element.scrollTop = scrollTop;
    }, Number(top ?? 0));
    return null;
  },
  async focused({ page, chain }) {
    return locate(entry(page).page, chain).evaluate((element) => element === document.activeElement);
  },
  async value({ page, chain }) {
    return locate(entry(page).page, chain).inputValue();
  },
  async setFiles({ page, chain, files }) {
    const payload = (Array.isArray(files) ? files : []).map((file) => ({
      name: String(file.name),
      mimeType: String(file.mimeType),
      buffer: Buffer.from(String(file.base64 ?? ''), 'base64'),
    }));
    await locate(entry(page).page, chain).setInputFiles(payload);
    return null;
  },
  async modelCalls({ page }) {
    return entry(page).calls.slice();
  },
  async reload({ page }) {
    await entry(page).page.reload({ waitUntil: 'load' });
    return null;
  },
  async close({ page }) {
    const found = pages.get(page);
    if (!found) return null;
    pages.delete(page);
    await found.context.close();
    return null;
  },
  async shutdown() {
    const open = [...pages.values()];
    pages.clear();
    for (const found of open) {
      await found.context.close();
    }
    await browser?.close();
    browser = undefined;
    return null;
  },
};

createInterface({ input: process.stdin }).on('line', (line) => {
  if (line.trim().length === 0) return;
  enqueue(async () => {
    let id = null;
    try {
      const message = JSON.parse(line);
      id = message.id;
      const run = ops[message.op];
      if (!run) throw new Error(`unknown screen command ${message.op}`);
      const value = await run(message.args ?? {});
      reply({ id, ok: true, value });
    } catch (error) {
      reply({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });
});

process.stdin.on('end', () => {
  queue.then(() => process.exit(0));
});
