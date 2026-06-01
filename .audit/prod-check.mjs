// Confirm the production build (served on :4000) renders /manual correctly,
// and spot-check the dashboard + report routes too.
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9242;
const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--window-size=1600,1200',
  '--user-data-dir=' + resolve(__dirnameLocal, 'profile-prod'),
  `--remote-debugging-port=${port}`,
  'about:blank'
], { stdio: 'ignore' });

await wait(2500);
const targets = await (await fetch(`http://localhost:${port}/json`)).json();
const pageWsUrl = targets.find(t => t.type === 'page').webSocketDebuggerUrl;
const { WebSocket } = await import('ws');
const ws = new WebSocket(pageWsUrl);
await new Promise(r => ws.on('open', r));

let id = 0;
const pending = new Map();
const errors = [];
ws.on('message', d => {
  const m = JSON.parse(d.toString());
  if (m.id != null && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) reject(new Error(m.error.message));
    else resolve(m.result);
  } else if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description || ''));
  }
});
const cmd = (method, params) => {
  const i = ++id;
  return new Promise((res, rej) => {
    pending.set(i, { resolve: res, reject: rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
};

await cmd('Page.enable');
await cmd('Runtime.enable');

async function inspect(url) {
  errors.length = 0;
  await cmd('Page.navigate', { url });
  await wait(5000);
  const r = await cmd('Runtime.evaluate', {
    expression: `({
      title: document.title,
      hasContent: document.body.innerText.length > 100,
      sidebarBtns: document.querySelectorAll('aside button').length,
      preBlocks: document.querySelectorAll('pre').length,
      h1Text: document.querySelector('.wty-md h1')?.innerText || document.querySelector('h1')?.innerText || '',
      reportSections: document.querySelectorAll('[id^="section-"]').length,
      navItems: document.querySelectorAll('nav a').length
    })`,
    returnByValue: true
  });
  return { url, ...r.result.value, jsErrors: errors.slice() };
}

const routes = [
  'http://localhost:4000/manual',
  'http://localhost:4000/manual?s=01-getting-started',
  'http://localhost:4000/manual?s=04-reading-a-chart-card',
  'http://localhost:4000/manual?s=06-pdf-report',
  'http://localhost:4000/?tab=overview',
  'http://localhost:4000/report'
];

for (const url of routes) {
  const r = await inspect(url);
  console.log(`\n${url}`);
  Object.entries(r).filter(([k]) => k !== 'url').forEach(([k, v]) => {
    if (Array.isArray(v) && v.length === 0) return;
    console.log(`  ${k.padEnd(15)} ${typeof v === 'string' ? JSON.stringify(v.slice(0, 60)) : JSON.stringify(v)}`);
  });
}

ws.close(); edge.kill(); process.exit(0);
