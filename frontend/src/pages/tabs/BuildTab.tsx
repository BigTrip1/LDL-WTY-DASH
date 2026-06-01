import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { endpoints, type Filters } from '@/lib/api';
import ChartCard from '@/components/charts/ChartCard';
import RegimeLine from '@/components/charts/RegimeLine';
import { JCB, fmtInt, fmtPct, fmtMonth, cn, rangeLabel } from '@/lib/utils';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';

export default function BuildTab({ filters }: { filters: Filters; setFilters?: (f: Filters) => void }) {
  const cohort = useQuery({ queryKey: ['build-cohort', filters], queryFn: () => endpoints.buildCohort(filters) });
  const heat = useQuery({ queryKey: ['build-area-heat', filters], queryFn: () => endpoints.buildAreaHeat(filters) });
  const meta = useQuery({ queryKey: ['meta'], queryFn: () => endpoints.meta() });
  const range = rangeLabel(filters, meta.data);
  const [matureOnly, setMatureOnly] = useState(true);

  const cohortData = useMemo(() => {
    const all = (cohort.data || []).map((r: any) => ({ ...r, ts: +new Date(r.date) }));
    if (!matureOnly) return all;
    const cutoff = Date.now() - 90 * 86400000;
    return all.filter((r: any) => r.ts <= cutoff);
  }, [cohort.data, matureOnly]);

  const { ymList, areaList, matrix, max, mean, sd } = useMemo(() => {
    const rows = heat.data || [];
    const ymSet = new Set<number>(); const areaSet = new Set<string>();
    rows.forEach((r: any) => { ymSet.add(+new Date(r.ym)); areaSet.add(r.area); });
    const ymList = Array.from(ymSet).sort((a, b) => a - b);
    const areaTotals = new Map<string, number>();
    rows.forEach((r: any) => areaTotals.set(r.area, (areaTotals.get(r.area) || 0) + r.n));
    const areaList = Array.from(areaSet).sort((a, b) => (areaTotals.get(b)! - areaTotals.get(a)!)).slice(0, 15);
    const m = new Map<string, number>();
    rows.forEach((r: any) => m.set(`${+new Date(r.ym)}|${r.area}`, r.n));
    let max = 0;
    const matrix = areaList.map(a => ymList.map(y => {
      const v = m.get(`${y}|${a}`) || 0;
      if (v > max) max = v;
      return v;
    }));
    // Compute mean + sd over non-zero cells - sets the baseline for the
    // z-score anomaly flag. Threshold (>= mean + 2*sd, >= 20 absolute) is in render.
    const nonZero: number[] = [];
    matrix.forEach(row => row.forEach(v => { if (v > 0) nonZero.push(v); }));
    const n = nonZero.length || 1;
    const mean = nonZero.reduce((s, v) => s + v, 0) / n;
    const variance = nonZero.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const sd = Math.sqrt(variance);
    return { ymList, areaList, matrix, max, mean, sd };
  }, [heat.data]);

  const [drillYm, setDrillYm] = useState<string | null>(null);
  const drill = useQuery({
    queryKey: ['cohort-drill', drillYm],
    queryFn: () => endpoints.cohortDrill(drillYm!),
    enabled: !!drillYm
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard
        title="Build-cohort claim volume + DOA rate"
        description="Bars = claims raised against machines built that month. Line = DOA share. Reference line = Jan-2025 regime."
        info="One row per month-of-build. Recent cohorts inflate DOA because tail T-periods (T001..T006) haven't had time to materialise yet — toggle 'Mature cohorts only' to hide them."
        formula="bars = count(*); line = count(tPeriod=='DOA')/count(*)  GROUP BY month(buildDate)"
        source="buildDate, tPeriod"
        rangeLabel={range}
        loading={cohort.isLoading}
        className="lg:col-span-2"
        bodyClassName="h-[320px]"
        right={
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={matureOnly} onChange={e => setMatureOnly(e.target.checked)} className="accent-jcb-yellow" />
            Mature cohorts only (build &gt; 90 days ago)
          </label>
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={cohortData}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(v) => fmtMonth(new Date(v))} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
            <Tooltip labelFormatter={(v) => fmtMonth(new Date(v as number))}
                     formatter={(v: any, name: any) => (name === 'DOA rate' ? fmtPct(v) : fmtInt(v))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area yAxisId="left" type="monotone" dataKey="n" name="Claims" stroke={JCB.yellow} fill={JCB.yellow} fillOpacity={0.2} />
            <Line yAxisId="right" type="monotone" dataKey="doaRate" name="DOA rate" stroke={JCB.red} strokeWidth={2} dot={false} />
            <RegimeLine />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Build-month × Area heatmap (batch-issue hunt)"
        description="Darker = more claims. Click a column header (build-month) to drill in."
        info="Cross-tab of claim counts by (build month × failure area). Bright cells flag batch-issue suspects where a specific production area generated an outsize spike for one build month."
        formula="count(*) GROUP BY (month(buildDate), area)"
        source="buildDate, area"
        rangeLabel={range}
        loading={heat.isLoading}
        className="lg:col-span-2"
        bodyClassName="overflow-auto p-3"
      >
        <div className="min-w-fit">
          <table className="text-xs border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-jcb-surface px-2 py-1 text-left text-muted-foreground">Area \ Build month</th>
                {ymList.map(y => (
                  <th
                    key={y}
                    onClick={() => setDrillYm(new Date(y).toISOString().slice(0, 10))}
                    className={cn(
                      'px-1 py-1 text-[10px] font-medium text-muted-foreground cursor-pointer rotate-[-45deg] origin-bottom-left min-w-[24px] whitespace-nowrap hover:text-jcb-yellow',
                      drillYm && +new Date(drillYm) === y && 'text-jcb-yellow'
                    )}
                  >
                    {fmtMonth(new Date(y))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {areaList.map((a, i) => (
                <tr key={a}>
                  <td className="sticky left-0 z-10 bg-jcb-surface px-2 py-1 text-foreground/90 whitespace-nowrap pr-4">{a}</td>
                  {matrix[i].map((v, j) => {
                    const intensity = max > 0 ? v / max : 0;
                    const bg = v === 0 ? 'transparent' : `rgba(252,176,38,${0.10 + 0.75 * intensity})`;
                    const zScore = sd > 0 ? (v - mean) / sd : 0;
                    const anomaly = v >= 20 && zScore >= 2;
                    const title = anomaly
                      ? `${a} · ${fmtMonth(new Date(ymList[j]))} · ${v} (anomaly +${zScore.toFixed(1)}σ above mean ${mean.toFixed(1)})`
                      : `${a} · ${fmtMonth(new Date(ymList[j]))} · ${v}`;
                    return (
                      <td
                        key={j}
                        className="relative px-1 py-1 text-center text-[10px] text-black/90"
                        style={{ background: bg, color: intensity > 0.55 ? '#000' : '#bbb' }}
                        title={title}
                      >
                        {v || ''}
                        {anomaly && (
                          <span
                            className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-red-500 ring-1 ring-red-300"
                            aria-label="anomaly"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {drillYm && (
        <ChartCard
          title={`Build-month drill: ${fmtMonth(new Date(drillYm))}`}
          description="Top parts, areas, description tags, dealers and countries for this build cohort."
          info="Drill-down panel triggered by clicking a column header on the heatmap. Shows the leading values across each dimension for the selected build-month - cross-reference to identify the single cause of a batch incident."
          formula="for the chosen build-month: top 10 failedPart, top 10 area, top 15 descriptionTags, top 10 dealer, top 10 country"
          source="failedPart, area, descriptionTags, dealer, country"
          loading={drill.isLoading}
          className="lg:col-span-2"
          right={
            <button onClick={() => setDrillYm(null)} className="text-xs text-muted-foreground hover:text-jcb-yellow">
              clear
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
            <DrillList title="Top failed parts" rows={drill.data?.parts} />
            <DrillList title="Top areas" rows={drill.data?.areas} />
            <DrillList title="Top description tags" rows={drill.data?.tags} />
            <DrillList title="Top dealers" rows={drill.data?.dealers} />
            <DrillList title="Top countries" rows={drill.data?.countries} />
          </div>
        </ChartCard>
      )}
    </div>
  );
}

function DrillList({ title, rows }: { title: string; rows?: any[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{title}</div>
      <Table>
        <TableBody>
          {(rows || []).map(r => (
            <TableRow key={String(r._id)}>
              <TableCell className="py-1 text-xs truncate max-w-[180px]" title={String(r._id)}>{String(r._id)}</TableCell>
              <TableCell className="py-1 text-right text-xs tabular-nums text-jcb-yellow">{fmtInt(r.n)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
