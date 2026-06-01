// Open the Manual route in headless Edge, capture console + JS errors.
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9241;
const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--window-size=1600,1200',
  '--user-data-dir=' + resolve(__dirnameLocal, 'profile-manual'),
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
ws.on('message', d => {
  const m = JSON.parse(d.toString());
  if (m.id != null && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) reject(new Error(m.error.message));
    else resolve(m.result);
  } else if (m.method === 'Runtime.consoleAPICalled') {
    const args = m.params.args.map(a => a.value ?? a.description ?? JSON.stringify(a.preview ?? a.type)).join(' ');
    console.log(`  [console.${m.params.type}]`, args);
  } else if (m.method === 'Runtime.exceptionThrown') {
    const ex = m.params.exceptionDetails;
    console.log(`  [exception] ${ex.text}`);
    if (ex.exception) console.log(`     ${ex.exception.description || ex.exception.value || JSON.stringify(ex.exception)}`);
    if (ex.stackTrace) {
      ex.stackTrace.callFrames.slice(0, 8).forEach(f => console.log(`     at ${f.functionName || '<anon>'} (${f.url}:${f.lineNumber}:${f.columnNumber})`));
    }
  } else if (m.method === 'Log.entryAdded') {
    console.log(`  [log.${m.params.entry.level}] ${m.params.entry.text}`);
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
await cmd('Log.enable');

console.log('Navigating to http://localhost:5173/manual ...');
await cmd('Page.navigate', { url: 'http://localhost:5173/manual' });
await wait(6000);

const r = await cmd('Runtime.evaluate', {
  expression: `({
    title: document.title,
    bodyText: document.body?.innerText?.slice(0, 400) || '<empty>',
    hasSidebar: !!document.querySelector('aside'),
    sidebarItems: document.querySelectorAll('aside button').length,
    hasError: !!document.querySelector('[data-error], .error-boundary'),
    hasArticle: !!document.querySelector('.manual-article'),
    articleText: document.querySelector('.manual-article')?.innerText?.slice(0, 200) || null
  })`,
  returnByValue: true
});
console.log('\nDOM state:');
console.log(JSON.stringify(r.result.value, null, 2));

ws.close(); edge.kill(); process.exit(0);
