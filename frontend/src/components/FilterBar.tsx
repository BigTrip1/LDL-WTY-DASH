import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { endpoints, type Filters } from '@/lib/api';
import MultiSelect from './MultiSelect';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RotateCcw } from 'lucide-react';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

const FILTER_KEYS = ['model', 'country', 'supplier', 'area', 'tPeriod', 'outcome', 'regime', 'dealer', 'vetter', 'theme', 'tags', 'customer'] as const;

export function useUrlFilters(): [Filters, (f: Filters) => void] {
  const [sp, setSp] = useSearchParams();
  const filters = useMemo<Filters>(() => {
    const f: any = {};
    for (const k of FILTER_KEYS) {
      const v = sp.get(k);
      if (v) f[k] = v.split(',').filter(Boolean);
    }
    const from = sp.get('from'); if (from) f.from = from;
    const to = sp.get('to'); if (to) f.to = to;
    const q = sp.get('q'); if (q) f.q = q;
    const df = sp.get('dateField'); if (df) f.dateField = df;
    return f;
  }, [sp]);
  const set = (next: Filters) => {
    const u = new URLSearchParams();
    for (const k of FILTER_KEYS) {
      const v = (next as any)[k];
      if (Array.isArray(v) && v.length) u.set(k, v.join(','));
    }
    if (next.from) u.set('from', next.from);
    if (next.to) u.set('to', next.to);
    if (next.q) u.set('q', next.q);
    if (next.dateField) u.set('dateField', next.dateField);
    setSp(u, { replace: true });
  };
  return [filters, set];
}

export default function FilterBar({ filters, onChange }: Props) {
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: endpoints.meta });
  const [q, setQ] = useState(filters.q || '');
  useEffect(() => setQ(filters.q || ''), [filters.q]);

  if (!meta) return null;

  const update = (key: keyof Filters, value: any) => onChange({ ...filters, [key]: value });
  const reset = () => onChange({});

  const activeCount =
    FILTER_KEYS.reduce((acc, k) => acc + (((filters as any)[k]?.length) || 0), 0) +
    (filters.q ? 1 : 0) + (filters.from ? 1 : 0) + (filters.to ? 1 : 0);

  return (
    <div className="sticky top-[97px] z-20 bg-black/85 backdrop-blur-md border-b border-jcb-border">
      <div className="mx-auto max-w-[1600px] px-6 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">Filter</span>
          <MultiSelect dimension="model"    label="Model"    options={meta.models}              value={filters.model    ?? []} onChange={v => update('model',    v)} helpText="Specific model variant / SKU (e.g. 535V125, 542X70AGS). Filters every chart to claims for the selected models. 'By model' charts elsewhere group by machineModel (the broader family code like '535-125/535-140') so the family rollup is unchanged." />
          <MultiSelect dimension="country"  label="Country"  options={meta.countries}           value={filters.country  ?? []} onChange={v => update('country',  v)} helpText="Destination market of the machine. Useful for spotting region-specific failure patterns or vetter bias." />
          <MultiSelect dimension="supplier" label="Supplier" options={meta.suppliers}           value={filters.supplier ?? []} onChange={v => update('supplier', v)} helpText="Supplier of the failed part. Filters all charts and tables to claims attributed to the selected supplier(s)." />
          <MultiSelect dimension="area"     label="Area"     options={meta.areas}               value={filters.area     ?? []} onChange={v => update('area',     v)} helpText="Production-system area assigned to the claim by the vetter (e.g. Assembly Line, Supplier Quality, Booms)." />
          <MultiSelect dimension="tPeriod"  label="tPeriod"  options={meta.tPeriods}            value={filters.tPeriod  ?? []} onChange={v => update('tPeriod',  v)} helpText="Warranty period bucket: DOA = dead-on-arrival, T000 = first weeks, T001-T006 = later in warranty life." />
          <MultiSelect dimension="outcome"  label="Outcome"  options={meta.outcomes}            value={filters.outcome  ?? []} onChange={v => update('outcome',  v)} helpText="The vetter's decision: Accept, Reject, Z Code (goodwill), More Info, etc. Empty means unvetted (Pending)." />
          <MultiSelect                       label="Regime"   options={['pre-2025', 'post-2025', 'unvetted']} value={filters.regime ?? []} onChange={v => update('regime', v)} helpText="Pre-2025 = claims vetted before the Jan-2025 vetting-manager change. Post-2025 = after. Unvetted = no outcome yet." />
          <MultiSelect dimension="vetter"   label="Vetter"   options={meta.vetters}             value={filters.vetter   ?? []} onChange={v => update('vetter',   v)} helpText="The person who vetted the claim. Use to compare individual vetter behaviour or focus on a specific reviewer's backlog." />
          <MultiSelect dimension="tags"     label="Tag"      options={meta.tags}                value={filters.tags     ?? []} onChange={v => update('tags',     v)} helpText="Controlled-vocab symptom tag extracted from the description (oil-leak, valve, hose, loose, travel-site, etc.)." />
          <MultiSelect dimension="dealer"   label="Dealer"   options={meta.dealers}             value={filters.dealer   ?? []} onChange={v => update('dealer',   v)} helpText="The dealer who sold or submitted the claim. Use the People & Places tab for the dealer scorecard." />
          <MultiSelect dimension="theme"    label="Theme"    options={meta.themes}              value={filters.theme    ?? []} onChange={v => update('theme',    v)} helpText="The vetter's fault-theme label for the claim (e.g. Part Failure, Loose Hose/Adaptor)." />
          <MultiSelect dimension="customer" label="Customer" options={meta.customers ?? []}     value={filters.customer ?? []} onChange={v => update('customer', v)} helpText="Top 200 most-active customers. Stock claims ('#') are intentionally excluded from this list." />

          <div className="relative ml-auto flex-shrink-0 w-[220px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search description…"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') update('q', q); }}
              onBlur={() => { if (q !== filters.q) update('q', q); }}
              className="h-7 pl-7 text-xs"
            />
          </div>

          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] flex-shrink-0" onClick={reset} disabled={activeCount === 0}>
            <RotateCcw className="h-3 w-3" />
            Reset {activeCount > 0 && <span className="text-jcb-yellow">({activeCount})</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}
