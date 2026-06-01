import { Router } from 'express';
import { Claim } from '../models/Claim.js';
import { buildMatch } from '../services/filters.js';

const router = Router();

router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(200, Math.max(5, Number(req.query.pageSize) || 25));
  const sort = String(req.query.sort || 'vettedDate');
  const order = String(req.query.order || 'desc') === 'asc' ? 1 : -1;
  const match = buildMatch(req.query);

  const q = String(req.query.q || '').trim();
  if (q) {
    match.$text = { $search: q };
  }
  if (req.query.serial) {
    const s = Number(req.query.serial);
    if (!isNaN(s)) match.serial = s;
  }
  if (req.query.excludeClaim) {
    const ec = Number(req.query.excludeClaim);
    if (!isNaN(ec)) match._id = { ...(match._id || {}), $ne: ec };
  }

  const [rows, total] = await Promise.all([
    Claim.find(match)
      .sort({ [sort]: order })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Claim.countDocuments(match)
  ]);

  res.json({ page, pageSize, total, rows });
});

router.get('/:claimNumber', async (req, res) => {
  const id = Number(req.params.claimNumber);
  if (isNaN(id)) return res.status(400).json({ error: 'invalid claimNumber' });
  const doc = await Claim.findById(id).lean();
  if (!doc) return res.status(404).json({ error: 'not found' });
  res.json(doc);
});

export default router;
