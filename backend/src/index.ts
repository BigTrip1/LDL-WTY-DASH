import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectMongo } from './db.js';
import uploadRouter from './routes/upload.js';
import claimsRouter from './routes/claims.js';
import analyticsRouter from './routes/analytics.js';
import metaRouter from './routes/meta.js';
import exportRouter from './routes/export.js';
import adminRouter from './routes/admin.js';
import manualRouter from './routes/manual.js';
import groupsRouter from './routes/groups.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Server identity, used by /api/health so the launcher's _verify-*.ps1
// scripts can assert which mode is running.
const STARTED = new Date();
const PORT = Number(process.env.PORT) || 4000;
const MODE: 'production' | 'development' =
  process.env.NODE_ENV === 'production' ? 'production' : 'development';

// Resolve where the built frontend lives (if at all). Done up-front so
// /api/health can report frontendDistServed without re-checking the disk.
const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST_CANDIDATES = [
  resolve(__dirnameLocal, '..', '..', 'frontend', 'dist'),       // dev (src/)
  resolve(__dirnameLocal, '..', '..', '..', 'frontend', 'dist')  // prod (dist/)
];
const FRONTEND_DIST = FRONTEND_DIST_CANDIDATES.find(p => existsSync(p));

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  mode: MODE,
  port: PORT,
  frontendDistServed: !!FRONTEND_DIST,
  uptimeSec: Math.round((Date.now() - +STARTED) / 1000),
  ts: new Date()
}));

app.get('/api/report', async (_req, res) => {
  try {
    const candidates = [
      resolve(process.cwd(), '..', 'REPORT.md'),
      resolve(process.cwd(), 'REPORT.md')
    ];
    let content: string | null = null;
    for (const p of candidates) {
      try { content = await readFile(p, 'utf-8'); break; } catch {}
    }
    if (content === null) return res.status(404).json({ error: 'REPORT.md not found' });
    res.type('text/markdown; charset=utf-8').send(content);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/upload', uploadRouter);
app.use('/api/claims', claimsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/meta', metaRouter);
app.use('/api/export', exportRouter);
app.use('/api/admin', adminRouter);
app.use('/api/manual', manualRouter);
app.use('/api/groups', groupsRouter);

// ---- Production: serve the built frontend (frontend/dist) if it exists ----
// FRONTEND_DIST is resolved above (near /api/health) so it's available for both
// the health endpoint and the static-file middleware here.
if (FRONTEND_DIST) {
  app.use(express.static(FRONTEND_DIST, { index: false, maxAge: '1h', etag: true }));
  // SPA fallback — any non-/api route serves index.html so React Router can take over
  app.get(/^\/(?!api\/).*/, async (_req, res, next) => {
    try {
      const html = await readFile(resolve(FRONTEND_DIST, 'index.html'), 'utf-8');
      res.type('html').send(html);
    } catch (err) {
      next(err);
    }
  });
}

connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`[wty] API listening on http://localhost:${PORT}  (mode: ${MODE})`);
    if (FRONTEND_DIST) {
      console.log(`[wty] Serving frontend from ${FRONTEND_DIST}`);
      console.log(`[wty] Open http://localhost:${PORT}/ in your browser`);
    } else {
      console.log(`[wty] No built frontend found. Run 'npm run build' in /frontend or use dev mode.`);
    }
  });
}).catch((err) => {
  console.error('[wty] Failed to start:', err);
  process.exit(1);
});
