import { Router } from 'express';
import { Claim } from '../models/Claim.js';
import { enrichDescription } from '../services/nlp.js';
import { regimeFor, hoursBucketOf } from '../utils/dates.js';

const router = Router();

router.post('/recompute', async (_req, res) => {
  const started = Date.now();
  const cursor = Claim.find({}).cursor();
  let n = 0, updated = 0;
  const ops: any[] = [];
  for await (const doc of cursor) {
    n++;
    const nlp = enrichDescription(doc.get('description'));
    const regime = regimeFor(doc.get('vettedDate') as any);
    const hoursBucket = hoursBucketOf(doc.get('hours') as any);
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { ...nlp, regime, hoursBucket } }
      }
    });
    if (ops.length >= 1000) {
      const r = await Claim.bulkWrite(ops, { ordered: false });
      updated += r.modifiedCount ?? 0;
      ops.length = 0;
    }
  }
  if (ops.length) {
    const r = await Claim.bulkWrite(ops, { ordered: false });
    updated += r.modifiedCount ?? 0;
  }
  res.json({ scanned: n, updated, durationMs: Date.now() - started });
});

export default router;
