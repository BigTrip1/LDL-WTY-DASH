import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { endpoints, type Filters } from '@/lib/api';
import QuickRanges from './QuickRanges';
import FilterPresets from './FilterPresets';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  /** Latest claim date in Mongo — quick ranges (especially YTD) anchor here. */
  dataAnchor: Date;
}

export default function TopBar({ filters, onChange, dataAnchor }: Props) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  return (
    <div className="sticky top-[57px] z-30 bg-black/90 backdrop-blur border-b border-jcb-border">
      <div className="mx-auto max-w-[1600px] px-6 py-2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">Date</span>
          <Input type="date" value={filters.from || ''} onChange={e => update({ from: e.target.value })}
            className="h-7 w-[130px] text-xs" />
          <span className="text-muted-foreground text-xs">→</span>
          <Input type="date" value={filters.to || ''} onChange={e => update({ to: e.target.value })}
            className="h-7 w-[130px] text-xs" />
        </div>
        <div className="h-5 w-px bg-jcb-border" />
        <QuickRanges
          dataAnchor={dataAnchor}
          active={{ from: filters.from, to: filters.to, regime: filters.regime }}
          onPick={(v) => onChange({ ...filters, ...v })}
        />
        <div className="ml-auto flex items-center gap-2">
          <FilterPresets current={filters} onApply={onChange} />
          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" asChild>
            <a href={endpoints.exportCsvUrl(filters)} download>
              <Download className="h-3 w-3" /> Export CSV
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            title="Re-derive NLP & regime on existing docs (rare)"
            onClick={() => { endpoints.recompute().then((r: any) => alert(`Recomputed ${r.updated} of ${r.scanned} docs in ${(r.durationMs/1000).toFixed(1)}s`)); }}
          >
            <RefreshCw className="h-3 w-3" /> Recompute
          </Button>
        </div>
      </div>
    </div>
  );
}
