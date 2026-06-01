import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, Area, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ComposedChart, Line, BarChart, AreaChart, Legend, Cell
} from 'recharts';
import {
  ShieldAlert, Skull, Repeat, Wrench, EyeOff, Tag as TagIcon,
  Shield, TrendingUp, TrendingDown, ArrowRight, Activity, MapPin
} from 'lucide-react';
import { endpoints, type Filters } from '@/lib/api';
import ChartCard from '@/components/charts/ChartCard';
import RegimeLine, { REGIME_DATE_MS } from '@/components/charts/RegimeLine';
import Sparkline from '@/components/charts/Sparkline';
import Donut from '@/components/charts/Donut';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { JCB, OUTCOME_COLORS, fmtInt, fmtPct, fmtMonth, fmtDate, cn, rangeLabel } from '@/lib/utils';

interface TabProps { filters: Filters; setFilters?: (f: Filters) => void }

const ICONS: Record<string, any> = {
  shield: Shield, 'shield-alert': ShieldAlert, 'eye-off': EyeOff, skull: Skull,
  wrench: Wrench, repeat: Repeat, tag: TagIcon
};

const MOY = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function OverviewTab({ filters, setFilters }: TabProps) {
  const trend = useQuery({ queryKey: ['trend', filters], queryFn: () => endpoints.trend(filters) });
  const yoy = useQuery({ queryKey: ['yoy', filters], queryFn: () => endpoints.yoy(filters) });
  const byArea = useQuery({ queryKey: ['by-area', filters], queryFn: () => endpoints.byArea(filters) });
  const byModel = useQuery({ queryKey: ['by-model', filters], queryFn: () => endpoints.byModel(filters) });
  const topParts = useQuery({ queryKey: ['top-parts', filters], queryFn: () => endpoints.topParts(filters, 15) });
  const byCountry = useQuery({ queryKey: ['by-country', filters], queryFn: () => endpoints.byCountry(filters) });
  const regime = useQuery({ queryKey: ['regime-impact', filters], queryFn: () => endpoints.regimeImpact(filters) });
  const cohort = useQuery({ queryKey: ['build-cohort', filters], queryFn: () => endpoints.buildCohort(filters) });
  const headlines = useQuery({ queryKey: ['headlines', filters], queryFn: () => endpoints.headlines(filters) });
  const activity = useQuery({ queryKey: ['recent-activity', filters], queryFn: () => endpoints.recentActivity(filters, 14) });
  const sparkTags = useQuery({ queryKey: ['tag-sparklines', filters], queryFn: () => endpoints.tagSparklines(filters, 8) });

  const [moversDim, setMoversDim] = useState<'area' | 'tag' | 'model' | 'supplier'>('area');
  const movers = useQuery({ queryKey: ['movers', filters, moversDim], queryFn: () => endpoints.movers(filters, moversDim, 90) });
  const meta = useQuery({ queryKey: ['meta'], queryFn: () => endpoints.meta() });
  const range = rangeLabel(filters, meta.data);

  const addFilter = (key: keyof Filters, value: string) => {
    if (!setFilters) return;
    const cur = (filters[key] as string[] | undefined) ?? [];
    if (cur.includes(value)) return;
    setFilters({ ...filters, [key]: [...cur, value] });
  };

  // YoY transform — pivot to {monthIdx, [yyyy]: n}
  const yoyChart = useMemo(() => {
    const rows = yoy.data || [];
    const years = (Array.from(new Set(rows.map((r: any) => r.year))) as number[]).sort((a, b) => a - b);
    const byMonth = new Map<number, any>();
    for (let m = 1; m <= 12; m++) byMonth.set(m, { monthLabel: MOY[m], monthIdx: m });
    for (const r of rows) {
      byMonth.get(r.month)![`y${r.year}`] = r.n;
    }
    return { years, data: Array.from(byMonth.values()) };
  }, [yoy.data]);

  // Trend with momentum (rolling 3-mo average)
  const trendData = useMemo(() => {
    if (!trend.data) return [];
    const v = new Map<number, any>((trend.data.vetted || []).map((r: any) => [+new Date(r.date), r] as [number, any]));
    const keys = Array.from(v.keys()).sort((a, b) => a - b);
    const out: any[] = keys.map((k: number) => ({
      date: k,
      vetted: (v.get(k) as any)?.n ?? 0,
      accept: (v.get(k) as any)?.accept ?? 0,
      reject: (v.get(k) as any)?.reject ?? 0,
      zcode: (v.get(k) as any)?.zcode ?? 0,
      roll3: 0
    }));
    for (let i = 0; i < out.length; i++) {
      const slice = out.slice(Math.max(0, i - 2), i + 1);
      out[i].roll3 = Math.round(slice.reduce((s: number, r: any) => s + r.vetted, 0) / slice.length);
    }
    return out;
  }, [trend.data]);

  const regimePre = regime.data?.rows?.reduce((acc: any, r: any) => { acc[r.outcome] = r.preN; return acc; }, {}) || {};
  const regimePost = regime.data?.rows?.reduce((acc: any, r: any) => { acc[r.outcome] = r.postN; return acc; }, {}) || {};
  const preTotal = regime.data?.preTotal || 0;
  const postTotal = regime.data?.postTotal || 0;

  const donutData = (mix: Record<string, number>) => Object.entries(mix).map(([k, v]) => ({
    label: k, value: v as number, color: OUTCOME_COLORS[k] || '#888'
  }));

  return (
    <div className="space-y-4">
      {/* ===== Row 1: HEADLINE INSIGHT CARDS ===== */}
      {!headlines.isLoading && headlines.data && headlines.data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {(headlines.data || []).map((h: any, i: number) => {
            const Icon = ICONS[h.icon] || Activity;
            const accent = h.kind === 'bad' ? 'border-red-400/40 bg-red-500/5'
              : h.kind === 'warn' ? 'border-jcb-yellow/40 bg-jcb-yellow/5'
              : 'border-jcb-border bg-jcb-surface';
            const iconColor = h.kind === 'bad' ? 'text-red-300' : h.kind === 'warn' ? 'text-jcb-yellow' : 'text-sky-300';
            return (
              <Card key={i} className={cn('overflow-hidden', accent)}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColor)} />
                    <div className="min-w-0">
                      <div className={cn('text-[10px] uppercase tracking-widest font-semibold', iconColor)}>{h.title}</div>
                      <div className="mt-1 text-xs text-foreground leading-snug">{h.body}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== Row 2: YoY + Pre-vs-Post mini-dashboards ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Year-on-year claim volume"
          description="Each colour = one calendar year, overlaid by month. Reveals seasonality and year-on-year drift."
          info="Groups vetted claims by (year, month-of-year). Plots a clustered bar per year so you can read seasonal shape and year-over-year shift at a glance."
          formula="GROUP BY year(vettedDate), month(vettedDate) → COUNT"
          source="vettedDate"
          rangeLabel={range}
          loading={yoy.isLoading}
          className="lg:col-span-2"
          bodyClassName="h-[280px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yoyChart.data}>
              <CartesianGrid stroke="#1a1a1a" />
              <XAxis dataKey="monthLabel" />
              <YAxis />
              <Tooltip formatter={(v: any, k: any) => [fmtInt(v), String(k).replace('y', '')]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {yoyChart.years.map((y: number, i: number) => (
                <Bar key={y} dataKey={`y${y}`} name={`${y}`} fill={yearColor(i)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Pre vs post Jan-2025 regime</div>
            <div className="grid grid-cols-2 gap-3">
              <RegimeMini label="Pre" total={preTotal} mix={regimePre} accent="muted" />
              <RegimeMini label="Post" total={postTotal} mix={regimePost} accent="warn" />
            </div>
            <div className="mt-3 space-y-1">
              {(regime.data?.rows || []).filter((r: any) => Math.abs(r.deltaPp) >= 0.5).slice(0, 5).map((r: any) => (
                <div key={r.outcome} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: OUTCOME_COLORS[r.outcome] || '#888' }} />
                    {r.outcome}
                  </span>
                  <span className={cn('tabular-nums font-medium', r.deltaPp > 0 ? 'text-red-300' : 'text-emerald-300')}>
                    {r.deltaPp >= 0 ? '+' : ''}{r.deltaPp.toFixed(1)} pp
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Row 3: month-on-month with 3-mo rolling avg ===== */}
      <ChartCard
        title="Monthly claim volume with 3-month rolling average"
        description="Bars = claims vetted that month. Yellow line = 3-mo smoothed momentum. Dashed line = Jan-2025 regime change."
        info="Monthly volume of vetted claims with a 3-month centred rolling average to smooth noise. The reference line marks the Jan-2025 vetting-manager change."
        formula="bar = count(*) per month(vettedDate); line = avg(bar) over current ± 1 month"
        source="vettedDate"
        rangeLabel={range}
        loading={trend.isLoading}
        bodyClassName="h-[300px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trendData}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="date" type="number" domain={['dataMin', 'dataMax']} scale="time"
                   tickFormatter={(v) => fmtMonth(new Date(v))} />
            <YAxis />
            <Tooltip labelFormatter={(v) => fmtMonth(new Date(v as number))} formatter={(v: any) => fmtInt(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="vetted" name="Claims vetted" fill="rgba(252,176,38,0.55)" />
            <Line type="monotone" dataKey="roll3" name="3-mo rolling avg" stroke={JCB.yellow} strokeWidth={2.5} dot={false} />
            <RegimeLine xValue={REGIME_DATE_MS} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ===== Row 4: Top movers + Tag sparkline strip ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Top movers · last 90 days vs previous 90"
          description="Biggest claim-volume shifts. Negative is good (fewer claims)."
          info="For each value of the selected dimension (Area / Tag / Model / Supplier), compares the claim count in the last 90 days against the previous 90 days. Anchored to the latest vettedDate in the data so the comparison is always meaningful."
          formula="count(*) in [max-90d, max] minus count(*) in [max-180d, max-90d]"
          source="vettedDate + selected dimension field"
          rangeLabel={range}
          loading={movers.isLoading}
          right={
            <Tabs value={moversDim} onValueChange={(v) => setMoversDim(v as any)}>
              <TabsList className="h-7">
                <TabsTrigger value="area" className="text-[10px] py-0.5">Area</TabsTrigger>
                <TabsTrigger value="tag" className="text-[10px] py-0.5">Tag</TabsTrigger>
                <TabsTrigger value="model" className="text-[10px] py-0.5">Model</TabsTrigger>
                <TabsTrigger value="supplier" className="text-[10px] py-0.5">Supplier</TabsTrigger>
              </TabsList>
            </Tabs>
          }
          bodyClassName="max-h-[380px] overflow-auto p-0"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{moversDim}</TableHead>
                <TableHead className="text-right">Prior 90d</TableHead>
                <TableHead className="text-right">Last 90d</TableHead>
                <TableHead className="text-right">Δ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movers.data?.rows || []).slice(0, 15).map((r: any) => (
                <TableRow key={r.value}>
                  <TableCell className="text-xs truncate max-w-[220px]">
                    <button className="hover:text-jcb-yellow text-left" onClick={() => addFilter(moversDim === 'tag' ? 'tags' : moversDim as keyof Filters, r.value)}>{r.value}</button>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{fmtInt(r.prior)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmtInt(r.current)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={cn('inline-flex items-center gap-0.5 text-xs', r.delta > 0 ? 'text-red-300' : 'text-emerald-300')}>
                      {r.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {r.delta >= 0 ? '+' : ''}{fmtInt(r.delta)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ChartCard>

        <ChartCard
          title="Symptom sparklines · top 8 tags"
          description="Each strip = monthly mentions of a tag. Number = total · arrow = recent 3-mo vs previous 3-mo momentum."
          info="Top 8 description tags with a 24-month sparkline + a momentum percentage = (sum last 3 months - sum previous 3 months) / sum previous 3 months. Strong positive momentum across many tags = a broad rise; concentrated on one tag = a focused issue."
          formula="per tag: count(*) GROUP BY month(vettedDate); momentum = (last3 − prev3) / prev3"
          source="descriptionTags, vettedDate"
          rangeLabel={range}
          loading={sparkTags.isLoading}
          className="lg:col-span-2"
          bodyClassName="overflow-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {(sparkTags.data || []).map((t: any) => {
              const values = t.points.map((p: any) => p.n);
              return (
                <div key={t.tag} className="flex items-center justify-between gap-3 rounded-md hover:bg-jcb-surface px-2 py-1.5 cursor-pointer"
                     onClick={() => addFilter('tags', t.tag)}>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate text-jcb-yellow">{t.tag}</div>
                    <div className="text-[10px] text-muted-foreground">{fmtInt(t.total)} total · {fmtInt(t.last3)} last 3 mo</div>
                  </div>
                  <Sparkline values={values} width={120} height={28} />
                  <div className="w-14 text-right">
                    <span className={cn(
                      'inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
                      t.momentum > 0.1 ? 'text-red-300' : t.momentum < -0.1 ? 'text-emerald-300' : 'text-muted-foreground'
                    )}>
                      {t.momentum > 0 ? '+' : ''}{(t.momentum * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* ===== Row 5: Pareto + Model + DOA cohort ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Failure-area Pareto"
          description="Click a bar to filter."
          info="Pareto chart: the vital few production areas that drive the majority of warranty claims. Line shows cumulative share so you can see where the 80/20 cut sits."
          formula="bars = count(*) GROUP BY area; line = running cumulative bar / total"
          source="area"
          rangeLabel={range}
          loading={byArea.isLoading}
          bodyClassName="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={(byArea.data || []).slice(0, 15)}>
              <CartesianGrid stroke="#1a1a1a" />
              <XAxis dataKey="area" interval={0} angle={-35} textAnchor="end" height={90} tick={{ fontSize: 9 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
              <Tooltip formatter={(v: any, n: any) => n === 'cumPct' ? fmtPct(v) : fmtInt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="n" name="Claims" fill={JCB.yellow} cursor="pointer"
                onClick={(d: any) => addFilter('area', d.area)} />
              <Line yAxisId="right" type="monotone" dataKey="cumPct" name="Cumulative %" stroke={JCB.yellow2} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Model league · claims + DOA rate"
          info="Top 12 models by claim volume. Red line overlays DOA rate so high-volume + high-DOA models surface immediately."
          formula="bars = count(*) GROUP BY machineModel; line = count(tPeriod=='DOA') / count(*)"
          source="machineModel, tPeriod"
          rangeLabel={range}
          loading={byModel.isLoading}
          bodyClassName="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={(byModel.data || []).slice(0, 12)}>
              <CartesianGrid stroke="#1a1a1a" />
              <XAxis dataKey="model" angle={-25} textAnchor="end" interval={0} height={70} tick={{ fontSize: 9 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
              <Tooltip formatter={(v: any, n: any) => (n === 'doaRate' ? fmtPct(v) : fmtInt(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="n" name="Claims" fill={JCB.yellow} cursor="pointer"
                onClick={(d: any) => addFilter('model', d.model)} />
              <Line yAxisId="right" type="monotone" dataKey="doaRate" name="DOA rate" stroke={JCB.red} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="DOA rate by build cohort"
          description="DOA % per machine-build month."
          info="DOA share for every batch of machines built in a given month. Recent cohorts inflate because tail T-periods haven't materialised yet (see the Build-date tab for a mature-only toggle)."
          formula="count(tPeriod=='DOA') / count(*)  GROUP BY month(buildDate)"
          source="buildDate, tPeriod"
          rangeLabel={range}
          loading={cohort.isLoading}
          bodyClassName="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={(cohort.data || []).map((r: any) => ({ ...r, ts: +new Date(r.date) }))}>
              <CartesianGrid stroke="#1a1a1a" />
              <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(v) => fmtMonth(new Date(v))} />
              <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
              <Tooltip labelFormatter={(v) => fmtMonth(new Date(v as number))} formatter={(v: any) => fmtPct(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="doaRate" name="DOA rate" stroke={JCB.red} fill={JCB.red} fillOpacity={0.15} strokeWidth={2} />
              <RegimeLine />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ===== Row 6: Live activity + Geography + Top parts ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Live activity · 14 most recent vetted claims"
          description="Click any row to drill into the claim detail."
          info="The 14 most recent claims by vettedDate. Coloured dot = outcome category. Each row shows claim number, model, area, country, a description excerpt, and any NLP tags. Click any row to open the claim detail drawer."
          formula="ORDER BY vettedDate DESC LIMIT 14"
          source="claims (full document)"
          rangeLabel={range}
          loading={activity.isLoading}
          bodyClassName="max-h-[420px] overflow-auto p-0"
        >
          <div className="divide-y divide-jcb-border/50">
            {(activity.data || []).map((r: any) => {
              const colour = OUTCOME_COLORS[r.claimOutcome] || '#888';
              return (
                <div key={r._id} className="flex items-start gap-2 px-3 py-2 hover:bg-jcb-surface cursor-pointer"
                     onClick={() => window.dispatchEvent(new CustomEvent('wty:open-claim', { detail: r._id }))}>
                  <div className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ background: colour }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-jcb-yellow">{r._id}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{fmtDate(r.vettedDate)}</span>
                    </div>
                    <div className="text-[11px] text-foreground truncate">{r.machineModel} · {r.area} · {r.country}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{(r.description || '').slice(0, 140)}</div>
                    {(r.descriptionTags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.descriptionTags.slice(0, 4).map((t: string) => (
                          <span key={t} className="rounded px-1 py-0 text-[9px] bg-jcb-yellow/15 text-jcb-yellow/90">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard
          title="Top countries · claims + accept rate"
          description="Bar = claims · dot = accept rate. Click to filter."
          info="Top 12 countries by claim count. Bar length = claim volume. Click any bar to add that country to the global filter."
          formula="count(*), count(Accept)/count(vetted) GROUP BY country  ORDER BY count DESC LIMIT 12"
          source="country, claimOutcome"
          rangeLabel={range}
          loading={byCountry.isLoading}
          bodyClassName="h-[420px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={(byCountry.data || []).slice(0, 12)} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid stroke="#1a1a1a" />
              <XAxis type="number" />
              <YAxis dataKey="country" type="category" width={110} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any, n: any) => (n === 'acceptRate' ? fmtPct(v) : fmtInt(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="n" name="Claims" fill={JCB.yellow} cursor="pointer" onClick={(d: any) => addFilter('country', d.country)}>
                {(byCountry.data || []).slice(0, 12).map((_: any, i: number) => (
                  <Cell key={i} fill={JCB.yellow} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Top 15 failed parts"
          description="By claim volume. Accept-rate badge highlights low-accept parts (supplier-quality flag)."
          info="Top 15 parts by claim count. Each row shows the part number, claim count, and the accept-rate badge (red < 70 %, amber 70-85 %, green >= 85 %). Low accept rate on a high-volume part = supplier-quality investigation."
          formula="count(*), count(Accept)/count(vetted) GROUP BY failedPart  ORDER BY count DESC LIMIT 15"
          source="failedPart, claimOutcome"
          rangeLabel={range}
          loading={topParts.isLoading}
          bodyClassName="max-h-[420px] overflow-auto p-0"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead className="text-right">Claims</TableHead>
                <TableHead className="text-right">Accept</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(topParts.data || []).map((r: any) => (
                <TableRow key={r.failedPart}>
                  <TableCell className="font-mono text-[11px] max-w-[220px] truncate" title={r.failedPart}>{r.failedPart}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{fmtInt(r.n)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge variant={r.acceptRate < 0.7 ? 'bad' : r.acceptRate < 0.85 ? 'warn' : 'good'}>{fmtPct(r.acceptRate)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ChartCard>
      </div>

      {/* ===== Row 7: jump-off CTA strip ===== */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Drill deeper:</span>
            <CTA>Build-date · batch hunt</CTA>
            <CTA>Vetting &amp; regime</CTA>
            <CTA>Operations · PDI escape</CTA>
            <CTA>People &amp; places</CTA>
            <CTA>Description NLP</CTA>
            <CTA>Full report</CTA>
            <ArrowRight className="h-3 w-3 text-jcb-yellow ml-1" />
            <span className="text-[11px] text-muted-foreground">switch tabs above</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CTA({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-jcb-border bg-jcb-ink px-2 py-1 text-foreground hover:border-jcb-yellow/40">{children}</span>;
}

function RegimeMini({ label, total, mix, accent }: { label: string; total: number; mix: Record<string, number>; accent: 'muted' | 'warn' }) {
  const acc = (mix['Accept'] || 0) / Math.max(1, total);
  const data = donutFromMix(mix);
  return (
    <div className={cn('rounded-md p-3 border', accent === 'warn' ? 'border-jcb-yellow/30 bg-jcb-yellow/5' : 'border-jcb-border bg-jcb-ink')}>
      <div className="flex items-center justify-between">
        <div>
          <div className={cn('text-[10px] uppercase tracking-widest', accent === 'warn' ? 'text-jcb-yellow' : 'text-muted-foreground')}>{label}-2025</div>
          <div className="text-xs text-muted-foreground">n = {fmtInt(total)}</div>
        </div>
        <Donut data={data} size={68} thickness={10} centerValue={fmtPct(acc, 0)} centerLabel="acc" />
      </div>
    </div>
  );
}

function donutFromMix(mix: Record<string, number>) {
  return Object.entries(mix)
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => ({ label: k, value: v as number, color: OUTCOME_COLORS[k] || '#888' }));
}

function yearColor(i: number) {
  const palette = ['#525252', '#FCB026', '#22C55E', '#60A5FA', '#A78BFA', '#F472B6'];
  return palette[i % palette.length];
}
