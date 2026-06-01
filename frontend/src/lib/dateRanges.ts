/** ISO date (YYYY-MM-DD) in local timezone — matches what users expect in date inputs. */
export function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** ISO date (YYYY-MM-DD) in UTC. */
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
 * Calendar year-to-date for the machine's current year:
 * 1 January → today (local date). Recomputed on every call so it rolls forward
 * when the calendar year changes and `to` advances each day.
 */
export function ytdRange(today: Date = new Date()): { from: string; to: string } {
  const y = today.getFullYear();
  return { from: `${y}-01-01`, to: isoDateLocal(today) };
}

/** True when filters are YTD for the current calendar year (from is always 1 Jan). */
export function isCurrentCalendarYtd(
  from?: string,
  to?: string,
  today: Date = new Date()
): boolean {
  if (!from || !to) return false;
  const y = today.getFullYear();
  if (from !== `${y}-01-01`) return false;
  if (!to.startsWith(`${y}-`)) return false;
  return to <= isoDateLocal(today);
}

/**
 * True when URL dates look like a previous year's YTD (Jan 1 → mid-year),
 * not a deliberate full-year range (…-12-31).
 */
export function isStaleCalendarYtd(
  from?: string,
  to?: string,
  today: Date = new Date()
): boolean {
  if (!from || !to) return false;
  const m = /^(\d{4})-01-01$/.exec(from);
  if (!m) return false;
  const fromYear = Number(m[1]);
  const currentYear = today.getFullYear();
  if (fromYear >= currentYear) return false;
  if (to === `${fromYear}-12-31`) return false;
  return to.startsWith(`${fromYear}-`);
}

/** Default dashboard date window on first load. */
export function landingDateFilters(
  url: { from?: string | null; to?: string | null; regime?: string | null },
  today: Date = new Date()
): { from: string; to: string } | null {
  if (url.regime) return null;
  const currentYtd = ytdRange(today);
  if (!url.from && !url.to) return currentYtd;
  if (url.from && url.to && isStaleCalendarYtd(url.from, url.to, today)) return currentYtd;
  return null;
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
