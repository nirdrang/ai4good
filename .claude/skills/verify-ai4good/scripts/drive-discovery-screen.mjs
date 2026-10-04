import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { stack, organizationId, projectId, viewport } = input;
const scope = { organizationId, projectId };
const browser = await chromium.launch({ headless: true });
let count = 0;
const pass = (name) => { count++; console.log(`PASS ${viewport}: ${name}`); };
try {
  const context = await browser.newContext({ viewport: viewport === 'phone' ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  let bearer = input.bearer;
  async function post(name, body) {
    const claims = JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString());
    if (claims.exp * 1000 < Date.now() + 10_000) {
      const login = await fetch(`${stack.apiUrl}/auth/v1/token?grant_type=password`, { method: 'POST',
        headers: { apikey: stack.anonKey, 'content-type': 'application/json' }, body: JSON.stringify({ email: input.email, password: input.password }) });
      bearer = (await login.json()).access_token;
      assert.ok(bearer);
    }
    const response = await fetch(`${stack.apiUrl}/functions/v1/${name}`, { method: 'POST',
      headers: { apikey: stack.anonKey, Authorization: `Bearer ${bearer}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  async function read() {
    const answer = await post('discovery-conversation', { projectId });
    assert.equal(answer.status, 200);
    assert.ok(answer.body.state);
    return answer.body.state;
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
  await page.goto(`${input.baseUrl}/discovery/${organizationId}/${projectId}`);
  await page.getByLabel('Email', { exact: true }).fill(input.email);
  await page.getByLabel('Password', { exact: true }).fill(input.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('article', { name: 'AI reply', exact: true }).first().waitFor({ timeout: 180_000 });
  const first = await until('opening brief', async () => { const state = await read(); return state.brief ? state : null; });
  assert.equal(first.usage.dailyLeft, first.usage.dailyGrant);
  pass('signed in and the first reply is free');
  const question = first.brief.questions[0];
  assert.ok(question);
  const answer = question.options.find((option) => option.id === question.suggestedId);
  const group = page.getByRole('log', { name: 'NGO and AI conversation', exact: true }).getByRole('group', { name: question.text, exact: true });
  await group.getByRole('button', { name: `${answer.label} Suggested`, exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  const saved = await until('answered question saving', async () => {
    const state = await read();
    return state.brief.revision > first.brief.revision && state.brief.topics.some((topic) => topic.id === question.topicId && topic.state.kind === 'agreed') ? state : null;
  });
  assert.equal(saved.usage.dailyLeft, first.usage.dailyLeft - 1);
  pass('answer saved, brief revision rose and one credit was used');
  await page.getByRole('button', { name: 'Add a file', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'sample-rota.txt', mimeType: 'text/plain',
    buffer: Buffer.from('The kitchen has 45 volunteers. Shifts last four hours. Coordinators schedule Sunday shifts by phone. Last month 38 volunteers booked a shift.') });
  const withFile = await until('file read', async () => {
    const state = await read();
    const file = state.files.find((file) => file.name === 'sample-rota.txt');
    if (file?.status?.kind === 'failed') throw new Error(file.status.reason);
    return file?.status?.kind === 'ready' ? state : null;
  });
  assert.deepEqual(withFile.usage, saved.usage);
  assert.ok(withFile.files.find((file) => file.name === 'sample-rota.txt').tookFromIt);
  pass('file reached read with facts and unchanged usage');
  await page.reload();
  await page.getByRole('button', { name: 'Finish Discovery', exact: true }).click();
  const review = page.getByRole('main', { name: 'Review before you finish', exact: true });
  await review.waitFor();
  pass('review page opened');
  const checkboxes = review.getByRole('checkbox');
  for (let index = 0; index < await checkboxes.count(); index++) {
    if (await checkboxes.nth(index).getAttribute('aria-checked') !== 'true') await checkboxes.nth(index).click();
  }
  await review.getByRole('button', { name: 'Finish Discovery', exact: true }).click();
  const finished = await until('finish confirmation', async () => { const state = await read(); return state.confirmation ? state : null; });
  assert.equal(finished.confirmation.revision, finished.brief.revision);
  assert.deepEqual(finished.usage, withFile.usage);
  await page.reload();
  await review.getByRole('heading', { name: /^Discovery finished/ }).waitFor();
  pass('finish recorded and survived reload without charge');
  const refusals = [
    ['discovery-message', { ...scope, mode: 'answer', userMessageId: crypto.randomUUID(), expectedCharge: 'free', answers: [], message: 'Continue' }, 'finished'],
    ['discovery-brief', { ...scope, action: 'edit', sectionId: 'need', text: 'Changed', baseRevision: Math.max(1, finished.brief.revision - 1) }, 'stale-revision'],
    ['discovery-brief', { ...scope, action: 'finish', revision: finished.brief.revision, acks: {} }, 'invalid-request'],
    ['discovery-message', { ...scope, mode: 'answer', userMessageId: crypto.randomUUID(), expectedCharge: 'free', answers: [], message: 'Continue', projectId: crypto.randomUUID() }, 'no-such-project'],
  ];
  for (const [name, body, kind] of refusals) {
    const refused = await post(name, body);
    assert.ok(refused.status >= 400);
    assert.equal(refused.body.kind, kind);
    pass(`refusal ${kind}`);
  }
  await page.screenshot({ path: join(input.outDir, `${viewport}.png`), fullPage: true });
  console.log(`${count} checks passed on ${viewport}.`);
} finally { await browser.close(); }
