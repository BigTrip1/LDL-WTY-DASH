/** ISO date (YYYY-MM-DD) in UTC — matches API query params. */
export function isoDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Latest vetted claim in the dataset; falls back to today if meta is missing. */
export function getDataAnchor(meta?: { dateRange?: { maxVetted?: string | Date } | null }): Date {
  const raw = meta?.dateRange?.maxVetted;
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Calendar year-to-date: 1 Jan of the current year → today (wall-clock).
 * YTD always uses today, not the last claim date in the database.
 */
export function ytdRange(today: Date = new Date()): { from: string; to: string } {
  const end = today;
  const start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
  return { from: isoDateUTC(start), to: isoDateUTC(end) };
}

export function daysBeforeRange(anchor: Date, days: number): { from: string; to: string } {
  const end = anchor;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return { from: isoDateUTC(start), to: isoDateUTC(end) };
}

export type QuickRangeId = 'all' | '30d' | '90d' | 'ytd' | '2024' | '2025' | 'pre' | 'post';

export function resolveQuickRange(
  id: QuickRangeId,
  anchor: Date
): { from?: string; to?: string; regime?: string[] } {
  switch (id) {
    case 'all':
      return {};
    case '30d':
      return daysBeforeRange(anchor, 30);
    case '90d':
      return daysBeforeRange(anchor, 90);
    case 'ytd':
      return ytdRange(new Date());
    case '2024':
      return { from: '2024-01-01', to: '2024-12-31' };
    case '2025':
      return { from: '2025-01-01', to: '2025-12-31' };
    case 'pre':
      return { regime: ['pre-2025'] };
    case 'post':
      return { regime: ['post-2025'] };
    default:
      return {};
  }
}

export const QUICK_RANGE_OPTIONS: { id: QuickRangeId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: '30d', label: 'Last 30d' },
  { id: '90d', label: 'Last 90d' },
  { id: 'ytd', label: 'YTD' },
  { id: '2024', label: '2024' },
  { id: '2025', label: '2025' },
  { id: 'pre', label: 'Pre-regime' },
  { id: 'post', label: 'Post-regime' }
];
