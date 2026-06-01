// Verify custom (non-Recharts) charts render: Sankey (Drivers), WorldBubbleMap
// (Supply), CalendarHeatmap (Operations). Uses ?tab= URL state added in A1.
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9231;
const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--window-size=1600,1200',
  '--user-data-dir=' + resolve(__dirnameLocal, 'profile-custom'),
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

async function visit(url, settleMs = 4500) {
  await cmd('Page.navigate', { url });
  await wait(settleMs);
}

const checks = [
  { name: 'Supply / WorldBubbleMap', url: 'http://localhost:5173/?tab=supply' },
  { name: 'Operations / CalendarHeatmap', url: 'http://localhost:5173/?tab=ops' },
  { name: 'Drivers / Sankey', url: 'http://localhost:5173/?tab=drivers' },
  { name: 'Manual route', url: 'http://localhost:5173/manual' }
];

for (const c of checks) {
  await visit(c.url, 5500);
  const r = await cmd('Runtime.evaluate', {
    expression: `
      (() => {
        const panel = document.querySelector('[role="tabpanel"][data-state="active"]') || document.body;
        return {
          activeTab: document.querySelector('[role="tab"][data-state="active"]')?.textContent.trim(),
          panelSvgs: panel.querySelectorAll('svg').length,
          bubbleMapCircles: panel.querySelectorAll('svg circle[fill-opacity]').length,
          calendarCells: panel.querySelectorAll('svg rect[rx="1.5"]').length,
          continentPaths: panel.querySelectorAll('svg path[fill="#181818"]').length,
          sankeyLinks: panel.querySelectorAll('.recharts-sankey path, path[stroke-opacity]').length,
          manualSidebarItems: document.querySelectorAll('aside button').length,
          manualBody: document.querySelector('.manual-article .wty-md')?.textContent.length || 0
        };
      })()
    `, returnByValue: true
  });
  console.log(`\n=== ${c.name} ===`);
  console.log('  ', JSON.stringify(r.result.value, null, 2).split('\n').join('\n   '));
}

ws.close(); edge.kill(); process.exit(0);
