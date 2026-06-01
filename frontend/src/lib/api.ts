export type Filters = {
  model?: string[];
  country?: string[];
  supplier?: string[];
  area?: string[];
  tPeriod?: string[];
  outcome?: string[];
  regime?: string[];
  dealer?: string[];
  vetter?: string[];
  theme?: string[];
  hoursBucket?: string[];
  tags?: string[];
  customer?: string[];
  from?: string;
  to?: string;
  q?: string;
  dateField?: 'vettedDate' | 'buildDate' | 'claimDate' | 'failDate';
};

export function toQueryString(f: Filters | Record<string, any> = {}): string {
  const sp = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) {
      if (v.length === 0) return;
      sp.set(k, v.join(','));
    } else {
      sp.set(k, String(v));
    }
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

export const endpoints = {
  meta: () => api('/api/meta'),
  kpis: (f: Filters) => api(`/api/analytics/kpis${toQueryString(f)}`),
  trend: (f: Filters, by: 'month' | 'quarter' = 'month') => api(`/api/analytics/trend${toQueryString({ ...f, by })}`),
  byModel: (f: Filters) => api(`/api/analytics/by-model${toQueryString(f)}`),
  byArea: (f: Filters) => api(`/api/analytics/by-area${toQueryString(f)}`),
  topParts: (f: Filters, limit = 25) => api(`/api/analytics/top-parts${toQueryString({ ...f, limit })}`),
  bySupplier: (f: Filters, limit = 20) => api(`/api/analytics/by-supplier${toQueryString({ ...f, limit })}`),
  byCountry: (f: Filters) => api(`/api/analytics/by-country${toQueryString(f)}`),
  buildCohort: (f: Filters) => api(`/api/analytics/build-cohort${toQueryString(f)}`),
  claimCohort: (f: Filters) => api(`/api/analytics/claim-cohort${toQueryString(f)}`),
  buildAreaHeat: (f: Filters) => api(`/api/analytics/build-area-heat${toQueryString(f)}`),
  cohortDrill: (ym: string) => api(`/api/analytics/cohort-drill${toQueryString({ ym })}`),
  hours: (f: Filters) => api(`/api/analytics/hours-distribution${toQueryString(f)}`),
  tperiodMix: (f: Filters) => api(`/api/analytics/tperiod-mix${toQueryString(f)}`),
  regimeImpact: (f: Filters) => api(`/api/analytics/regime-impact${toQueryString(f)}`),
  outcomeMonthly: (f: Filters) => api(`/api/analytics/outcome-monthly${toQueryString(f)}`),
  vetterScorecard: (f: Filters) => api(`/api/analytics/vetter-scorecard${toQueryString(f)}`),
  vetterMonthly: (f: Filters) => api(`/api/analytics/vetter-monthly${toQueryString(f)}`),
  outcomeDrivers: (f: Filters, dimension: string, minN = 30) =>
    api(`/api/analytics/outcome-drivers${toQueryString({ ...f, dimension, minN })}`),
  descriptionTags: (f: Filters) => api(`/api/analytics/description-tags${toQueryString(f)}`),
  descriptionNgrams: (f: Filters, n: 1 | 2 = 1, limit = 50) =>
    api(`/api/analytics/description-ngrams${toQueryString({ ...f, n, limit })}`),
  descriptionTrend: (f: Filters, tags: string[]) =>
    api(`/api/analytics/description-trend${toQueryString({ ...f, tags })}`),
  descriptionSearch: (f: Filters, q: string, limit = 25) =>
    api(`/api/analytics/description-search${toQueryString({ ...f, q, limit })}`),
  anomalies: (f: Filters) => api(`/api/analytics/anomalies${toQueryString(f)}`),
  claims: (f: Filters, page = 1, pageSize = 25, sort = 'vettedDate', order: 'asc' | 'desc' = 'desc') =>
    api(`/api/claims${toQueryString({ ...f, page, pageSize, sort, order })}`),
  claim: (n: number) => api(`/api/claims/${n}`),
  relatedBySerial: (serial: number, exclude?: number, limit = 50) =>
    api(`/api/claims${toQueryString({ serial, excludeClaim: exclude, pageSize: limit, sort: 'vettedDate' })}`),
  uploadHistory: () => api('/api/upload/history'),
  // ----- improvement pass endpoints -----
  serialRecidivism: (f: Filters, minClaims = 5, limit = 50) =>
    api(`/api/analytics/serial-recidivism${toQueryString({ ...f, minClaims, limit })}`),
  pdiEscape: (f: Filters) => api(`/api/analytics/pdi-escape${toQueryString(f)}`),
  cannotDetectTrend: (f: Filters) => api(`/api/analytics/cannot-detect-trend${toQueryString(f)}`),
  seasonality: (f: Filters) => api(`/api/analytics/seasonality${toQueryString(f)}`),
  timeToVet: (f: Filters) => api(`/api/analytics/time-to-vet${toQueryString(f)}`),
  byAsd: (f: Filters) => api(`/api/analytics/by-asd${toQueryString(f)}`),
  byDealer: (f: Filters, limit = 50) => api(`/api/analytics/by-dealer${toQueryString({ ...f, limit })}`),
  byCustomer: (f: Filters, limit = 50) => api(`/api/analytics/by-customer${toQueryString({ ...f, limit })}`),
  zcodeDrivers: (f: Filters) => api(`/api/analytics/zcode-drivers${toQueryString(f)}`),
  themeIntegrity: (f: Filters) => api(`/api/analytics/theme-integrity${toQueryString(f)}`),
  tagCooccurrence: (f: Filters, topN = 15) => api(`/api/analytics/tag-cooccurrence${toQueryString({ ...f, topN })}`),
  vettersNotes: (f: Filters) => api(`/api/analytics/by-vettersnotes${toQueryString(f)}`),
  yoy: (f: Filters) => api(`/api/analytics/yoy${toQueryString(f)}`),
  movers: (f: Filters, dim = 'area', periodDays = 90) =>
    api(`/api/analytics/movers${toQueryString({ ...f, dim, periodDays })}`),
  recentActivity: (f: Filters, limit = 15) =>
    api(`/api/analytics/recent-activity${toQueryString({ ...f, limit })}`),
  tagSparklines: (f: Filters, topN = 8) =>
    api(`/api/analytics/tag-sparklines${toQueryString({ ...f, topN })}`),
  headlines: (f: Filters) => api(`/api/analytics/headlines${toQueryString(f)}`),
  dailyHeatmap: (f: Filters) => api(`/api/analytics/daily-heatmap${toQueryString(f)}`),
  sankey: (f: Filters) => api(`/api/analytics/sankey${toQueryString(f)}`),
  reportMarkdown: () => fetch('/api/report').then(r => r.text()),
  exportCsvUrl: (f: Filters) => `/api/export/csv${toQueryString(f)}`,
  recompute: () => api('/api/admin/recompute', { method: 'POST' }),

  // -------- Custom filter groups (user-defined named value-sets) ---------
  groups: (dimension?: FilterDimension) =>
    api<{ items: FilterGroup[] }>(`/api/groups${dimension ? `?dimension=${encodeURIComponent(dimension)}` : ''}`),
  createGroup: (g: { dimension: FilterDimension; name: string; values: string[] }) =>
    api<FilterGroup>('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(g)
    }),
  updateGroup: (id: string, patch: { name?: string; values?: string[] }) =>
    api<FilterGroup>(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    }),
  deleteGroup: (id: string) =>
    api<{ ok: true }>(`/api/groups/${id}`, { method: 'DELETE' })
};

// -------- Filter-group types -------------------------------------------
/** The dimensions on which a custom group can be defined. Mirrors backend/src/routes/groups.ts. */
export const FILTER_DIMENSIONS = ['model', 'country', 'supplier', 'area', 'tPeriod', 'outcome', 'dealer', 'vetter', 'theme', 'customer', 'tags'] as const;
export type FilterDimension = typeof FILTER_DIMENSIONS[number];

export interface FilterGroup {
  _id: string;
  dimension: FilterDimension;
  name: string;
  values: string[];
  createdAt: string;
  updatedAt: string;
}

/** Human-readable labels for each dimension - reused by the Admin UI. */
export const DIMENSION_LABEL: Record<FilterDimension, string> = {
  model:    'Model',
  country:  'Country',
  supplier: 'Supplier',
  area:     'Area',
  tPeriod:  'tPeriod',
  outcome:  'Outcome',
  dealer:   'Dealer',
  vetter:   'Vetter',
  theme:    'Theme',
  customer: 'Customer',
  tags:     'Tag'
};
