import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9223;
const edge = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--window-size=1600,1100',
  '--user-data-dir=' + 'C:/Users/Vince/OneDrive/Desktop/wty/.audit/profile2',
  `--remote-debugging-port=${port}`,
  'http://localhost:5173/'
], { stdio: 'ignore' });

await wait(3000);
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
await wait(10000);

// Wait for tabs to render
let tabsReady = false;
for (let i = 0; i < 20 && !tabsReady; i++) {
  const c = await cmd('Runtime.evaluate', {
    expression: `document.querySelectorAll('[role="tab"]').length`,
    returnByValue: true
  });
  if (c.result.value > 0) { tabsReady = true; break; }
  await wait(500);
}
console.log('tabs ready:', tabsReady);

// Click Reliability tab via Radix pointer dispatch
const click = await cmd('Runtime.evaluate', {
  expression: `
    (() => {
      const triggers = Array.from(document.querySelectorAll('[role="tab"]'));
      const tabsFound = triggers.map(t => t.textContent.trim());
      const found = triggers.find(t => t.textContent.trim().startsWith('Reliability'));
      if (!found) return { ok: false, tabsFound };
      ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(ev => {
        found.dispatchEvent(new (ev.startsWith('pointer') ? PointerEvent : MouseEvent)(ev, { bubbles: true, cancelable: true }));
      });
      return { ok: true, state: found.getAttribute('data-state') };
    })()
  `, returnByValue: true
});
console.log('CLICK:', JSON.stringify(click.result.value));
await wait(5000);

// First, dump some debug info
const dbg = await cmd('Runtime.evaluate', {
  expression: `
    (() => ({
      h3count: document.querySelectorAll('h3').length,
      tabPanels: Array.from(document.querySelectorAll('[role="tabpanel"]')).map(p => ({
        state: p.getAttribute('data-state'),
        hidden: p.hidden,
        childCount: p.children.length
      })),
      activeTab: document.querySelector('[role="tab"][data-state="active"]')?.textContent?.trim()
    }))()
  `, returnByValue: true
});
console.log('DBG:', JSON.stringify(dbg.result.value, null, 2));

const r = await cmd('Runtime.evaluate', {
  expression: `
    (() => {
      const result = [];
      document.querySelectorAll('h3').forEach(h => {
        const card = h.closest('div.rounded-xl, div.shadow-sm, div[class*="border"]');
        if (!card) return;
        const t = h.textContent.trim();
        if (t.length < 3) return;
        const all = card.querySelectorAll('div');
        const cardContent = card.children[1]; // header is [0], content is [1]
        const rcContainer = card.querySelector('.recharts-responsive-container');
        const rcWrapper = card.querySelector('.recharts-wrapper');
        const rcSvg = card.querySelector('svg.recharts-surface');
        const bars = Array.from(card.querySelectorAll('path.recharts-rectangle'));
        const sampleBars = bars.slice(0, 3).map(b => ({
          fill: b.getAttribute('fill'),
          d: b.getAttribute('d')?.substring(0, 80),
          bbox: { w: b.getBBox?.()?.width, h: b.getBBox?.()?.height }
        }));
        result.push({
          title: t.substring(0, 50),
          cardW: card.clientWidth,
          cardH: card.clientHeight,
          contentW: cardContent?.clientWidth,
          contentH: cardContent?.clientHeight,
          contentCls: cardContent?.className?.substring(0, 80),
          rcContainerW: rcContainer?.clientWidth,
          rcContainerH: rcContainer?.clientHeight,
          rcWrapperW: rcWrapper?.clientWidth,
          rcWrapperH: rcWrapper?.clientHeight,
          rcSvgW: rcSvg?.clientWidth,
          rcSvgH: rcSvg?.clientHeight,
          numBars: bars.length,
          sampleBars
        });
      });
      return result;
    })()
  `, returnByValue: true
});

console.log(JSON.stringify(r.result.value, null, 2));
ws.close(); edge.kill(); process.exit(0);
