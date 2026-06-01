// Comprehensive per-tab DOM verification.
// For each dashboard tab, navigate, wait for content to settle, then count:
//   - chart cards visible
//   - rendered bars / lines / areas / pies
//   - any chart with 0 elements inside (probable bug)
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9224;
mkdirSync('.audit/profile3', { recursive: true });
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--window-size=1600,1200',
  '--user-data-dir=' + resolve(process.cwd(), '.audit/profile3'),
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
await cmd('Page.navigate', { url: 'http://localhost:5173/' });

// Wait for tabs
for (let i = 0; i < 30; i++) {
  const c = await cmd('Runtime.evaluate', {
    expression: `document.querySelectorAll('[role="tab"]').length`,
    returnByValue: true
  });
  if (c.result.value > 0) break;
  await wait(500);
}
await wait(1500);

const TABS = ['Overview', 'Build-date', 'Vetting', 'Outcome', 'Description', 'Supply', 'Reliability', 'Operations', 'People', 'Data', 'Full'];

const report = [];

for (const label of TABS) {
  await cmd('Runtime.evaluate', {
    expression: `
      (() => {
        const t = Array.from(document.querySelectorAll('[role="tab"]')).find(x => x.textContent.trim().startsWith(${JSON.stringify(label)}));
        if (!t) return false;
        ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(ev => {
          t.dispatchEvent(new (ev.startsWith('pointer') ? PointerEvent : MouseEvent)(ev, { bubbles: true, cancelable: true }));
        });
        return true;
      })()
    `, returnByValue: true
  });
  await wait(4500);

  const r = await cmd('Runtime.evaluate', {
    expression: `
      (() => {
        const result = [];
        const panel = document.querySelector('[role="tabpanel"][data-state="active"]');
        if (!panel) return { error: 'no active panel' };
        panel.querySelectorAll('h3').forEach(h => {
          const card = h.closest('div.rounded-xl, div.shadow-sm');
          if (!card) return;
          const t = h.textContent.trim();
          if (t.length < 3) return;
          const cardContent = card.children[1];
          const rcContainer = card.querySelector('.recharts-responsive-container');
          if (!rcContainer) {
            // not a chart card (table, kpi, etc.)
            return;
          }
          const bars = card.querySelectorAll('path.recharts-rectangle');
          const lines = card.querySelectorAll('path.recharts-line-curve');
          const areas = card.querySelectorAll('path.recharts-area-area');
          const pies = card.querySelectorAll('path.recharts-pie-sector');
          result.push({
            title: t.substring(0, 50),
            cardW: card.clientWidth,
            cardH: card.clientHeight,
            contentW: cardContent?.clientWidth,
            contentH: cardContent?.clientHeight,
            rcW: rcContainer?.clientWidth,
            rcH: rcContainer?.clientHeight,
            bars: bars.length,
            lines: lines.length,
            areas: areas.length,
            pies: pies.length,
            empty: !bars.length && !lines.length && !areas.length && !pies.length
          });
        });
        return result;
      })()
    `, returnByValue: true
  });
  report.push({ tab: label, charts: r.result.value });
}

writeFileSync('.audit/check-all.json', JSON.stringify(report, null, 2));
for (const tab of report) {
  console.log(`\n--- ${tab.tab} ---`);
  if (!Array.isArray(tab.charts)) { console.log('  ERROR', tab.charts); continue; }
  if (tab.charts.length === 0) { console.log('  (no chart cards)'); continue; }
  for (const c of tab.charts) {
    const emoji = c.empty ? '!!' : 'ok';
    const counts = [c.bars && `bars=${c.bars}`, c.lines && `lines=${c.lines}`, c.areas && `areas=${c.areas}`, c.pies && `pies=${c.pies}`].filter(Boolean).join(' ');
    console.log(`  [${emoji}] ${c.title.padEnd(48)} ${(c.rcW + 'x' + c.rcH).padEnd(10)} ${counts || '(empty)'}`);
  }
}

ws.close(); edge.kill(); process.exit(0);
