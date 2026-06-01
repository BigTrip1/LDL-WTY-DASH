import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtInt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '–';
  return Math.round(n).toLocaleString();
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || isNaN(n)) return '–';
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '–';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '–';
  return dt.toISOString().slice(0, 10);
}

export function fmtMonth(d: string | Date | null | undefined): string {
  if (!d) return '–';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '–';
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const JCB = {
  yellow: '#FCB026',
  yellow2: '#FFD24A',
  yellow3: '#FFE48A',
  red: '#EF4444',
  green: '#22C55E',
  blue: '#60A5FA',
  purple: '#A78BFA',
  muted: '#525252',
  ink: '#0b0b0b'
};

export const OUTCOME_COLORS: Record<string, string> = {
  Accept: '#22C55E',
  Reject: '#EF4444',
  'Z Code': '#FCB026',
  'More Info': '#60A5FA',
  'Parts Back': '#A78BFA',
  'Pictures Required': '#94A3B8',
  'Raise on Supplier': '#F472B6'
};

/**
 * Build a human label describing the active date window of a filter object,
 * falling back to the dataset's overall date range if no `from`/`to` is set.
 */
export function rangeLabel(
  filters: { from?: string; to?: string; regime?: string[] } | undefined,
  meta?: { dateRange?: { minVetted?: string; maxVetted?: string } | null }
): string {
  const from = filters?.from;
  const to = filters?.to;
  if (from && to) return `${from} → ${to}`;
  if (from) return `${from} → today`;
  if (to) return `… → ${to}`;
  if (filters?.regime?.length === 1) {
    if (filters.regime[0] === 'pre-2025') return 'pre Jan-2025';
    if (filters.regime[0] === 'post-2025') return 'post Jan-2025';
  }
  if (meta?.dateRange?.minVetted && meta?.dateRange?.maxVetted) {
    return `${String(meta.dateRange.minVetted).slice(0, 10)} → ${String(meta.dateRange.maxVetted).slice(0, 10)}`;
  }
  return 'all data';
}
