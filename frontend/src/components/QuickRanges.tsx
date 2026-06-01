import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Range { id: string; label: string; resolve: () => { from?: string; to?: string; regime?: string[] } }

function iso(d: Date): string { return d.toISOString().slice(0, 10); }

export const QUICK_RANGES: Range[] = [
  { id: 'all', label: 'All', resolve: () => ({}) },
  { id: '30d', label: 'Last 30d', resolve: () => { const t = new Date(); const f = new Date(); f.setDate(t.getDate() - 30); return { from: iso(f), to: iso(t) }; } },
  { id: '90d', label: 'Last 90d', resolve: () => { const t = new Date(); const f = new Date(); f.setDate(t.getDate() - 90); return { from: iso(f), to: iso(t) }; } },
  { id: 'ytd', label: 'YTD', resolve: () => { const t = new Date(); return { from: iso(new Date(Date.UTC(t.getUTCFullYear(), 0, 1))), to: iso(t) }; } },
  { id: '2024', label: '2024', resolve: () => ({ from: '2024-01-01', to: '2024-12-31' }) },
  { id: '2025', label: '2025', resolve: () => ({ from: '2025-01-01', to: '2025-12-31' }) },
  { id: 'pre', label: 'Pre-regime', resolve: () => ({ regime: ['pre-2025'] }) },
  { id: 'post', label: 'Post-regime', resolve: () => ({ regime: ['post-2025'] }) }
];

interface Props {
  active: { from?: string; to?: string; regime?: string[] };
  onPick: (patch: { from?: string; to?: string; regime?: string[] }) => void;
}

export default function QuickRanges({ active, onPick }: Props) {
  const matchId = (() => {
    for (const r of QUICK_RANGES) {
      const v = r.resolve();
      if ((v.from || '') === (active.from || '') &&
          (v.to || '') === (active.to || '') &&
          JSON.stringify(v.regime || []) === JSON.stringify(active.regime || []))
        return r.id;
    }
    return null;
  })();
  return (
    <div className="flex items-center gap-1">
      {QUICK_RANGES.map(r => (
        <Button
          key={r.id}
          variant={matchId === r.id ? 'default' : 'outline'}
          size="sm"
          className={cn('h-7 px-2 text-[11px]', matchId === r.id && 'font-bold')}
          onClick={() => {
            const v = r.resolve();
            onPick({ from: v.from, to: v.to, regime: v.regime });
          }}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}
