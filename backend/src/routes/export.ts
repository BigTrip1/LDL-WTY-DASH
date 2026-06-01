import { Router } from 'express';
import { Claim } from '../models/Claim.js';
import { buildMatch } from '../services/filters.js';

const router = Router();

const CSV_COLUMNS: Array<[string, (r: any) => unknown]> = [
  ['claimNumber', r => r._id],
  ['area', r => r.area],
  ['asd', r => r.asd],
  ['machineModel', r => r.machineModel],
  ['model', r => r.model],
  ['buildDate', r => fmt(r.buildDate)],
  ['claimDate', r => fmt(r.claimDate)],
  ['failDate', r => fmt(r.failDate)],
  ['vettedDate', r => fmt(r.vettedDate)],
  ['serial', r => r.serial],
  ['country', r => r.country],
  ['customer', r => r.customer],
  ['dealer', r => r.dealer],
  ['detection', r => r.detection],
  ['division', r => r.division],
  ['failedPart', r => r.failedPart],
  ['failedPartCode', r => r.failedPartCode],
  ['theme', r => r.theme],
  ['hours', r => r.hours ?? ''],
  ['hoursBucket', r => r.hoursBucket],
  ['claimOutcome', r => r.claimOutcome ?? ''],
  ['tPeriod', r => r.tPeriod],
  ['vettedBy', r => r.vettedBy ?? ''],
  ['partSupplier', r => r.partSupplier],
  ['regime', r => r.regime],
  ['buildToFailDays', r => r.buildToFailDays ?? ''],
  ['descriptionTags', r => (r.descriptionTags || []).join('|')],
  ['description', r => r.description],
  ['vettersNotes', r => r.vettersNotes]
];

function fmt(d: Date | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
}

function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.get('/csv', async (req, res) => {
  const match = buildMatch(req.query);
  const limit = Math.min(100_000, Number(req.query.limit) || 100_000);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="wty-claims-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  res.write(CSV_COLUMNS.map(c => c[0]).join(',') + '\n');

  const cursor = Claim.find(match).limit(limit).lean().cursor();
  for await (const doc of cursor) {
    const line = CSV_COLUMNS.map(([, fn]) => esc(fn(doc))).join(',');
    res.write(line + '\n');
  }
  res.end();
});

export default router;
