export const REGIME_DATE = new Date('2025-01-01T00:00:00Z');

export function parseUKDate(s: unknown): Date | null {
  if (s === null || s === undefined) return null;
  const str = String(s).trim();
  if (!str || str === '#') return null;
  const m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  let [, dd, mm, yyyy] = m;
  let y = Number(yyyy);
  if (y < 100) y += y < 70 ? 2000 : 1900;
  const d = new Date(Date.UTC(y, Number(mm) - 1, Number(dd)));
  return isNaN(d.getTime()) ? null : d;
}

export function regimeFor(vettedDate: Date | null | undefined): 'pre-2025' | 'post-2025' | 'unvetted' {
  if (!vettedDate) return 'unvetted';
  return vettedDate < REGIME_DATE ? 'pre-2025' : 'post-2025';
}

export function hoursBucketOf(h: number | null | undefined): string {
  if (h == null || isNaN(h)) return 'Unknown';
  if (h < 50) return '0-50';
  if (h < 250) return '50-250';
  if (h < 1000) return '250-1000';
  if (h < 5000) return '1000-5000';
  return '5000+';
}
