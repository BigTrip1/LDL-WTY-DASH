import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line, Area, Legend } from 'recharts';
import { endpoints, type Filters } from '@/lib/api';
import ChartCard from '@/components/charts/ChartCard';
import RegimeLine from '@/components/charts/RegimeLine';
import CalendarHeatmap from '@/components/charts/CalendarHeatmap';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { JCB, fmtInt, fmtPct, fmtMonth, fmtDate, rangeLabel } from '@/lib/utils';

export default function OperationsTab({ filters, setFilters }: { filters: Filters; setFilters?: (f: Filters) => void }) {
  const addFilter = (key: keyof Filters, value: string) => {
    if (!setFilters) return;
    const cur = (filters[key] as string[] | undefined) ?? [];
    if (cur.includes(value)) return;
    setFilters({ ...filters, [key]: [...cur, value] });
  };
  const metaQ = useQuery({ queryKey: ['meta'], queryFn: () => endpoints.meta() });
  const range = rangeLabel(filters, metaQ.data);
  const pdi = useQuery({ queryKey: ['pdi-escape', filters], queryFn: () => endpoints.pdiEscape(filters) });
  const cd = useQuery({ queryKey: ['cannot-detect-trend', filters], queryFn: () => endpoints.cannotDetectTrend(filters) });
  const ttv = useQuery({ queryKey: ['ttv', filters], queryFn: () => endpoints.timeToVet(filters) });
  const asd = useQuery({ queryKey: ['by-asd', filters], queryFn: () => endpoints.byAsd(filters) });
  const z = useQuery({ queryKey: ['zcode-drivers', filters], queryFn: () => endpoints.zcodeDrivers(filters) });
  const theme = useQuery({ queryKey: ['theme-integrity', filters], queryFn: () => endpoints.themeIntegrity(filters) });
  const season = useQuery({ queryKey: ['season', filters], queryFn: () => endpoints.seasonality(filters) });
  const daily = useQuery({ queryKey: ['daily-heatmap', filters], queryFn: () => endpoints.dailyHeatmap(filters) });

  const cdData = useMemo(() => (cd.data || []).map((r: any) => ({ ...r, ts: +new Date(r.date) })), [cd.data]);
  const ttvData = useMemo(() => (ttv.data?.monthly || []).map((r: any) => ({ ...r, ts: +new Date(r.ym) })), [ttv.data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardContent className="p-5">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">PDI / UV escape rate</div>
          <div className="mt-1 text-3xl font-black tabular-nums">{fmtPct(pdi.data?.escapeRate)}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            <span className="text-foreground">{fmtInt(pdi.data?.escaped)}</span> of {fmtInt(pdi.data?.total)} claims were tagged with a PDI/UV detection point — meaning the issue <span className="text-jcb-yellow">should have been caught in production</span>.
          </div>
        </CardContent>
      </Card>

      <ChartCard
        title="Top PDI escape parts"
        info="Parts most often associated with claims whose detection was Ops PDI / UV / SIP / Cycle Test — meaning the issue should have been caught at one of those production checks."
        formula="count(*) GROUP BY failedPart WHERE detection IN (Ops Pdi, Operations PDI, UV, Uv1, Uv2, Booms SIP, Cycle Test)"
        source="failedPart, detection"
        rangeLabel={range}
        loading={pdi.isLoading}
        className="lg:col-span-2"
        bodyClassName="max-h-[280px] overflow-auto p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Escaped claims</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(pdi.data?.topParts || []).map((r: any) => (
              <TableRow key={r.failedPart}>
                <TableCell className="font-mono text-xs">{r.failedPart}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.supplier}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>

      <ChartCard
        title="‘Cannot Detect’ share over time"
        description="The new vetting regime made heavier use of the ‘Cannot Detect’ category — <1 % pre-Jan 2025 → 20 %+ post."
        info="For each month, the count + share of vetted claims tagged with detection='Cannot Detect'. A spike means more issues couldn't be traced back to a specific production check."
        formula="bar = count(detection=='Cannot Detect'); line = bar / count(*) per month"
        source="vettedDate, detection"
        rangeLabel={range}
        loading={cd.isLoading}
        className="lg:col-span-3"
        bodyClassName="h-[320px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={cdData}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(v) => fmtMonth(new Date(v))} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 0.5]} />
            <Tooltip labelFormatter={(v) => fmtMonth(new Date(v as number))}
              formatter={(v: any, n: any) => n === 'rate' ? fmtPct(v) : fmtInt(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="cannotDetect" name="Cannot Detect (n)" fill={JCB.yellow} />
            <Line yAxisId="right" type="monotone" dataKey="rate" name="Share of vetted" stroke={JCB.red} strokeWidth={2} dot={false} />
            <RegimeLine />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Time to vet · monthly average"
        description="Days from claimDate → vettedDate. Only the ~16 % of rows that have both dates contribute."
        info="Monthly average of (vettedDate − claimDate) in days, restricted to rows where both dates are present. Spikes indicate vetting backlogs; flat is consistent throughput."
        formula="avg(vettedDate - claimDate) in days, GROUP BY month(vettedDate)"
        source="claimDate, vettedDate"
        rangeLabel={range}
        loading={ttv.isLoading}
        className="lg:col-span-2"
        bodyClassName="h-[300px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={ttvData}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(v) => fmtMonth(new Date(v))} />
            <YAxis />
            <Tooltip labelFormatter={(v) => fmtMonth(new Date(v as number))} formatter={(v: any) => `${(v as number).toFixed(1)} days`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="avg" name="Avg days to vet" stroke={JCB.yellow} fill={JCB.yellow} fillOpacity={0.18} />
            <RegimeLine />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Time to vet · by vetter"
        info="Average days-to-vet per individual vetter. Badge red >10 days, amber 5-10, green <=5. Use to spot vetters with a building backlog vs steady throughput."
        formula="avg(vettedDate - claimDate) GROUP BY vettedBy"
        source="vettedBy, claimDate, vettedDate"
        rangeLabel={range}
        loading={ttv.isLoading}
        className="lg:col-span-1"
        bodyClassName="max-h-[300px] overflow-auto p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vetter</TableHead>
              <TableHead className="text-right">n</TableHead>
              <TableHead className="text-right">Avg days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(ttv.data?.byVetter || []).slice(0, 20).map((r: any) => (
              <TableRow key={r.vetter}>
                <TableCell className="text-xs">{r.vetter}</TableCell>
                <TableCell className="text-right tabular-nums text-xs">{fmtInt(r.n)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <Badge variant={r.avg > 10 ? 'bad' : r.avg > 5 ? 'warn' : 'good'}>{r.avg.toFixed(1)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>

      <ChartCard
        title="ASD ownership split"
        description="Assembly vs Supplier (Internal/External) vs Design. Accept rate last column."
        info="ASD is the department the vetter assigned the claim to. Watch the 'Unknown' bucket reject rate — uncategorisable claims are the single biggest reject driver in the dataset."
        formula="count + outcome rates GROUP BY asd"
        source="asd, claimOutcome"
        rangeLabel={range}
        loading={asd.isLoading}
        className="lg:col-span-2"
        bodyClassName="p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ASD</TableHead>
              <TableHead className="text-right">Claims</TableHead>
              <TableHead className="text-right">Reject</TableHead>
              <TableHead className="text-right">Z-Code</TableHead>
              <TableHead className="text-right">Accept</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(asd.data || []).map((r: any) => (
              <TableRow key={r.asd}>
                <TableCell className="text-xs font-medium">{r.asd}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(r.rejectRate)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(r.zcodeRate)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <Badge variant={r.acceptRate < 0.7 ? 'bad' : r.acceptRate < 0.85 ? 'warn' : 'good'}>{fmtPct(r.acceptRate)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>

      <ChartCard
        title="Z-Code drivers"
        description={`Where the ${fmtInt(z.data?.total)} goodwill payments concentrate.`}
        info="Among claims marked 'Z Code' (goodwill payment, not an accept), the top parts and top areas where these decisions concentrate. Useful for budget conversations and supplier negotiations."
        formula="count(*) GROUP BY (failedPart, area) WHERE claimOutcome='Z Code'"
        source="failedPart, area, claimOutcome"
        rangeLabel={range}
        loading={z.isLoading}
        className="lg:col-span-1"
      >
        <div className="grid grid-cols-1 gap-3">
          <ZBlock title="Top parts" rows={z.data?.parts} keyName="failedPart" />
          <ZBlock title="Top areas" rows={z.data?.areas} keyName="area" />
        </div>
      </ChartCard>

      <ChartCard
        title="Day-of-week vetting activity"
        info="Vetted-claim counts grouped by day of the week. Confirms whether vetting is concentrated Mon-Wed (typical) or spread across the week. Weekend bars near zero indicate manual review only - no automated ingest writes vettedDate."
        formula="count(*) GROUP BY dayOfWeek(vettedDate)"
        source="vettedDate"
        rangeLabel={range}
        loading={season.isLoading}
        bodyClassName="h-[260px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={(season.data?.dayOfWeek || [])}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={(v: any) => fmtInt(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="n" name="Claims vetted" fill={JCB.yellow} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Month-of-year activity"
        description="Aggregates across all years — surfaces seasonality (harvest, construction season, etc.)."
        info="Vetted-claim counts grouped by month-of-year, summed across all years in the data. Reveals seasonality: agricultural harvest peaks (Aug-Oct in northern hemisphere) and construction-season ramps tend to drive volume."
        formula="count(*) GROUP BY month(vettedDate)"
        source="vettedDate"
        rangeLabel={range}
        loading={season.isLoading}
        bodyClassName="h-[260px]"
        className="lg:col-span-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={(season.data?.monthOfYear || [])}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(v: any) => fmtInt(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="n" name="Claims vetted" fill={JCB.yellow} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Daily activity (last 365 days)"
        description="Calendar heatmap of claims vetted per day. GitHub-style. Anchored to the latest vettedDate in the data."
        info="One cell per day for the trailing 365 days. Brightness scales with claim count. Use this to spot weekday-only patterns, holiday gaps, or one-off spikes that the monthly views smooth over."
        formula="count(*) GROUP BY day(vettedDate) for the last 365 days"
        source="vettedDate"
        rangeLabel={range}
        loading={daily.isLoading}
        className="lg:col-span-3"
        bodyClassName="p-4 overflow-x-auto"
      >
        <CalendarHeatmap days={daily.data?.days || []} />
      </ChartCard>

      <ChartCard
        title="Theme integrity audit"
        description={`Rows where the theme field has been hijacked for an outcome value (e.g. "Z Coded"). ${fmtInt(theme.data?.mislabelled)} of ${fmtInt(theme.data?.total)} rows.`}
        info="Data-quality check. The theme field is meant to describe the fault category but some vetters have typed an outcome decision into it. The ingest pipeline auto-corrects future uploads (themeOriginal preserves the source value); existing rows are listed here."
        formula="count(*) WHERE theme IN ('Z Code','Z Coded','Z-Code','Accept','Reject')"
        source="theme, themeOriginal"
        rangeLabel={range}
        loading={theme.isLoading}
        className="lg:col-span-3"
        bodyClassName="max-h-[300px] overflow-auto p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim #</TableHead>
              <TableHead>Vetted</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Theme</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Vetter</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(theme.data?.samples || []).map((r: any) => (
              <TableRow key={r._id} className="cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('wty:open-claim', { detail: r._id }))}>
                <TableCell className="font-mono text-xs">{r._id}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDate(r.vettedDate)}</TableCell>
                <TableCell className="text-xs">{r.machineModel}</TableCell>
                <TableCell className="text-xs">{r.area}</TableCell>
                <TableCell className="text-xs text-jcb-yellow">{r.theme}</TableCell>
                <TableCell className="text-xs">{r.claimOutcome}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.vettedBy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>
    </div>
  );
}

function ZBlock({ title, rows, keyName }: { title: string; rows?: any[]; keyName: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{title}</div>
      <Table>
        <TableBody>
          {(rows || []).slice(0, 6).map(r => (
            <TableRow key={String(r[keyName])}>
              <TableCell className="py-1 text-xs truncate max-w-[260px]">{String(r[keyName])}</TableCell>
              <TableCell className="py-1 text-right text-xs text-jcb-yellow">{fmtInt(r.n)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
