// Capture a full-page screenshot of the Supply & Geography tab.
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9260;
const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu',
  '--window-size=1400,2400',
  '--hide-scrollbars',
  '--user-data-dir=' + resolve(__dirnameLocal, 'profile-supply'),
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
await cmd('Page.navigate', { url: 'http://localhost:4000/?tab=supply' });
await wait(8000); // give Recharts + the SVG world map time to render

// Get the full content height for captureBeyondViewport
const metrics = await cmd('Page.getLayoutMetrics');
const contentHeight = Math.ceil(metrics.cssContentSize.height);
const contentWidth  = Math.ceil(metrics.cssContentSize.width);
console.log(`content size: ${contentWidth} x ${contentHeight}`);

const shot = await cmd('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip: { x: 0, y: 0, width: contentWidth, height: Math.min(contentHeight, 2400), scale: 1 }
});
const out = resolve(__dirnameLocal, 'shots', 'supply-redesigned.png');
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log(`saved: ${out}`);

ws.close(); edge.kill(); process.exit(0);
