/** Warranty-period buckets used on cohort trend charts (share of claims per month). */
export const TPERIOD_GROUP_LINES = [
  { dataKey: 'doaRate', name: 'DOA', color: '#EF4444' },
  { dataKey: 't1Rate', name: 'T1 (T000+T001)', color: '#FBBF24' },
  { dataKey: 't3Rate', name: 'T3 (T002+T003)', color: '#FCB026' },
  { dataKey: 't6Rate', name: 'T6 (T004–T006)', color: '#60A5FA' }
] as const;

export const TPERIOD_GROUP_FORMULA =
  'DOA=tPeriod DOA; T1=T000|T001; T3=T002|T003; T6=T004|T005|T006 — each line = group count / month total';

export function formatCohortRateTooltip(value: unknown, name: unknown): [string, string] {
  const n = Number(value);
  const pct = Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—';
  return [pct, String(name)];
}
