import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endpoints, type Filters } from '@/lib/api';
import ChartCard from '@/components/charts/ChartCard';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { fmtInt, fmtMonth, rangeLabel } from '@/lib/utils';

export default function DataQualityTab({ filters }: { filters: Filters }) {
  const anom = useQuery({ queryKey: ['anomalies', filters], queryFn: () => endpoints.anomalies(filters) });
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const grid = useQuery({
    queryKey: ['claims-grid', filters, page, pageSize],
    queryFn: () => endpoints.claims(filters, page, pageSize, 'vettedDate', 'desc')
  });
  const metaQ = useQuery({ queryKey: ['meta'], queryFn: () => endpoints.meta() });
  const range = rangeLabel(filters, metaQ.data);
  const totalPages = grid.data ? Math.max(1, Math.ceil(grid.data.total / pageSize)) : 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <AnomCard label="Total claims (filtered)" n={anom.data?.total} tone="muted"
        info="Total rows in the current filter. Use as the denominator when interpreting the other counters." />
      <AnomCard label="Negative build→fail days" n={anom.data?.negBuildToFail} tone="bad"
        info="Rows where failDate < buildDate (logically impossible). Data-entry errors in the source system. Use the grid below to find and report them upstream." />
      <AnomCard label="Missing fail date" n={anom.data?.missingFailDate} tone="warn"
        info="Rows where failDate is null. Expected on ~84% of rows because the field is optional upstream. Build→fail and fail→claim metrics rely on this field." />
      <AnomCard label="Missing claim date" n={anom.data?.missingClaimDate} tone="warn"
        info="Rows where claimDate is null. Same source-system gap as failDate." />
      <AnomCard label="Unvetted (Pending)" n={anom.data?.unvetted} tone="warn"
        info="Rows where claimOutcome is null - the claim has been raised but not yet vetted. This is the live backlog." />
      <AnomCard label="Area = Unknown" n={anom.data?.unknownArea} tone="muted"
        info="Rows where the vetter could not assign an area, OR the source field was empty (normalised to 'Unknown' on ingest). The Unknown bucket is the single biggest reject driver in the dataset." />
      <AnomCard label="Theme = Unknown" n={anom.data?.unknownTheme} tone="muted"
        info="Same idea for theme. Rows where the vetter couldn't categorise the failure type or the source field was empty." />
      <AnomCard label="Hours null / placeholder" n={anom.data?.nullHours} tone="muted"
        info="Rows where hours was originally '#' or out of range. The cleaning pipeline converts these to null so reliability metrics aren't polluted." />
      <AnomCard label="Description truncated (= 600 chars)" n={anom.data?.descTruncated} tone="warn"
        info="Rows where description length is exactly 600. The source export hard-caps descriptions at 600 characters - bigram counts on these rows are partial." />
      <AnomCard label="Theme mislabelled as outcome" n={anom.data?.themeAsOutcome} tone="bad"
        info="Rows where the theme field contains a decision value (e.g. 'Z Coded'). Future uploads will be auto-corrected at ingest; existing rows are listed in the Operations tab Theme integrity audit." />

      <ChartCard
        title="Claims drill-down grid"
        description="Server-paginated. Use the global filter bar to refine. Click any row to open the claim detail drawer."
        info="Raw claims with all 25 source columns, server-paginated 25 per page. Sortable by clicking the column header (vetted-date desc by default)."
        source="claims (full document)"
        rangeLabel={range}
        loading={grid.isLoading}
        className="lg:col-span-4"
        bodyClassName="p-0"
      >
        <div className="max-h-[520px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Vetted</TableHead>
                <TableHead>Build</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>tPeriod</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Vetter</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(grid.data?.rows || []).map((r: any) => (
                <TableRow key={r._id} className="cursor-pointer"
                  onClick={() => window.dispatchEvent(new CustomEvent('wty:open-claim', { detail: r._id }))}>
                  <TableCell className="font-mono text-xs">{r._id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtMonth(r.vettedDate)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtMonth(r.buildDate)}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{r.machineModel}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{r.area}</TableCell>
                  <TableCell className="text-xs"><Badge variant="ghost">{r.tPeriod}</Badge></TableCell>
                  <TableCell className="text-xs"><Badge variant="ghost">{r.claimOutcome || '–'}</Badge></TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{r.hours ?? '–'}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{r.vettedBy || '–'}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{r.country}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[420px] truncate" title={r.description}>{r.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t border-jcb-border px-4 py-2">
          <div className="text-xs text-muted-foreground">
            {grid.data ? <>Showing page <span className="text-foreground">{page}</span> of <span className="text-foreground">{totalPages}</span> · {fmtInt(grid.data.total)} matching claims</> : '–'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

function AnomCard({ label, n, tone, info }: { label: string; n: number | undefined; tone: 'bad' | 'warn' | 'good' | 'muted'; info?: string }) {
  const colour = tone === 'bad' ? 'text-red-300' : tone === 'warn' ? 'text-jcb-yellow' : tone === 'good' ? 'text-emerald-300' : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
          <span className="truncate">{label}</span>
          {info && (
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label={`What is ${label}?`} className="text-muted-foreground/70 hover:text-jcb-yellow shrink-0">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-[280px] leading-relaxed">{info}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className={`mt-1 text-2xl font-black tabular-nums ${colour}`}>{fmtInt(n ?? 0)}</div>
      </CardContent>
    </Card>
  );
}
