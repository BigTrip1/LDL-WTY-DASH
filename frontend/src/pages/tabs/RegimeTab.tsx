import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { Check } from 'lucide-react';
import { endpoints, type Filters } from '@/lib/api';
import ChartCard from '@/components/charts/ChartCard';
import RegimeLine from '@/components/charts/RegimeLine';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { OUTCOME_COLORS, fmtInt, fmtPct, fmtMonth, rangeLabel, cn } from '@/lib/utils';

export default function RegimeTab({ filters }: { filters: Filters; setFilters?: (f: Filters) => void }) {
  const impact = useQuery({ queryKey: ['regime-impact', filters], queryFn: () => endpoints.regimeImpact(filters) });
  const monthly = useQuery({ queryKey: ['outcome-monthly', filters], queryFn: () => endpoints.outcomeMonthly(filters) });
  const score = useQuery({ queryKey: ['vetter-scorecard', filters], queryFn: () => endpoints.vetterScorecard(filters) });
  const meta = useQuery({ queryKey: ['meta'], queryFn: () => endpoints.meta() });
  const range = rangeLabel(filters, meta.data);

  const topVetters = useMemo(() => (score.data || []).slice(0, 6).map((r: any) => r.vetter), [score.data]);
  const allVetters = useMemo(() => (score.data || []).map((r: any) => r.vetter), [score.data]);
  const [selectedVetters, setSelectedVetters] = useState<string[] | null>(null);

  // When score.data first loads, eagerly seed the selection so the chart never
  // renders empty. Without this, there is a moment when topVetters is [] and
  // any click that happens before the seed loads silently no-ops.
  useEffect(() => {
    if (selectedVetters === null && topVetters.length > 0) {
      setSelectedVetters(topVetters);
    }
  }, [topVetters, selectedVetters]);

  const activeVetters = selectedVetters ?? topVetters;
  const monthlyV = useQuery({
    queryKey: ['vetter-monthly', filters],
    queryFn: () => endpoints.vetterMonthly(filters)
  });

  const toggleVetter = (v: string) => {
    const base = selectedVetters ?? topVetters;
    setSelectedVetters(base.includes(v) ? base.filter((x: string) => x !== v) : [...base, v]);
  };

  const monthlyChart = useMemo(() => {
    const rows = monthly.data || [];
    const map = new Map<number, any>();
    rows.forEach((r: any) => {
      const ts = +new Date(r.ym);
      if (!map.has(ts)) map.set(ts, { ts });
      map.get(ts)[r.outcome || 'Unknown'] = (map.get(ts)[r.outcome || 'Unknown'] || 0) + r.n;
    });
    return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
  }, [monthly.data]);

  const outcomeKeys = useMemo(() => {
    const s = new Set<string>();
    monthlyChart.forEach(d => Object.keys(d).forEach(k => k !== 'ts' && s.add(k)));
    return Array.from(s);
  }, [monthlyChart]);

  const vetterChart = useMemo(() => {
    const rows = (monthlyV.data || []).filter((r: any) => activeVetters.includes(r.vetter));
    const map = new Map<number, any>();
    rows.forEach((r: any) => {
      const ts = +new Date(r.ym);
      if (!map.has(ts)) map.set(ts, { ts });
      map.get(ts)[r.vetter] = r.acceptRate;
    });
    return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
  }, [monthlyV.data, activeVetters]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="lg:col-span-2">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold">Regime impact · pre vs post Jan 2025</div>
              <div className="text-xs text-muted-foreground">
                New vetting manager · stricter rejects, more goodwill Z-codes. Z-Code is treated as a non-accept in the True Accept Rate.
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              n pre = <span className="text-foreground">{fmtInt(impact.data?.preTotal)}</span> ·
              n post = <span className="text-foreground">{fmtInt(impact.data?.postTotal)}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Pre n</TableHead>
                  <TableHead className="text-right">Pre %</TableHead>
                  <TableHead className="text-right">Post n</TableHead>
                  <TableHead className="text-right">Post %</TableHead>
                  <TableHead className="text-right">Δ pp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(impact.data?.rows || []).map((r: any) => (
                  <TableRow key={r.outcome}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: OUTCOME_COLORS[r.outcome] || '#888' }} />
                        {r.outcome}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(r.preN)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(r.prePct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(r.postN)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(r.postPct)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Badge variant={r.deltaPp > 0.5 ? 'bad' : r.deltaPp < -0.5 ? 'good' : 'ghost'}>
                        {r.deltaPp >= 0 ? '+' : ''}{r.deltaPp.toFixed(1)} pp
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ChartCard
        title="Monthly outcome mix (vetted-date)"
        description="Stacked counts. Reject + Z-Code volume climbs from Jan 2025 onward."
        info="Each month's vetted claims stacked by outcome category. The Jan-2025 line marks the new vetting manager taking over."
        formula="count(*) GROUP BY (month(vettedDate), claimOutcome)"
        source="vettedDate, claimOutcome"
        rangeLabel={range}
        loading={monthly.isLoading}
        className="lg:col-span-2"
        bodyClassName="h-[360px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyChart}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(v) => fmtMonth(new Date(v))} />
            <YAxis />
            <Tooltip labelFormatter={(v) => fmtMonth(new Date(v as number))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {outcomeKeys.map(k => (
              <Bar key={k} dataKey={k} stackId="a" fill={OUTCOME_COLORS[k] || '#888'} />
            ))}
            <RegimeLine />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Vetter scorecard"
        description="Click a row to add/remove that vetter from the trend chart below. Selected rows glow yellow."
        info="Aggregates per vetter: total vetted, Reject %, Z-Code %, average days from claim to vet, and Accept rate (last column per the team's convention)."
        formula="GROUP BY vettedBy → count, rate per outcome, avg(vettedDate - claimDate)"
        source="vettedBy, claimOutcome, claimDate, vettedDate"
        rangeLabel={range}
        loading={score.isLoading}
        className="lg:col-span-2"
        bodyClassName="max-h-[480px] overflow-auto p-0"
        right={
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-muted-foreground">
              <span className="text-jcb-yellow font-semibold">{activeVetters.length}</span> of {allVetters.length} selected
            </span>
            <Button variant="outline" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setSelectedVetters(allVetters)}>All</Button>
            <Button variant="outline" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setSelectedVetters(topVetters)}>Top 6</Button>
            <Button variant="outline" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setSelectedVetters([])}>Clear</Button>
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6"></TableHead>
              <TableHead>Vetter</TableHead>
              <TableHead className="text-right">Vetted</TableHead>
              <TableHead className="text-right">Reject</TableHead>
              <TableHead className="text-right">Z-Code</TableHead>
              <TableHead className="text-right">Avg days to vet</TableHead>
              <TableHead className="text-right">First → Last</TableHead>
              <TableHead className="text-right">Accept</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(score.data || []).map((r: any, i: number) => {
              const selected = activeVetters.includes(r.vetter);
              const stripeColour = selected ? lineColor(activeVetters.indexOf(r.vetter)) : 'transparent';
              return (
                <TableRow
                  key={r.vetter}
                  onClick={() => toggleVetter(r.vetter)}
                  className={cn(
                    'cursor-pointer transition-colors relative',
                    selected
                      ? 'bg-jcb-yellow/15 hover:bg-jcb-yellow/20 ring-1 ring-inset ring-jcb-yellow/40'
                      : 'hover:bg-jcb-surface'
                  )}
                  style={selected ? { boxShadow: `inset 4px 0 0 0 ${stripeColour}` } : undefined}
                  title={selected ? `Click to remove ${r.vetter} from chart` : `Click to add ${r.vetter} to chart`}
                >
                  <TableCell className="text-center">
                    <span
                      className={cn(
                        'inline-flex h-4 w-4 items-center justify-center rounded border transition-colors',
                        selected ? 'bg-jcb-yellow border-jcb-yellow' : 'border-jcb-border bg-transparent'
                      )}
                    >
                      {selected && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
                    </span>
                  </TableCell>
                  <TableCell className={cn('font-medium', selected && 'text-jcb-yellow')}>{r.vetter}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(r.rejectRate)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(r.zcodeRate)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {r.avgDaysToVet != null ? r.avgDaysToVet.toFixed(1) : '–'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {r.firstSeen ? fmtMonth(r.firstSeen) : '–'} → {r.lastSeen ? fmtMonth(r.lastSeen) : '–'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant={r.acceptRate < 0.7 ? 'bad' : r.acceptRate < 0.85 ? 'warn' : 'good'}>
                      {fmtPct(r.acceptRate)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ChartCard>

      <ChartCard
        title={`Per-vetter accept rate over time · ${activeVetters.length} selected`}
        description="Selected vetters from the scorecard above. Reference line marks the Jan-2025 regime change."
        info="Monthly accept rate per selected vetter. Useful for spotting individual drift around the regime change. Line colours match the left-edge stripe on each selected row above."
        formula="count(Accept)/count(*) GROUP BY (vettedBy, month(vettedDate))"
        source="vettedBy, vettedDate, claimOutcome"
        rangeLabel={range}
        loading={monthlyV.isLoading}
        className="lg:col-span-2"
        bodyClassName="h-[340px]"
      >
        {activeVetters.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
            <div>
              <div className="mb-1">No vetters selected.</div>
              <div className="text-[10px]">Click rows in the scorecard above, or press <strong>Top 6</strong> to seed the chart.</div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={vetterChart}>
              <CartesianGrid stroke="#1a1a1a" />
              <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(v) => fmtMonth(new Date(v))} />
              <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
              <Tooltip labelFormatter={(v) => fmtMonth(new Date(v as number))} formatter={(v: any) => fmtPct(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {activeVetters.map((v: string, i: number) => (
                <Line key={v} type="monotone" dataKey={v} stroke={lineColor(i)} strokeWidth={2} dot={false} connectNulls />
              ))}
              <RegimeLine />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

function lineColor(i: number) {
  const palette = ['#FCB026', '#22C55E', '#EF4444', '#60A5FA', '#A78BFA', '#F472B6', '#FBBF24', '#34D399'];
  return palette[i % palette.length];
}
