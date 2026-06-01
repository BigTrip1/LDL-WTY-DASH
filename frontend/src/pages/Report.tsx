import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ComposedChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { Printer, FileText, Calendar, Loader2, Info, BookOpen } from 'lucide-react';
import { TooltipProvider, Tooltip as UiTooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { endpoints, type Filters } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import RegimeLine from '@/components/charts/RegimeLine';
import CohortPeriodLines from '@/components/charts/CohortPeriodLines';
import { RECHARTS_TOOLTIP_PROPS } from '@/components/charts/rechartsTooltip';
import { chartMixedTooltip, formatCohortRateTooltip, TPERIOD_GROUP_FORMULA } from '@/lib/tPeriodGroups';
import Sparkline from '@/components/charts/Sparkline';
import Donut from '@/components/charts/Donut';
import { JCB, OUTCOME_COLORS, fmtInt, fmtPct, fmtMonth, fmtDate } from '@/lib/utils';
import QuickRanges from '@/components/QuickRanges';

const MOY = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Range { from?: string; to?: string }

export default function Report() {
  const [draft, setDraft] = useState<Range>({});
  const [applied, setApplied] = useState<Range | null>(null);

  const filters: Filters = applied || {};
  const enabled = applied !== null;

  const meta = useQuery({ queryKey: ['meta-report'], queryFn: () => endpoints.meta() });
  const kpis = useQuery({ queryKey: ['rep-kpis', filters], queryFn: () => endpoints.kpis(filters), enabled });
  const headlines = useQuery({ queryKey: ['rep-headlines', filters], queryFn: () => endpoints.headlines(filters), enabled });
  const trend = useQuery({ queryKey: ['rep-trend', filters], queryFn: () => endpoints.trend(filters), enabled });
  const yoy = useQuery({ queryKey: ['rep-yoy', filters], queryFn: () => endpoints.yoy(filters), enabled });
  const regime = useQuery({ queryKey: ['rep-regime', filters], queryFn: () => endpoints.regimeImpact(filters), enabled });
  const monthly = useQuery({ queryKey: ['rep-monthly', filters], queryFn: () => endpoints.outcomeMonthly(filters), enabled });
  const byModel = useQuery({ queryKey: ['rep-bymodel', filters], queryFn: () => endpoints.byModel(filters), enabled });
  const byArea = useQuery({ queryKey: ['rep-byarea', filters], queryFn: () => endpoints.byArea(filters), enabled });
  const topParts = useQuery({ queryKey: ['rep-topparts', filters], queryFn: () => endpoints.topParts(filters, 25), enabled });
  const bySupp = useQuery({ queryKey: ['rep-bysupp', filters], queryFn: () => endpoints.bySupplier(filters, 20), enabled });
  const byCountry = useQuery({ queryKey: ['rep-bycountry', filters], queryFn: () => endpoints.byCountry(filters), enabled });
  const claimCohort = useQuery({ queryKey: ['rep-claim-cohort', filters], queryFn: () => endpoints.claimCohort(filters), enabled });
  const score = useQuery({ queryKey: ['rep-score', filters], queryFn: () => endpoints.vetterScorecard(filters), enabled });
  const pdi = useQuery({ queryKey: ['rep-pdi', filters], queryFn: () => endpoints.pdiEscape(filters), enabled });
  const cd = useQuery({ queryKey: ['rep-cd', filters], queryFn: () => endpoints.cannotDetectTrend(filters), enabled });
  const asd = useQuery({ queryKey: ['rep-asd', filters], queryFn: () => endpoints.byAsd(filters), enabled });
  const ttv = useQuery({ queryKey: ['rep-ttv', filters], queryFn: () => endpoints.timeToVet(filters), enabled });
  const season = useQuery({ queryKey: ['rep-season', filters], queryFn: () => endpoints.seasonality(filters), enabled });
  const zd = useQuery({ queryKey: ['rep-zd', filters], queryFn: () => endpoints.zcodeDrivers(filters), enabled });
  const recid = useQuery({ queryKey: ['rep-recid', filters], queryFn: () => endpoints.serialRecidivism(filters, 5, 15), enabled });
  const dealers = useQuery({ queryKey: ['rep-dealers', filters], queryFn: () => endpoints.byDealer(filters, 20), enabled });
  const customers = useQuery({ queryKey: ['rep-customers', filters], queryFn: () => endpoints.byCustomer(filters, 20), enabled });
  const tags = useQuery({ queryKey: ['rep-tags', filters], queryFn: () => endpoints.descriptionTags(filters), enabled });
  const bigrams = useQuery({ queryKey: ['rep-bi', filters], queryFn: () => endpoints.descriptionNgrams(filters, 2, 30), enabled });
  const anom = useQuery({ queryKey: ['rep-anom', filters], queryFn: () => endpoints.anomalies(filters), enabled });

  const allQueries = [
    kpis, headlines, trend, yoy, regime, monthly, byModel, byArea, topParts, bySupp,
    byCountry, claimCohort, score, pdi, cd, asd, ttv, season, zd, recid, dealers, customers,
    tags, bigrams, anom
  ];
  const loaded = allQueries.filter(q => q.isSuccess).length;
  const loading = allQueries.filter(q => q.isLoading).length;
  const total = allQueries.length;
  const ready = enabled && loading === 0;

  // hooks below MUST run on every render — never put a hook after a conditional return
  const trendData = useMemo(() => {
    if (!trend.data) return [];
    return (trend.data.vetted || []).map((r: any) => ({ ts: +new Date(r.date), n: r.n }));
  }, [trend.data]);

  const yoyChart = useMemo(() => {
    const rows = yoy.data || [];
    const years = (Array.from(new Set(rows.map((r: any) => r.year))) as number[]).sort((a, b) => a - b);
    const byMonth = new Map<number, any>();
    for (let m = 1; m <= 12; m++) byMonth.set(m, { monthLabel: MOY[m] });
    for (const r of rows) byMonth.get(r.month)![`y${r.year}`] = r.n;
    return { years, data: Array.from(byMonth.values()) };
  }, [yoy.data]);

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

  // ----- Setup screen (range picker) -----
  if (!applied) {
    const minD = meta.data?.dateRange?.minVetted ? String(meta.data.dateRange.minVetted).slice(0, 10) : '';
    const maxD = meta.data?.dateRange?.maxVetted ? String(meta.data.dateRange.maxVetted).slice(0, 10) : '';
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 no-print">
        <div className="text-center mb-8">
          <FileText className="h-12 w-12 text-jcb-yellow mx-auto mb-3" />
          <h1 className="text-3xl font-black tracking-tight">Generate PDF report</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Pick a date range, generate a printable report with every chart, then use your browser's
            <strong className="text-jcb-yellow"> Save as PDF</strong> action from the print dialog.
          </p>
        </div>
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <div className="text-xs text-muted-foreground mb-2">Quick ranges</div>
              <QuickRanges
                active={{ from: draft.from, to: draft.to }}
                onPick={(v) => setDraft({ from: v.from, to: v.to })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> From
                </div>
                <Input type="date" value={draft.from || ''} min={minD} max={maxD}
                  onChange={(e) => setDraft({ ...draft, from: e.target.value })} className="h-9" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> To
                </div>
                <Input type="date" value={draft.to || ''} min={minD} max={maxD}
                  onChange={(e) => setDraft({ ...draft, to: e.target.value })} className="h-9" />
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground rounded-md border border-jcb-border bg-jcb-ink p-3">
              <strong className="text-foreground">Data window available:</strong> {minD || '–'} → {maxD || '–'}.
              Leave both fields blank to include <strong>all data</strong>. Filters by <code>vettedDate</code>.
            </div>
            <div className="rounded-md border border-jcb-border bg-jcb-ink/50 p-3">
              <div className="text-[10px] uppercase tracking-widest text-jcb-yellow mb-2 flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> The report will contain
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {REPORT_SECTIONS.map(s => (
                  <li key={s.n}>§{s.n} · {s.title}</li>
                ))}
              </ul>
              <div className="mt-2 text-[10px] text-muted-foreground">
                Click <strong className="text-foreground">Generate report</strong> to fire ~25 queries against your chosen date range, then use <strong className="text-foreground">Print / Save as PDF</strong> to produce the PDF.
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setApplied(draft)} className="flex-1">
                Generate report
              </Button>
              <Button variant="outline" onClick={() => setDraft({})}>Reset</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const k = kpis.data || ({} as any);
  const rangeText = applied!.from || applied!.to
    ? `${applied!.from || '…'} → ${applied!.to || '…'}`
    : 'All data';

  return (
    <div className="report-root mx-auto max-w-[1600px] px-6 py-8 flex gap-6">
      <ReportTOC />
      <div className="flex-1 min-w-0">
      {/* Action bar (hidden in print) */}
      <div className="no-print sticky top-[57px] z-30 flex flex-wrap items-center justify-between gap-3 bg-black/90 backdrop-blur border-b border-jcb-border -mx-6 px-6 py-3 mb-6">
        <div className="flex items-center gap-2 text-xs">
          <FileText className="h-4 w-4 text-jcb-yellow" />
          <span className="text-muted-foreground">Range:</span>
          <span className="font-medium">{rangeText}</span>
          {!ready && (
            <span className="ml-3 inline-flex items-center gap-1 text-jcb-yellow">
              <Loader2 className="h-3 w-3 animate-spin" /> loading {loaded}/{total}…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={() => setApplied(null)}>
            Change range
          </Button>
          <Button size="sm" className="h-8" onClick={() => window.print()} disabled={!ready}>
            <Printer className="h-3 w-3" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* ===== Report content ===== */}
      <header className="report-header mb-8 pb-6 border-b border-jcb-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center h-10 w-16 rounded-sm bg-jcb-yellow text-black font-black tracking-tighter">WTY</div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-jcb-yellow">JCB · LDL Division · Claims Intelligence</div>
            <h1 className="text-3xl font-black tracking-tight">Warranty Claims Report</h1>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-xs mt-4">
          <div><span className="text-muted-foreground">Date range:</span> <span className="font-medium">{rangeText}</span></div>
          <div><span className="text-muted-foreground">Generated:</span> <span className="font-medium">{new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC</span></div>
          <div><span className="text-muted-foreground">Total claims in range:</span> <span className="font-medium">{fmtInt(k.total)}</span></div>
        </div>
      </header>

      {/* §1 KPI summary */}
      <Section n={1} title="Headline KPIs" summary="Eight top-level metrics for the chosen date range. Z-Code is treated as a non-accept in the True Accept Rate.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiBox label="Total claims" value={fmtInt(k.total)} info="Every row in the claims collection within the selected date range." />
          <KpiBox label="True Accept rate" value={fmtPct(k.acceptRate)} accent="green" info="count(claimOutcome=='Accept') / count(claimOutcome!=null). Z-Code is excluded from the numerator." />
          <KpiBox label="Reject rate" value={fmtPct(k.rejectRate)} accent="red" info="count(claimOutcome=='Reject') / count(claimOutcome!=null). Climbing post-Jan 2025 reflects the new vetting regime." />
          <KpiBox label="Z-Code rate" value={fmtPct(k.zcodeRate)} accent="yellow" info="Z-Code = goodwill payment. NOT counted as an accept in the True Accept Rate." />
          <KpiBox label="DOA rate" value={fmtPct(k.doaRate)} accent="red" info="Dead-on-arrival rate. count(tPeriod=='DOA') / count(*)." />
          <KpiBox label="Pending vets" value={fmtInt(k.pending)} info="Claims with no claimOutcome yet - the live vetting backlog." />
          <KpiBox label="Avg hours-to-fail" value={Math.round(k.avgHours ?? 0).toLocaleString()} info="Mean machine operating hours at time of claim. '#' placeholders and >20,000 hr outliers are dropped at ingest." />
          <KpiBox label="Active models" value={fmtInt(k.activeModels)} info="Distinct machineModel values appearing in the selected range." />
        </div>
      </Section>

      {/* §2 Auto headlines */}
      {(headlines.data || []).length > 0 && (
        <Section n={2} title="Auto-generated headlines" summary="Rule-based narrative cards generated from hard-coded thresholds (regime impact, top failed part, worst-DOA family, recidivism, PDI escape, dominant tag, Cannot-Detect surge). No AI.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(headlines.data || []).map((h: any, i: number) => (
              <div key={i} className={`rounded-md border p-3 ${
                h.kind === 'bad' ? 'border-red-400/40 bg-red-500/5'
                : h.kind === 'warn' ? 'border-jcb-yellow/40 bg-jcb-yellow/5'
                : 'border-jcb-border bg-jcb-surface'}`}>
                <div className={`text-[10px] uppercase tracking-widest font-bold ${
                  h.kind === 'bad' ? 'text-red-300' : h.kind === 'warn' ? 'text-jcb-yellow' : 'text-sky-300'}`}>{h.title}</div>
                <div className="mt-1 text-xs">{h.body}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* §3 Trend + YoY */}
      <Section n={3} title="Temporal trends" summary="How claim volume evolved month by month and year over year. The dashed line marks the Jan-2025 vetting regime change.">
        <ReportChart title="Monthly claim volume (vetted)">
          <ComposedChart data={trendData}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(v) => fmtMonth(new Date(v))} />
            <YAxis />
            <Tooltip labelFormatter={(v) => fmtMonth(new Date(v as number))} formatter={(v: any) => fmtInt(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="n" name="Claims vetted" fill={JCB.yellow} />
            <RegimeLine />
          </ComposedChart>
        </ReportChart>

        <ReportChart title="Year-on-year clustered bars">
          <BarChart data={yoyChart.data}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="monthLabel" />
            <YAxis />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {yoyChart.years.map((y: number, i: number) => (
              <Bar key={y} dataKey={`y${y}`} name={`${y}`} fill={yearColor(i)} />
            ))}
          </BarChart>
        </ReportChart>
      </Section>

      {/* §4 Vetting regime */}
      <Section n={4} title="Vetting regime impact (Jan 2025 inflection)" summary="Pre- vs post-Jan-2025 outcome mix. Use the delta column to size the policy effect. New vetting manager took over Jan 2025.">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <KpiBox label="n pre-2025" value={fmtInt(regime.data?.preTotal)} info="Total vetted claims with a claimOutcome before 2025-01-01." />
          <KpiBox label="n post-2025" value={fmtInt(regime.data?.postTotal)} info="Total vetted claims with a claimOutcome on or after 2025-01-01." />
        </div>
        <ReportTable>
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
            {(regime.data?.rows || []).map((r: any) => (
              <TableRow key={r.outcome}>
                <TableCell><span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: OUTCOME_COLORS[r.outcome] || '#888' }} />
                  {r.outcome}
                </span></TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.preN)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(r.prePct)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.postN)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(r.postPct)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <Badge variant={r.deltaPp > 0.5 ? 'bad' : r.deltaPp < -0.5 ? 'good' : 'ghost'}>{r.deltaPp >= 0 ? '+' : ''}{r.deltaPp.toFixed(1)} pp</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTable>

        <ReportChart title="Monthly outcome mix">
          <BarChart data={monthlyChart}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(v) => fmtMonth(new Date(v))} />
            <YAxis />
            <Tooltip labelFormatter={(v) => fmtMonth(new Date(v as number))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {outcomeKeys.map(o => <Bar key={o} dataKey={o} stackId="a" fill={OUTCOME_COLORS[o] || '#888'} />)}
            <RegimeLine />
          </BarChart>
        </ReportChart>
      </Section>

      {/* §5 Pareto & Root cause */}
      <Section n={5} title="Pareto & root-cause" summary="The vital few areas, models and parts that drive most claims. Cumulative-% line shows where the 80/20 cut sits.">
        <ReportChart title="Failure-area Pareto (top 15)">
          <ComposedChart data={(byArea.data || []).slice(0, 15)}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="area" interval={0} angle={-30} textAnchor="end" height={90} tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="n" name="Claims" fill={JCB.yellow} />
            <Line yAxisId="right" type="monotone" dataKey="cumPct" name="Cumulative %" stroke={JCB.yellow2} dot={false} strokeWidth={2} />
          </ComposedChart>
        </ReportChart>

        <ReportChart title="Model league · DOA + T1 + T3 + T6">
          <ComposedChart data={(byModel.data || []).slice(0, 12)}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="model" interval={0} angle={-25} textAnchor="end" height={70} tick={{ fontSize: 9 }} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
            <Tooltip {...RECHARTS_TOOLTIP_PROPS} formatter={(v: any, n: any) => chartMixedTooltip(v, n)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="n" name="Claims" fill={JCB.yellow} />
            <CohortPeriodLines yAxisId="right" lineType="linear" />
          </ComposedChart>
        </ReportChart>

        <H3>Top 25 failed parts</H3>
        <ReportTable>
          <TableHeader><TableRow>
            <TableHead>Part</TableHead><TableHead>Supplier</TableHead>
            <TableHead className="text-right">Claims</TableHead><TableHead className="text-right">Accept</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(topParts.data || []).map((r: any) => (
              <TableRow key={r.failedPart}>
                <TableCell className="font-mono text-[11px]">{r.failedPart}</TableCell>
                <TableCell className="text-xs">{r.supplier}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                <TableCell className="text-right"><Badge variant={r.acceptRate < 0.7 ? 'bad' : r.acceptRate < 0.85 ? 'warn' : 'good'}>{fmtPct(r.acceptRate)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTable>
      </Section>

      {/* §6 Claim cohort */}
      <Section n={6} title="Claim cohort (vetted month)" summary="Share of claims in each T-period group by month vetted: DOA; T1 (T000+T001); T3 (T002+T003); T6 (T004–T006). Build-month cohorts are on the Build-date tab.">
        <ReportChart title="Claim cohort · DOA + T1 + T3 + T6">
          <ComposedChart data={(claimCohort.data || []).map((r: any) => ({ ...r, ts: +new Date(r.date) }))}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(v) => fmtMonth(new Date(v))} />
            <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
            <Tooltip
              {...RECHARTS_TOOLTIP_PROPS}
              labelFormatter={(v) => fmtMonth(new Date(v as number))}
              formatter={(v: any, name: any) => formatCohortRateTooltip(v, name)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <CohortPeriodLines />
            <RegimeLine />
          </ComposedChart>
        </ReportChart>
      </Section>

      {/* §7 Operations */}
      <Section n={7} title="Operations · PDI escape, Cannot Detect, ASD, Z-Code, seasonality" summary="Production-side metrics: how the inline detection points performed, where vetting policy used 'Cannot Detect', who owns the work, when goodwill payments are made, and seasonality in claim volume.">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <KpiBox label="PDI / UV escape rate" value={fmtPct(pdi.data?.escapeRate)} accent="red" info="Share of claims tagged with a PDI/UV detection point - i.e. the issue should have been caught in production." />
          <KpiBox label="ASD splits" value={fmtInt((asd.data || []).length)} info="Distinct ASD (department-ownership) buckets present in the data. Usually Assembly / Supplier Internal / Supplier External / Design / Unknown." />
          <KpiBox label="Z-Codes (total)" value={fmtInt(zd.data?.total)} accent="yellow" info="Total goodwill payments (Z-Code outcomes) in the selected range." />
        </div>

        <ReportChart title="Cannot-Detect share over time">
          <ComposedChart data={(cd.data || []).map((r: any) => ({ ...r, ts: +new Date(r.date) }))}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(v) => fmtMonth(new Date(v))} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 0.5]} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="cannotDetect" name="Cannot-Detect (n)" fill={JCB.yellow} />
            <Line yAxisId="right" type="monotone" dataKey="rate" name="Share" stroke={JCB.red} dot={false} strokeWidth={2} />
            <RegimeLine />
          </ComposedChart>
        </ReportChart>

        <H3>ASD split</H3>
        <ReportTable>
          <TableHeader><TableRow>
            <TableHead>ASD</TableHead><TableHead className="text-right">Claims</TableHead>
            <TableHead className="text-right">Reject</TableHead><TableHead className="text-right">Z-Code</TableHead><TableHead className="text-right">Accept</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(asd.data || []).map((r: any) => (
              <TableRow key={r.asd}>
                <TableCell className="font-medium">{r.asd}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(r.rejectRate)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(r.zcodeRate)}</TableCell>
                <TableCell className="text-right"><Badge variant={r.acceptRate < 0.7 ? 'bad' : r.acceptRate < 0.85 ? 'warn' : 'good'}>{fmtPct(r.acceptRate)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTable>

        <H3>Seasonality</H3>
        <div className="grid grid-cols-2 gap-4">
          <ReportChart title="Day-of-week activity" height={220}>
            <BarChart data={(season.data?.dayOfWeek || [])}>
              <CartesianGrid stroke="#1a1a1a" />
              <XAxis dataKey="day" /><YAxis />
              <Tooltip /><Bar dataKey="n" fill={JCB.yellow} />
            </BarChart>
          </ReportChart>
          <ReportChart title="Month-of-year activity" height={220}>
            <BarChart data={(season.data?.monthOfYear || [])}>
              <CartesianGrid stroke="#1a1a1a" />
              <XAxis dataKey="month" /><YAxis />
              <Tooltip /><Bar dataKey="n" fill={JCB.yellow} />
            </BarChart>
          </ReportChart>
        </div>
      </Section>

      {/* §8 Vetters */}
      <Section n={8} title="Vetter scorecard" summary="Per-vetter throughput and outcome distribution. Accept rate badge: red < 70 %, amber 70-85 %, green ≥ 85 %.">
        <ReportTable>
          <TableHeader><TableRow>
            <TableHead>Vetter</TableHead>
            <TableHead className="text-right">Vetted</TableHead>
            <TableHead className="text-right">Reject</TableHead>
            <TableHead className="text-right">Z-Code</TableHead>
            <TableHead className="text-right">Avg days to vet</TableHead>
            <TableHead className="text-right">Accept</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(score.data || []).map((r: any) => (
              <TableRow key={r.vetter}>
                <TableCell className="font-medium">{r.vetter}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(r.rejectRate)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(r.zcodeRate)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.avgDaysToVet != null ? r.avgDaysToVet.toFixed(1) : '–'}</TableCell>
                <TableCell className="text-right"><Badge variant={r.acceptRate < 0.7 ? 'bad' : r.acceptRate < 0.85 ? 'warn' : 'good'}>{fmtPct(r.acceptRate)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTable>
      </Section>

      {/* §9 People & Places */}
      <Section n={9} title="People & Places" summary="Recidivism (repeat-offender machines), dealer + customer scorecards, and country claim distribution.">
        <H3>Repeat-offender machines (top 15)</H3>
        <ReportTable>
          <TableHeader><TableRow>
            <TableHead>Serial</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Country</TableHead>
            <TableHead className="text-right">Claims</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(recid.data?.rows || []).map((r: any) => (
              <TableRow key={r.serial}>
                <TableCell className="font-mono text-xs">{r.serial}</TableCell>
                <TableCell className="text-xs">{r.machineModel}</TableCell>
                <TableCell className="text-xs">{r.country}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTable>

        <H3>Top dealers (by volume)</H3>
        <ReportTable>
          <TableHeader><TableRow>
            <TableHead>Dealer</TableHead>
            <TableHead className="text-right">Claims</TableHead>
            <TableHead className="text-right">Reject</TableHead>
            <TableHead className="text-right">Accept</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(dealers.data || []).map((r: any) => (
              <TableRow key={r.dealer}>
                <TableCell className="text-xs truncate max-w-[240px]" title={r.dealer}>{r.dealer}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(r.rejectRate)}</TableCell>
                <TableCell className="text-right"><Badge variant={r.acceptRate < 0.7 ? 'bad' : r.acceptRate < 0.85 ? 'warn' : 'good'}>{fmtPct(r.acceptRate)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTable>

        <H3>Top customers (excl. stock)</H3>
        <ReportTable>
          <TableHeader><TableRow>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Claims</TableHead>
            <TableHead className="text-right">Accept</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(customers.data || []).map((r: any) => (
              <TableRow key={r.customer}>
                <TableCell className="text-xs truncate max-w-[280px]" title={r.customer}>{r.customer}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                <TableCell className="text-right"><Badge variant={r.acceptRate < 0.7 ? 'bad' : r.acceptRate < 0.85 ? 'warn' : 'good'}>{fmtPct(r.acceptRate)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTable>

        <H3>Top countries (by volume)</H3>
        <ReportChart title="" height={300}>
          <BarChart data={(byCountry.data || []).slice(0, 15)} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis type="number" />
            <YAxis dataKey="country" type="category" width={110} tick={{ fontSize: 10 }} />
            <Tooltip /><Bar dataKey="n" fill={JCB.yellow} />
          </BarChart>
        </ReportChart>
      </Section>

      {/* §10 Supply */}
      <Section n={10} title="Supply chain" summary="Top 20 suppliers by claim volume with reject + accept rate. High reject% on a high-volume supplier is a supplier-quality investigation candidate.">
        <H3>Top 20 suppliers</H3>
        <ReportTable>
          <TableHeader><TableRow>
            <TableHead>Supplier</TableHead>
            <TableHead className="text-right">Claims</TableHead>
            <TableHead className="text-right">Reject</TableHead>
            <TableHead className="text-right">Accept</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(bySupp.data || []).map((r: any) => (
              <TableRow key={r.supplier}>
                <TableCell className="text-xs truncate max-w-[240px]">{r.supplier}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(r.rejectRate)}</TableCell>
                <TableCell className="text-right"><Badge variant={r.acceptRate < 0.7 ? 'bad' : r.acceptRate < 0.85 ? 'warn' : 'good'}>{fmtPct(r.acceptRate)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ReportTable>
      </Section>

      {/* §11 NLP */}
      <Section n={11} title="Description narrative (NLP)" summary="Symptom tags and bigrams extracted from claim descriptions by a deterministic regex tagger at ingest. No AI - the controlled vocab lives in backend/src/services/nlp.ts.">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <H3>Top symptom tags (top 15)</H3>
            <ReportTable>
              <TableHeader><TableRow><TableHead>Tag</TableHead><TableHead className="text-right">Mentions</TableHead></TableRow></TableHeader>
              <TableBody>
                {(tags.data || []).slice(0, 15).map((r: any) => (
                  <TableRow key={r.tag}>
                    <TableCell className="text-xs">{r.tag}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </ReportTable>
          </div>
          <div>
            <H3>Top 15 bigrams</H3>
            <ReportTable>
              <TableHeader><TableRow><TableHead>Bigram</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
              <TableBody>
                {(bigrams.data || []).slice(0, 15).map((r: any) => (
                  <TableRow key={r.token}>
                    <TableCell className="text-xs">{r.token}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </ReportTable>
          </div>
        </div>
      </Section>

      {/* §12 Data quality */}
      <Section n={12} title="Data quality" summary="Anomaly counters scoped to the chosen date range. The Data Quality dashboard tab has the same counters plus the drill-down grid.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiBox label="Total (filtered)" value={fmtInt(anom.data?.total)} info="Total rows in the selected date range." />
          <KpiBox label="Negative build→fail" value={fmtInt(anom.data?.negBuildToFail)} accent="red" info="failDate < buildDate. Data-entry error in the source system." />
          <KpiBox label="Missing fail date" value={fmtInt(anom.data?.missingFailDate)} accent="yellow" info="failDate is null. Expected on ~84 % of rows; field is optional upstream." />
          <KpiBox label="Missing claim date" value={fmtInt(anom.data?.missingClaimDate)} accent="yellow" info="claimDate is null. Same upstream cause as missing failDate." />
          <KpiBox label="Unvetted (Pending)" value={fmtInt(anom.data?.unvetted)} accent="yellow" info="claimOutcome is null - live vetting backlog." />
          <KpiBox label="Area = Unknown" value={fmtInt(anom.data?.unknownArea)} info="Vetter couldn't assign an area OR source field was empty. Single biggest reject driver." />
          <KpiBox label="Description truncated (=600)" value={fmtInt(anom.data?.descTruncated)} accent="yellow" info="description is exactly 600 chars (the source cap). Bigram counts on these rows are partial." />
          <KpiBox label="Theme mislabelled as outcome" value={fmtInt(anom.data?.themeAsOutcome)} accent="red" info="theme contains a decision value (e.g. 'Z Coded'). Auto-corrected on future ingest; existing rows visible in Operations -> Theme integrity audit." />
        </div>
      </Section>

      <footer className="mt-10 pt-6 border-t border-jcb-border text-[10px] text-muted-foreground">
        <p><strong>Limitations:</strong> Source CSV ships no cost / currency field — all monetary metrics omitted. <code>claimDate</code> / <code>failDate</code> populated on ~16 % of rows; primary timeline = <code>vettedDate</code>. <code>description</code> hard-capped at 600 chars in source export. Z-Code is treated as a non-accept in the True Accept Rate per the vetting team's KPI rule.</p>
        <p className="mt-2">Generated by WTY · Warranty Telehandler Yard. Date range filter applied to <code>vettedDate</code>.</p>
      </footer>
      </div>
    </div>
  );
}

function Section({ n, title, summary, children }: { n: number; title: string; summary?: string; children: React.ReactNode }) {
  return (
    <section id={`section-${n}`} className="mb-8 break-inside-avoid scroll-mt-20">
      <h2 className="text-lg font-bold text-jcb-yellow border-b border-jcb-border pb-1 mb-2">§{n} · {title}</h2>
      {summary && <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{summary}</p>}
      {children}
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">{children}</h3>;
}

function KpiBox({ label, value, accent = 'muted', info }: { label: string; value: any; accent?: 'green' | 'red' | 'yellow' | 'muted'; info?: string }) {
  const colour = accent === 'red' ? 'text-red-300' : accent === 'green' ? 'text-emerald-300' : accent === 'yellow' ? 'text-jcb-yellow' : 'text-foreground';
  return (
    <div className="rounded-md border border-jcb-border bg-jcb-ink p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
        <span className="truncate">{label}</span>
        {info && (
          <TooltipProvider delayDuration={120}>
            <UiTooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label={`What is ${label}?`} className="no-print text-muted-foreground/70 hover:text-jcb-yellow shrink-0">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-[260px] leading-relaxed">{info}</TooltipContent>
            </UiTooltip>
          </TooltipProvider>
        )}
      </div>
      <div className={`mt-1 text-xl font-black tabular-nums ${colour}`}>{value}</div>
    </div>
  );
}

const REPORT_SECTIONS: Array<{ n: number; title: string }> = [
  { n: 1, title: 'Headline KPIs' },
  { n: 2, title: 'Auto-generated headlines' },
  { n: 3, title: 'Temporal trends' },
  { n: 4, title: 'Vetting regime impact' },
  { n: 5, title: 'Pareto & root-cause' },
  { n: 6, title: 'Claim cohort' },
  { n: 7, title: 'Operations' },
  { n: 8, title: 'Vetter scorecard' },
  { n: 9, title: 'People & Places' },
  { n: 10, title: 'Supply chain' },
  { n: 11, title: 'Description NLP' },
  { n: 12, title: 'Data quality' }
];

function ReportTOC() {
  return (
    <nav className="no-print sticky top-24 hidden xl:block w-56 shrink-0 self-start">
      <div className="rounded-md border border-jcb-border bg-jcb-ink p-3">
        <div className="text-[10px] uppercase tracking-widest text-jcb-yellow mb-2 flex items-center gap-1">
          <BookOpen className="h-3 w-3" /> Contents
        </div>
        <ul className="space-y-1 text-[11px]">
          {REPORT_SECTIONS.map(s => (
            <li key={s.n}>
              <a href={`#section-${s.n}`} className="block text-muted-foreground hover:text-jcb-yellow truncate">
                §{s.n} {s.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function ReportChart({ title, children, height = 260 }: { title?: string; children: any; height?: number }) {
  return (
    <div className="my-3 break-inside-avoid">
      {title && <div className="text-xs font-semibold text-muted-foreground mb-1">{title}</div>}
      <div className="rounded-md border border-jcb-border bg-jcb-ink p-2" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ReportTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-jcb-border bg-jcb-ink overflow-hidden my-2 break-inside-avoid">
      <Table>{children}</Table>
    </div>
  );
}

function yearColor(i: number) {
  const palette = ['#525252', '#FCB026', '#22C55E', '#60A5FA', '#A78BFA', '#F472B6'];
  return palette[i % palette.length];
}
