import { Router } from 'express';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const router = Router();
const __dirnameLocal = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve docs/manual/ regardless of where node is launched from.
 * Works for both backend/src/ (dev/tsx) and backend/dist/ (built).
 */
function manualDir(): string | null {
  const candidates = [
    resolve(__dirnameLocal, '..', '..', '..', 'docs', 'manual'),    // backend/src/routes -> repo/docs/manual
    resolve(__dirnameLocal, '..', '..', '..', '..', 'docs', 'manual'),
    resolve(process.cwd(), '..', 'docs', 'manual'),                 // cwd is backend/
    resolve(process.cwd(), 'docs', 'manual')                        // cwd is repo root
  ];
  return candidates.find(p => existsSync(p)) || null;
}

/** Title is the first '# ' heading in the file, falling back to the filename. */
function extractTitle(md: string, fallback: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}

router.get('/', async (_req, res) => {
  const dir = manualDir();
  if (!dir) return res.status(404).json({ error: 'Manual directory not found. Expected docs/manual/*.md' });
  const entries = (await readdir(dir))
    .filter(f => f.endsWith('.md'))
    .sort();
  const items: Array<{ id: string; title: string }> = [];
  for (const f of entries) {
    const md = await readFile(resolve(dir, f), 'utf-8');
    items.push({ id: f.replace(/\.md$/, ''), title: extractTitle(md, f) });
  }
  res.json({ items });
});

router.get('/:id', async (req, res) => {
  const dir = manualDir();
  if (!dir) return res.status(404).json({ error: 'Manual directory not found' });
  // Defence: reject path traversal attempts (anything not in [a-z0-9_-]).
  const safe = String(req.params.id).replace(/[^a-z0-9_-]/gi, '');
  if (!safe) return res.status(400).json({ error: 'Invalid manual id' });
  const file = resolve(dir, `${safe}.md`);
  if (!file.startsWith(dir + (process.platform === 'win32' ? '\\' : '/'))) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  if (!existsSync(file)) return res.status(404).json({ error: `Manual section ${safe} not found` });
  const md = await readFile(file, 'utf-8');
  res.type('text/markdown; charset=utf-8').send(md);
});

export default router;
