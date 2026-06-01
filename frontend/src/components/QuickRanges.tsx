import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  QUICK_RANGE_OPTIONS,
  resolveQuickRange,
  type QuickRangeId
} from '@/lib/dateRanges';

interface Props {
  active: { from?: string; to?: string; regime?: string[] };
  /** End of dataset (max vettedDate). Quick ranges are relative to this, not wall-clock today. */
  dataAnchor: Date;
  onPick: (patch: { from?: string; to?: string; regime?: string[] }) => void;
}

export default function QuickRanges({ active, dataAnchor, onPick }: Props) {
  const matchId = (() => {
    for (const r of QUICK_RANGE_OPTIONS) {
      const v = resolveQuickRange(r.id, dataAnchor);
      if ((v.from || '') === (active.from || '') &&
          (v.to || '') === (active.to || '') &&
          JSON.stringify(v.regime || []) === JSON.stringify(active.regime || [])) {
        return r.id;
      }
    }
    return null;
  })();

  const pick = (id: QuickRangeId) => {
    const v = resolveQuickRange(id, dataAnchor);
    if (v.regime) {
      onPick({ regime: v.regime, from: undefined, to: undefined });
    } else if (id === 'all') {
      onPick({ from: undefined, to: undefined, regime: undefined });
    } else {
      onPick({ from: v.from, to: v.to, regime: undefined });
    }
  };

  return (
    <div className="flex items-center gap-1">
      {QUICK_RANGE_OPTIONS.map(r => (
        <Button
          key={r.id}
          variant={matchId === r.id ? 'default' : 'outline'}
          size="sm"
          className={cn('h-7 px-2 text-[11px]', matchId === r.id && 'font-bold')}
          onClick={() => pick(r.id)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}
