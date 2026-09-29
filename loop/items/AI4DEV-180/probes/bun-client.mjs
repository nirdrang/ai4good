import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const t = Date.now();
const host = spawn('node', [new URL('./host.mjs', import.meta.url).pathname.replace(/^\//, '')], { stdio: ['pipe', 'pipe', 'inherit'] });
const waiting = new Map();
let seq = 0;
createInterface({ input: host.stdout }).on('line', (line) => {
  const msg = JSON.parse(line);
  const w = waiting.get(msg.id);
  waiting.delete(msg.id);
  msg.ok ? w.resolve(msg.value) : w.reject(new Error(msg.error));
});
const call = (op, args = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  waiting.set(id, { resolve, reject });
  host.stdin.write(JSON.stringify({ id, op, args }) + '\n');
});

const html = '<main aria-label="Discovery"><section aria-label="Discovery usage" style="height:40px">bar</section><textarea aria-label="Your message" rows="1" style="field-sizing:content;width:300px"></textarea></main>';
const page = await call('open', { html, viewport: { width: 390, height: 844 } });
console.log('opened', Date.now() - t, 'ms');
const usage = await call('box', { page, chain: [{ role: 'main', name: 'Discovery' }, { role: 'region', name: 'Discovery usage' }] });
const box0 = await call('box', { page, chain: [{ role: 'textbox', name: 'Your message' }] });
await call('fill', { page, chain: [{ role: 'textbox', name: 'Your message' }], text: 'hello world '.repeat(30) });
const box1 = await call('box', { page, chain: [{ role: 'textbox', name: 'Your message' }] });
console.log('usage', JSON.stringify(usage), 'box before', box0.height, 'after', box1.height);
try { await call('box', { page, chain: [{ role: 'button', name: 'Nope' }] }); } catch (e) { console.log('missing ->', e.message.split('\n')[0]); }
await call('close');
host.stdin.end();
console.log('total', Date.now() - t, 'ms');
