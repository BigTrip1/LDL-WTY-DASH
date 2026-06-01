// Take a focused screenshot of the new Supplier highlights + Concentration gauge area.
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9271;
const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--window-size=1400,2500',
  '--user-data-dir=' + resolve(__dirnameLocal, 'profile-supply2'),
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
    if (m.error) reject(new Error(m.error.message)); else resolve(m.result);
  }
});
const cmd = (method, params) => {
  const i = ++id;
  return new Promise((res, rej) => { pending.set(i, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id: i, method, params })); });
};

await cmd('Page.enable');
await cmd('Page.navigate', { url: 'http://localhost:4000/?tab=supply' });
await wait(7000);
const metrics = await cmd('Page.getLayoutMetrics');
// Crop to the supplier-highlights + concentration row (right after the map + regional rollup)
const shot = await cmd('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip: { x: 0, y: 850, width: Math.ceil(metrics.cssContentSize.width), height: 380, scale: 1 }
});
writeFileSync(resolve(__dirnameLocal, 'shots', 'supply-highlights2.png'), Buffer.from(shot.data, 'base64'));
console.log('saved supply-highlights2.png');

ws.close(); edge.kill(); process.exit(0);
