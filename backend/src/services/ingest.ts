import { parse } from 'csv-parse';
import { Readable } from 'node:stream';
import { Claim, UploadLog } from '../models/Claim.js';
import { parseUKDate, regimeFor, hoursBucketOf } from '../utils/dates.js';
import { enrichDescription } from './nlp.js';

export interface IngestResult {
  received: number;
  inserted: number;
  skippedDuplicates: number;
  parseErrors: number;
  errorSamples: string[];
  durationMs: number;
}

const BATCH = 1000;

/** Theme values that have been hijacked for an outcome decision and need auto-fix. */
const THEME_IS_OUTCOME = new Set(['Z Code', 'Z Coded', 'Z-Code', 'Accept', 'Reject']);

function normaliseKey(k: string): string {
  return k.trim();
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === '#') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function deriveFailedPartCode(failedPart: string | null | undefined): string | null {
  if (!failedPart) return null;
  const head = String(failedPart).split('-')[0].trim();
  return head || null;
}

function rowToDoc(row: Record<string, string>) {
  const claimNumberRaw = row['claimNumber'];
  const claimNumber = toNumber(claimNumberRaw);
  if (claimNumber === null) {
    throw new Error(`missing/invalid claimNumber: ${claimNumberRaw}`);
  }

  const buildDate = parseUKDate(row['buildDate']);
  const claimDate = parseUKDate(row['claimDate']);
  const failDate = parseUKDate(row['failDate']);
  const vettedDate = parseUKDate(row['vetted_date']);

  let hoursVal = toNumber(row['hours']);
  if (hoursVal !== null && (hoursVal < 0 || hoursVal > 20000)) hoursVal = null;

  const buildToFailDays =
    buildDate && failDate
      ? Math.round((failDate.getTime() - buildDate.getTime()) / 86400000)
      : null;

  const nlp = enrichDescription(row['description']);

  return {
    _id: claimNumber,
    area: (row['area'] || '').trim() || 'Unknown',
    asd: (row['asd'] || '').trim() || 'Unknown',
    machineModel: (row['Machine Model'] || '').trim() || 'Unknown',
    buildDate,
    claimDate,
    serial: toNumber(row['serial']),
    country: (row['country'] || '').trim() || 'Unknown',
    customer: (row['customer'] || '').trim(),
    dealer: (row['dealer'] || '').trim(),
    description: row['description'] || '',
    detection: (row['detection'] || '').trim() || 'Unknown',
    division: (row['division'] || '').trim(),
    failDate,
    failedPart: (row['failedPart'] || '').trim(),
    failedPartCode: deriveFailedPartCode(row['failedPart']),
    // Auto-fix: when the vetter put an outcome decision into the theme field
    // (e.g. 'Z Coded'), preserve the original in themeOriginal and normalise
    // theme to 'Unknown' so the dimension isn't polluted.
    theme: THEME_IS_OUTCOME.has((row['theme'] || '').trim())
      ? 'Unknown'
      : ((row['theme'] || '').trim() || 'Unknown'),
    themeOriginal: THEME_IS_OUTCOME.has((row['theme'] || '').trim())
      ? (row['theme'] || '').trim()
      : null,
    hours: hoursVal,
    hoursBucket: hoursBucketOf(hoursVal),
    model: (row['model'] || '').trim(),
    vettersNotes: row['Vetters notes'] || '',
    claimOutcome: (row['Claim Outcome'] || '').trim() || null,
    tPeriod: (row['tPeriod'] || '').trim() || 'Unknown',
    vettedBy: (row['vettedBy'] || '').trim() || null,
    vettedDate,
    partSupplier: (row['partSupplier'] || '').trim() || 'Unknown',
    buildToFailDays,
    ...nlp,
    regime: regimeFor(vettedDate),
    ingestedAt: new Date()
  };
}

async function flushBatch(ops: any[], counters: IngestResult) {
  if (!ops.length) return;
  const res = await Claim.bulkWrite(ops, { ordered: false });
  const upserts = (res.upsertedCount ?? 0);
  counters.inserted += upserts;
  counters.skippedDuplicates += ops.length - upserts;
}

export async function ingestCsvBuffer(buf: Buffer, filename: string): Promise<IngestResult> {
  const started = Date.now();
  const counters: IngestResult = {
    received: 0,
    inserted: 0,
    skippedDuplicates: 0,
    parseErrors: 0,
    errorSamples: [],
    durationMs: 0
  };

  const parser = parse({
    columns: (header: string[]) => header.map(normaliseKey),
    trim: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true
  });

  Readable.from(buf).pipe(parser);

  let ops: any[] = [];

  for await (const row of parser as AsyncIterable<Record<string, string>>) {
    counters.received++;
    try {
      const doc = rowToDoc(row);
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $setOnInsert: doc },
          upsert: true
        }
      });
      if (ops.length >= BATCH) {
        await flushBatch(ops, counters);
        ops = [];
      }
    } catch (err: any) {
      counters.parseErrors++;
      if (counters.errorSamples.length < 10) {
        counters.errorSamples.push(`row ${counters.received}: ${err.message}`);
      }
    }
  }
  await flushBatch(ops, counters);

  counters.durationMs = Date.now() - started;

  await UploadLog.create({
    filename,
    size: buf.length,
    received: counters.received,
    inserted: counters.inserted,
    skippedDuplicates: counters.skippedDuplicates,
    parseErrors: counters.parseErrors,
    errorSamples: counters.errorSamples,
    startedAt: new Date(started),
    finishedAt: new Date(),
    durationMs: counters.durationMs
  });

  return counters;
}
