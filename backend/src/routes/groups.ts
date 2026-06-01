import { Router } from 'express';
import { z } from 'zod';
import { FilterGroup } from '../models/Claim.js';

const router = Router();

const DIMENSIONS = ['model', 'country', 'supplier', 'area', 'tPeriod', 'outcome', 'dealer', 'vetter', 'theme', 'customer', 'tags'] as const;
type Dimension = typeof DIMENSIONS[number];

const groupBody = z.object({
  dimension: z.enum(DIMENSIONS),
  name: z.string().trim().min(1).max(40),
  values: z.array(z.string().trim().min(1)).min(1).max(2000)
});

const groupUpdate = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  values: z.array(z.string().trim().min(1)).min(1).max(2000).optional()
});

/** GET /api/groups[?dimension=model]  - list all groups, optionally filtered */
router.get('/', async (req, res) => {
  const q: any = {};
  if (req.query.dimension && DIMENSIONS.includes(req.query.dimension as Dimension)) {
    q.dimension = req.query.dimension;
  }
  const items = await FilterGroup.find(q).sort({ dimension: 1, name: 1 }).lean();
  res.json({ items });
});

/** POST /api/groups  - create a new group */
router.post('/', async (req, res) => {
  const parsed = groupBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid payload', detail: parsed.error.issues });
  }
  // Dedupe + sort values
  const values = Array.from(new Set(parsed.data.values)).sort();
  try {
    const doc = await FilterGroup.create({
      dimension: parsed.data.dimension,
      name: parsed.data.name,
      values
    });
    res.status(201).json(doc.toObject());
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: `A group named "${parsed.data.name}" already exists in dimension "${parsed.data.dimension}".` });
    }
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/groups/:id  - rename or update the value-list of a group */
router.put('/:id', async (req, res) => {
  const parsed = groupUpdate.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid payload', detail: parsed.error.issues });
  }
  const update: any = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.values !== undefined) update.values = Array.from(new Set(parsed.data.values)).sort();
  try {
    const doc = await FilterGroup.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(doc);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: `A group with that name already exists in this dimension.` });
    }
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/groups/:id  - remove a group */
router.delete('/:id', async (req, res) => {
  const doc = await FilterGroup.findByIdAndDelete(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true, deleted: doc });
});

export default router;
