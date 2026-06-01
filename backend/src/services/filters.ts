import type { ParsedQs } from 'qs';

function arr(v: unknown): string[] | null {
  if (v === undefined || v === null) return null;
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  const s = String(v).trim();
  if (!s) return null;
  return s.includes(',') ? s.split(',').map(x => x.trim()).filter(Boolean) : [s];
}

function dateArgStart(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return null;
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Inclusive end-of-day UTC for `to` query params (YYYY-MM-DD). */
function dateArgEnd(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return null;
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export function buildMatch(q: ParsedQs | Record<string, unknown>): Record<string, any> {
  const match: Record<string, any> = {};
  const fields: Array<[string, string]> = [
    // The 'model' filter targets the `model` field (specific variant like
    // '535V125'), not `machineModel` which is the broader family code
    // ('535-125/535-140'). Aggregations elsewhere still GROUP BY machineModel
    // intentionally - that's a family rollup, not a filter dimension.
    ['model', 'model'],
    ['country', 'country'],
    ['supplier', 'partSupplier'],
    ['area', 'area'],
    ['tPeriod', 'tPeriod'],
    ['outcome', 'claimOutcome'],
    ['regime', 'regime'],
    ['dealer', 'dealer'],
    ['vetter', 'vettedBy'],
    ['theme', 'theme'],
    ['hoursBucket', 'hoursBucket'],
    ['customer', 'customer']
  ];
  for (const [key, field] of fields) {
    const v = arr((q as any)[key]);
    if (v && v.length) match[field] = v.length === 1 ? v[0] : { $in: v };
  }
  const tags = arr((q as any).tags);
  if (tags && tags.length) match.descriptionTags = { $in: tags };

  const from = dateArgStart((q as any).from);
  const to = dateArgEnd((q as any).to);
  const dateField = String((q as any).dateField || 'vettedDate');
  if (from || to) {
    match[dateField] = {};
    if (from) match[dateField].$gte = from;
    if (to) match[dateField].$lte = to;
  }

  return match;
}
