import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  /** Long-form explanation shown in a hover tooltip on the (i) icon. */
  info?: string;
  /** Free-text formula or methodology shown in the tooltip. */
  formula?: string;
  /** Source field(s) drawn from. */
  source?: string;
  /** Optional "showing data from / to" range label rendered top-right. */
  rangeLabel?: string;
  loading?: boolean;
  className?: string;
  bodyClassName?: string;
  right?: ReactNode;
  children: ReactNode;
}

export default function ChartCard({
  title, description, info, formula, source, rangeLabel,
  loading, className, bodyClassName, right, children
}: Props) {
  const isScrollBody = bodyClassName?.includes('overflow');
  const isFixedHeightChart =
    !isScrollBody &&
    (bodyClassName?.includes('h-[') || bodyClassName?.includes('min-h-['));

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-sm truncate">{title}</CardTitle>
            {(info || formula || source) && (
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="What does this show?"
                      className="text-muted-foreground hover:text-jcb-yellow transition-colors shrink-0"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start" className="max-w-[320px] text-left leading-relaxed">
                    {info && <div className="mb-1.5">{info}</div>}
                    {formula && (
                      <div className="text-[10px] text-jcb-yellow font-mono">{formula}</div>
                    )}
                    {source && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Source: {source}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rangeLabel && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap rounded border border-jcb-border bg-jcb-ink px-1.5 py-0.5">
              {rangeLabel}
            </span>
          )}
          {right}
        </div>
      </CardHeader>
      <CardContent className={cn('pt-0', isFixedHeightChart && 'overflow-visible', bodyClassName)}>
        {/*
          NOTE: do not put `flex-1` on this CardContent. When ChartCard sits in a
          grid row where every peer is also a ChartCard (no intrinsic-height
          content), `flex: 1 1 0%` collapses the height to 0 and the Recharts
          ResponsiveContainer renders at 0 px - the chart appears blank even
          though data is loaded. The explicit h-[XXX] from bodyClassName must
          win. See docs/IMPROVEMENTS.md "Empty chart bug" for the history.
        */}
        {loading ? <Skeleton className="h-full w-full min-h-[220px]" /> : children}
      </CardContent>
    </Card>
  );
}
