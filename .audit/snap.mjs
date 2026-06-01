// Headless Edge automation to screenshot each dashboard tab.
// Uses Chrome DevTools Protocol directly via WebSocket to avoid puppeteer dep.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = process.env.URL || 'http://localhost:5173/';
const TABS = [
  ['overview', 'Overview'],
  ['build', 'Build-date'],
  ['regime', 'Vetting & regime'],
  ['drivers', 'Outcome drivers'],
  ['nlp', 'Description NLP'],
  ['supply', 'Supply & geography'],
  ['reliability', 'Reliability'],
  ['ops', 'Operations'],
  ['people', 'People & places'],
  ['dq', 'Data quality & drill-down'],
  ['report', 'Full report']
];
const OUT = resolve(process.cwd(), '.audit', 'shots');
mkdirSync(OUT, { recursive: true });

const port = 9222;
const edgeArgs = [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--window-size=1600,2400',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + resolve(process.cwd(), '.audit', 'profile'),
  `--remote-debugging-port=${port}`,
  'about:blank'
];

console.log('[snap] launching edge headless...');
const edge = spawn(EDGE, edgeArgs, { stdio: 'ignore' });

await wait(2500);
const targets = await (await fetch(`http://localhost:${port}/json`)).json();
let pageWsUrl = targets.find(t => t.type === 'page')?.webSocketDebuggerUrl;
if (!pageWsUrl) {
  console.error('No page target. Targets:', targets);
  process.exit(1);
}
console.log('[snap] connected to', pageWsUrl);

// minimal WS client
const { WebSocket } = await import('ws').catch(async () => {
  // fall back to global if Node has it (Node 22+ has built-in fetch but not ws); use stdlib
  return { WebSocket: globalThis.WebSocket };
});

const ws = new (WebSocket || globalThis.WebSocket)(pageWsUrl);
await new Promise(r => ws.addEventListener ? ws.addEventListener('open', r) : ws.on('open', r));

let id = 0;
const pending = new Map();
const recv = (e) => {
  const msg = JSON.parse(typeof e.data === 'string' ? e.data : e.toString());
  if (msg.id != null && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
};
if (ws.addEventListener) ws.addEventListener('message', recv);
else ws.on('message', d => recv({ data: d }));

const cmd = (method, params = {}) => {
  const i = ++id;
  return new Promise((res, rej) => {
    pending.set(i, { resolve: res, reject: rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
};

await cmd('Page.enable');
await cmd('Runtime.enable');

console.log('[snap] navigating', URL);
await cmd('Page.navigate', { url: URL });
// wait for app load
await wait(5000);

for (const [tabId, label] of TABS) {
  console.log(`[snap] tab ${tabId}`);
  // click the tab using pointerdown + mouseup + click (Radix uses pointer events)
  const result = await cmd('Runtime.evaluate', {
    expression: `
      (() => {
        const want = ${JSON.stringify(label.toLowerCase().split(' ')[0])};
        const triggers = Array.from(document.querySelectorAll('[role="tab"]'));
        const found = triggers.find(t => (t.textContent || '').trim().toLowerCase().startsWith(want));
        if (!found) return { ok: false, count: triggers.length, labels: triggers.map(x => x.textContent.trim()) };
        ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(ev => {
          found.dispatchEvent(new (ev.startsWith('pointer') ? PointerEvent : MouseEvent)(ev, { bubbles: true, cancelable: true }));
        });
        return { ok: true, label: found.textContent.trim(), state: found.getAttribute('data-state') };
      })()
    `, returnByValue: true
  });
  console.log('   click:', JSON.stringify(result.result?.value));
  await wait(4500); // let queries finish + recharts mount
  // Don't resize viewport - it makes Recharts ResponsiveContainer think the chart
  // dropped to a different width and the bars rendered in the snapshot become invisible.
  // Just capture beyond viewport with the current 1600x2400 device size.
  const { data } = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  const file = resolve(OUT, `${tabId}.png`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  console.log(`[snap]   wrote ${file}`);
}

console.log('[snap] done');
ws.close();
edge.kill();
process.exit(0);
