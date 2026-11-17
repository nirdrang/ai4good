import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { organizationId, projectId, viewport } = input;
const route = `${input.baseUrl}/prd/${organizationId}/${projectId}`;
const browser = await chromium.launch({ headless: true });
let count = 0;
const pass = (name) => { count++; console.log(`PASS ${viewport}: ${name}`); };
const sessions = {
  dev: { email: input.dev.email, password: input.dev.password, bearer: '' },
  ngo: { email: input.ngo.email, password: input.ngo.password, bearer: '' },
};

async function tokenFor(who) {
  const session = sessions[who];
  const current = session.bearer;
  const claims = current ? JSON.parse(Buffer.from(current.split('.')[1], 'base64url').toString()) : null;
  if (!claims || claims.exp * 1000 < Date.now() + 10_000) {
    const login = await fetch(`${input.apiUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: input.anonKey, 'content-type': 'application/json' },
      body: JSON.stringify({ email: session.email, password: session.password }),
    });
    session.bearer = (await login.json()).access_token;
    assert.ok(session.bearer, `${who} sign-in returned no session`);
  }
  return session.bearer;
}

async function post(who, name, body) {
  const bearer = await tokenFor(who);
  const response = await fetch(`${input.apiUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: { apikey: input.anonKey, Authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : {} };
}

function micros(snapshot) {
  return Number(snapshot.funds.availableMicros);
}

async function until(name, check) {
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    const value = await check();
    if (value) return value;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`${name} did not finish.`);
}

async function signIn(page, who) {
  const session = sessions[who];
  await page.goto(route);
  await page.getByLabel('Email', { exact: true }).fill(session.email);
  await page.getByLabel('Password', { exact: true }).fill(session.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

try {
  const size = viewport === 'phone' ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
  const context = await browser.newContext({ viewport: size });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  await signIn(page, 'dev');
  if (viewport === 'phone') {
    await page.getByTestId('phone-tab-bar').waitFor();
    assert.equal(await page.getByTestId('phone-tab-chat').getAttribute('aria-current'), 'page');
    await page.getByTestId('prd-chat').waitFor();
    pass('signed in on the chat tab');
    await page.getByTestId('phone-tab-prd').click();
    assert.equal(await page.getByTestId('phone-tab-prd').getAttribute('aria-current'), 'page');
    await page.getByTestId('prd-topic-list').waitFor();
    pass('PRD tab shows the topics');
    await page.getByTestId('phone-tab-questions').click();
    assert.equal(await page.getByTestId('phone-tab-questions').getAttribute('aria-current'), 'page');
    await page.getByTestId('prd-ngo-questions').waitFor();
    pass('questions tab shows the NGO questions');
    await page.getByTestId('phone-tab-chat').click();
    await page.getByTestId('prd-chat').waitFor();
    assert.equal(await page.locator('[data-testid="prd-turn"]').count(), 0);
    pass('main chat shows its history and no reply was sent');
    await page.screenshot({ path: join(input.outDir, 'phone.png'), fullPage: true });
    writeFileSync(join(input.outDir, 'phone-checks.json'), JSON.stringify({ modelCalls: 0 }));
  } else {
    await page.getByTestId('prd-topic-list').waitFor();
    await page.getByTestId('prd-main-chat-item').waitFor();
    await page.getByTestId('prd-chat').waitFor();
    await page.getByTestId('prd-close-panel').waitFor();
    assert.equal(await page.getByTestId('phone-tab-bar').count(), 0);
    pass('workspace shows the topics, the main chat, and the PRD panel');
    const snapshot = await post('dev', 'prd-snapshot', { projectId });
    assert.equal(snapshot.status, 200);
    const topics = snapshot.body.topics;
    assert.ok(Array.isArray(topics) && topics.length > 0);
    const items = page.getByTestId('prd-topic-item');
    assert.equal(await items.count(), topics.length);
    for (let index = 0; index < topics.length; index += 1) {
      const title = (await items.nth(index).locator('span.font-semibold').first().innerText()).trim();
      assert.equal(title, topics[index].title);
      assert.equal(typeof topics[index].id, 'string');
      assert.ok(topics[index].id.length > 0);
    }
    pass('prd-snapshot answers 200 with the same topics');
    const availableBefore = micros(snapshot.body);
    await page.getByTestId('prd-composer-input').fill('Please draft the first section from the Discovery brief.');
    await page.getByTestId('prd-send-button').click();
    const ai = page.locator('[data-testid="prd-turn"][data-actor="ai"]').last();
    await ai.waitFor({ timeout: 180_000 });
    assert.match(await ai.innerText(), /ai4good AI/);
    pass('an AI reply is attributed to the AI');
    const settled = await until('reply settled', async () => {
      const next = await post('dev', 'prd-snapshot', { projectId });
      if (next.status !== 200 || next.body.funds?.pendingMicros !== 0) return null;
      if (!(micros(next.body) < availableBefore)) return null;
      return next.body;
    });
    const availableAfter = micros(settled);
    pass('the reply left no pending funds');
    const draft = 'A draft kept for the reload.';
    await page.getByTestId('prd-composer-input').fill(draft);
    await page.waitForTimeout(1500);
    await page.reload();
    await page.getByTestId('prd-chat').waitFor();
    assert.equal(await page.getByTestId('prd-composer-input').inputValue(), draft);
    pass('the draft survived reload');
    const ngoContext = await browser.newContext({ viewport: size });
    const ngoPage = await ngoContext.newPage();
    ngoPage.setDefaultTimeout(45_000);
    await signIn(ngoPage, 'ngo');
    await ngoPage.getByTestId('prd-readonly-banner').waitFor();
    assert.match(await ngoPage.getByTestId('prd-readonly-banner').innerText(), /You can read along/);
    assert.equal(await ngoPage.getByTestId('prd-composer').count(), 0);
    pass('the NGO administrator reads along with no main-chat composer');
    await page.getByTestId('prd-close-button').click();
    await page.getByTestId('prd-close-warning').waitFor({ timeout: 240_000 });
    await page.getByTestId('prd-close-anyway').waitFor();
    await page.getByTestId('prd-close-keep').waitFor();
    pass('Close PRD shows Close anyway and Keep working');
    await page.getByTestId('prd-close-anyway').click();
    await page.getByTestId('prd-closed-banner').waitFor({ timeout: 180_000 });
    await page.reload();
    await page.getByTestId('prd-closed-banner').waitFor();
    await ngoPage.reload();
    await ngoPage.getByTestId('prd-closed-banner').waitFor();
    pass('the PRD stays closed for both people');
    await page.screenshot({ path: join(input.outDir, 'desktop-closed.png'), fullPage: true });
    const hidden = await post('dev', 'prd-snapshot', { projectId: crypto.randomUUID() });
    assert.equal(hidden.status, 409, JSON.stringify(hidden.body));
    assert.equal(hidden.body.kind, 'forbidden');
    pass('refusal forbidden');
    const action = await post('dev', 'prd-action', {
      projectId, kind: 'close', token: 'made-up', requestId: crypto.randomUUID(),
    });
    assert.equal(action.status, 409, JSON.stringify(action.body));
    assert.equal(action.body.kind, 'invalid-request');
    pass('refusal invalid-request');
    const message = await post('dev', 'prd-message', {
      projectId,
      scope: { kind: 'main' },
      requestId: crypto.randomUUID(),
      baseRevision: 0,
      intent: { kind: 'text', text: 'Too late' },
    });
    assert.equal(message.status, 409, JSON.stringify(message.body));
    assert.equal(message.body.kind, 'closed');
    pass('refusal closed');
    const other = await post('dev', 'prd-draft', { projectId: crypto.randomUUID(), key: 'main', text: 'no' });
    assert.equal(other.status, 409, JSON.stringify(other.body));
    assert.equal(other.body.kind, 'forbidden');
    pass('refusal forbidden for a draft on another project');
    const signature = `sha256=${'0'.repeat(64)}`;
    const hookResponse = await fetch(`${input.apiUrl}/functions/v1/prd-github-hook`, {
      method: 'POST',
      headers: {
        apikey: input.anonKey,
        Authorization: `Bearer ${await tokenFor('dev')}`,
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-hub-signature-256': signature,
      },
      body: JSON.stringify({ zen: 'verify' }),
    });
    const hookText = await hookResponse.text();
    const hookBody = hookText ? JSON.parse(hookText) : {};
    assert.equal(hookResponse.status, 401, hookText);
    assert.equal(hookBody.kind, undefined);
    assert.equal(hookBody.reason, 'the webhook signature does not match');
    pass('refusal webhook signature');
    await page.screenshot({ path: join(input.outDir, 'desktop.png'), fullPage: true });
    writeFileSync(join(input.outDir, 'desktop-checks.json'), JSON.stringify({ availableBefore, availableAfter, draft }));
  }
  console.log(`${count} checks passed on ${viewport}.`);
} finally {
  await browser.close();
}
