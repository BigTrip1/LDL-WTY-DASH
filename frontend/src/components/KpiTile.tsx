import { Card, CardContent } from '@/components/ui/card';
import CountUp from '@/components/reactbits/CountUp';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: number;
  format?: (n: number) => string;
  hint?: string | ReactNode;
  accent?: 'yellow' | 'green' | 'red' | 'blue' | 'muted';
  icon?: ReactNode;
  pulse?: boolean;
  /** Plain-English explanation shown on info hover. */
  info?: string;
  /** One-line formula shown in tooltip. */
  formula?: string;
  /** "From → to" date window summary (e.g. "All data · 2023-10 → 2025-10"). */
  range?: string;
  /** Source field(s) feeding the metric. */
  source?: string;
}

const accentBar: Record<NonNullable<Props['accent']>, string> = {
  yellow: 'bg-jcb-yellow',
  green: 'bg-emerald-400',
  red: 'bg-red-400',
  blue: 'bg-sky-400',
  muted: 'bg-jcb-border'
};

export default function KpiTile({
  label, value, format, hint, accent = 'yellow', icon, pulse, info, formula, range, source
}: Props) {
  return (
    <Card className="relative overflow-hidden group">
      <div className={cn('absolute left-0 top-0 h-full w-1', accentBar[accent], pulse && 'animate-pulse')} />
      <CardContent className="p-4 pl-5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground truncate flex items-center gap-1">
            {label}
            {(info || formula || source) && (
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`What is ${label}?`}
                      className="text-muted-foreground/70 hover:text-jcb-yellow transition-colors opacity-60 group-hover:opacity-100"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="max-w-[280px] leading-relaxed">
                    {info && <div className="mb-1.5">{info}</div>}
                    {formula && <div className="text-[10px] text-jcb-yellow font-mono">{formula}</div>}
                    {source && <div className="text-[10px] text-muted-foreground mt-1">Source: {source}</div>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </span>
          {icon && <span className="text-jcb-yellow/80 shrink-0">{icon}</span>}
        </div>
        <div className="mt-1 text-3xl font-black tabular-nums text-foreground">
          <CountUp to={value} format={format} />
        </div>
        {hint && <div className="mt-1 text-[11px] text-muted-foreground truncate" title={typeof hint === 'string' ? hint : undefined}>{hint}</div>}
        {range && (
          <div className="mt-1 text-[10px] text-muted-foreground/80 border-t border-jcb-border/40 pt-1 truncate" title={range}>
            <span className="text-jcb-yellow/60">range:</span> {range}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
