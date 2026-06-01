// Screenshot the dashboard with the Model filter dropdown open showing group chips.
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9270;
const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu',
  '--window-size=1400,1200',
  '--hide-scrollbars',
  '--user-data-dir=' + resolve(__dirnameLocal, 'profile-groups'),
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

// SHOT 1: Admin page with FilterGroupsManager visible
await cmd('Page.navigate', { url: 'http://localhost:4000/admin' });
await wait(5000);
const metrics1 = await cmd('Page.getLayoutMetrics');
const shot1 = await cmd('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip: { x: 0, y: 0, width: Math.ceil(metrics1.cssContentSize.width), height: Math.min(1900, Math.ceil(metrics1.cssContentSize.height)), scale: 1 }
});
writeFileSync(resolve(__dirnameLocal, 'shots', 'admin-groups.png'), Buffer.from(shot1.data, 'base64'));
console.log('saved admin-groups.png');

// SHOT 2: Supply tab to verify the new highlight cards + concentration gauge
await cmd('Page.navigate', { url: 'http://localhost:4000/?tab=supply' });
await wait(6000);
const metrics2 = await cmd('Page.getLayoutMetrics');
const shot2 = await cmd('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip: { x: 0, y: 600, width: Math.ceil(metrics2.cssContentSize.width), height: 600, scale: 1 }
});
writeFileSync(resolve(__dirnameLocal, 'shots', 'supply-highlights.png'), Buffer.from(shot2.data, 'base64'));
console.log('saved supply-highlights.png');

// SHOT 3: Dashboard with Model dropdown open showing group pills
await cmd('Page.navigate', { url: 'http://localhost:4000/' });
await wait(5000);
// Click the Model multi-select trigger button by text
await cmd('Runtime.evaluate', {
  expression: `
    const btns = Array.from(document.querySelectorAll('button'));
    const modelBtn = btns.find(b => b.textContent && b.textContent.trim().startsWith('Model'));
    modelBtn?.click();
  `,
  returnByValue: true
});
await wait(2000);
const metrics3 = await cmd('Page.getLayoutMetrics');
const shot3 = await cmd('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
  clip: { x: 0, y: 100, width: Math.ceil(metrics3.cssLayoutViewport.clientWidth), height: 500, scale: 1 }
});
writeFileSync(resolve(__dirnameLocal, 'shots', 'model-with-groups.png'), Buffer.from(shot3.data, 'base64'));
console.log('saved model-with-groups.png');

ws.close(); edge.kill(); process.exit(0);
