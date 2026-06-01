import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Globe2, MapPin, TrendingUp, ShieldAlert, ShieldCheck } from 'lucide-react';
import { endpoints, type Filters } from '@/lib/api';
import ChartCard from '@/components/charts/ChartCard';
import WorldBubbleMap from '@/components/charts/WorldBubbleMap';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip as UiTooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { COUNTRY_REGION } from '@/lib/countryCoords';
import { JCB, OUTCOME_COLORS, cn, fmtInt, fmtPct, rangeLabel } from '@/lib/utils';

type Region = 'Europe' | 'Americas' | 'APAC' | 'MEA' | 'Other';
const REGION_ORDER: Region[] = ['Europe', 'Americas', 'APAC', 'MEA', 'Other'];
const REGION_LABEL: Record<Region, string> = {
  Europe:   'Europe',
  Americas: 'Americas',
  APAC:     'Asia-Pacific',
  MEA:      'Middle East & Africa',
  Other:    'Other / Unmapped'
};

interface CountryRow {
  country: string;
  n: number;
  accept?: number;
  reject?: number;
  zcode?: number;
  acceptRate?: number;
}

export default function SupplyTab({ filters, setFilters }: { filters: Filters; setFilters?: (f: Filters) => void }) {
  const addFilter = (key: keyof Filters, value: string) => {
    if (!setFilters) return;
    const cur = (filters[key] as string[] | undefined) ?? [];
    if (cur.includes(value)) return;
    setFilters({ ...filters, [key]: [...cur, value] });
  };

  const supp    = useQuery({ queryKey: ['by-supplier', filters], queryFn: () => endpoints.bySupplier(filters, 25) });
  const country = useQuery({ queryKey: ['by-country', filters],  queryFn: () => endpoints.byCountry(filters) });
  const metaQ   = useQuery({ queryKey: ['meta'],                  queryFn: () => endpoints.meta() });
  const range   = rangeLabel(filters, metaQ.data);

  // --- Aggregations --------------------------------------------------------
  const countryRows: CountryRow[] = (country.data ?? []) as CountryRow[];

  const regionStats = useMemo(() => {
    const totals: Record<Region, { n: number; accept: number; reject: number; zcode: number; countries: Set<string> }> = {
      Europe:   { n: 0, accept: 0, reject: 0, zcode: 0, countries: new Set() },
      Americas: { n: 0, accept: 0, reject: 0, zcode: 0, countries: new Set() },
      APAC:     { n: 0, accept: 0, reject: 0, zcode: 0, countries: new Set() },
      MEA:      { n: 0, accept: 0, reject: 0, zcode: 0, countries: new Set() },
      Other:    { n: 0, accept: 0, reject: 0, zcode: 0, countries: new Set() }
    };
    for (const r of countryRows) {
      const region = COUNTRY_REGION[r.country] ?? 'Other';
      const bucket = totals[region];
      bucket.n      += r.n;
      bucket.accept += r.accept ?? 0;
      bucket.reject += r.reject ?? 0;
      bucket.zcode  += r.zcode  ?? 0;
      bucket.countries.add(r.country);
    }
    const grand = REGION_ORDER.reduce((s, r) => s + totals[r].n, 0);
    return REGION_ORDER.map(r => ({
      region: r,
      label: REGION_LABEL[r],
      n: totals[r].n,
      accept: totals[r].accept,
      reject: totals[r].reject,
      zcode: totals[r].zcode,
      countries: totals[r].countries.size,
      sharePct: grand > 0 ? totals[r].n / grand : 0,
      acceptRate: totals[r].n > 0 ? totals[r].accept / totals[r].n : 0,
      rejectRate: totals[r].n > 0 ? totals[r].reject / totals[r].n : 0
    }));
  }, [countryRows]);

  // Supplier highlights - three different lenses on the supplier base.
  // Excludes the 'Not assigned' / '#' placeholders so the cards always
  // surface real, actionable suppliers. zcodeRate is derived client-side
  // because the by-supplier endpoint only ships raw counts + accept/reject
  // rate (no zcodeRate).
  const supplierHighlights = useMemo(() => {
    const isReal = (s: string) => s && s !== '#' && !/^not\s*assigned$/i.test(s);
    const real = ((supp.data ?? []) as any[])
      .filter(r => isReal(r.supplier))
      .map(r => ({ ...r, zcodeRate: r.n > 0 ? (r.zcode ?? 0) / r.n : 0 }));

    // 1) Highest claim volume - the supplier our warranty team sees most often.
    const byVolume = real.slice().sort((a, b) => b.n - a.n)[0] ?? null;

    // 2) Worst reject rate among suppliers with >=30 claims (statistical floor
    //    so a 1-claim supplier with 100% reject doesn't win).
    const minN = 30;
    const eligible = real.filter(r => r.n >= minN);
    const worstReject = eligible.slice().sort((a, b) => b.rejectRate - a.rejectRate)[0] ?? null;

    // 3) Heaviest goodwill (Z-Code) share - flags suppliers we keep paying
    //    despite never accepting the claim. Among eligible (>=30 claims) AND
    //    with at least one Z-Code so we don't surface a "0% of N" winner.
    const zcodeCandidates = eligible.filter(r => (r.zcode ?? 0) > 0);
    const heaviestZcode = zcodeCandidates.sort((a, b) => b.zcodeRate - a.zcodeRate)[0] ?? null;

    return { byVolume, worstReject, heaviestZcode, eligibleCount: eligible.length };
  }, [supp.data]);

  // Supplier concentration: % of claims handled by the top 5 NAMED suppliers.
  // "Not assigned" / '#' / '' placeholders are excluded so the gauge measures
  // real supplier-base concentration, not the share of unattributed claims.
  const supplierConcentration = useMemo(() => {
    const isReal = (s: string) => s && s !== '#' && !/^not\s*assigned$/i.test(s);
    const all = ((supp.data ?? []) as any[]).filter(r => isReal(r.supplier));
    const total = all.reduce((s, r) => s + r.n, 0);
    const top5  = all.slice(0, 5).reduce((s, r) => s + r.n, 0);
    return { total, top5, pct: total > 0 ? top5 / total : 0, count: all.length };
  }, [supp.data]);

  const stackData = useMemo(() => (supp.data ?? []).slice(0, 15).map((r: any) => ({
    label: String(r.supplier).slice(0, 28),
    Accept: r.accept, Reject: r.reject, 'Z Code': r.zcode, 'More Info': r.moreInfo, 'Raise on Supplier': r.raise
  })), [supp.data]);

  // --- Render -------------------------------------------------------------
  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
      {/* ============================================================ */}
      {/* HERO MAP - full width                                         */}
      {/* ============================================================ */}
      <ChartCard
        title="Geographic claim map"
        description="Country fill is shaded by claim volume; bubbles colour-code accept rate (green ≥ 85%, amber 70-85%, red < 70%). Drag to pan, wheel to zoom, double-click to reset. Click any bubble or country to add it to the global filter."
        info="Equirectangular projection using public-domain Natural Earth country borders (110m resolution, baked into the bundle - no external geo service). The viewport is cropped to the populated latitude band (75°N to 55°S) so Antarctica doesn't waste space; zoom further to inspect individual regions."
        formula="count(*) / GROUP BY country  +  outcome-accept rate"
        source="country, claimOutcome"
        rangeLabel={range}
        loading={country.isLoading}
        className="lg:col-span-6"
        bodyClassName="h-[620px] p-0"
      >
        <WorldBubbleMap
          rows={countryRows.map(r => ({ country: r.country, n: r.n, acceptRate: r.acceptRate }))}
          onPick={setFilters ? (c) => addFilter('country', c) : undefined}
        />
      </ChartCard>

      {/* ============================================================ */}
      {/* REGIONAL ROLLUP STRIP - 5 region tiles                        */}
      {/* ============================================================ */}
      <RegionalRollup stats={regionStats} className="lg:col-span-6" />

      {/* ============================================================ */}
      {/* SUPPLIER PODIUM + CONCENTRATION SUMMARY                       */}
      {/* ============================================================ */}
      <ChartCard
        title="Supplier highlights"
        description="Three different lenses on the supplier base. 'Not assigned' / placeholder rows are excluded."
        info="Card 1: highest claim volume (workload). Card 2: worst reject rate among suppliers with at least 30 claims (quality flag). Card 3: heaviest Z-Code share - goodwill payments where the claim was paid but not formally accepted (commercial review). Click any card to filter the dashboard to that supplier."
        formula="various - see each card's subtitle"
        source="partSupplier, claimOutcome"
        rangeLabel={range}
        loading={supp.isLoading}
        className="lg:col-span-4"
        bodyClassName="p-4"
      >
        <SupplierHighlights
          highlights={supplierHighlights}
          onPick={setFilters ? (s) => addFilter('supplier', s) : undefined}
        />
      </ChartCard>

      <ChartCard
        title="Supply concentration"
        description="How concentrated are claims across the supplier base?"
        info="Share of total claims attributable to the top 5 suppliers. A high concentration ≥ 60% means a few suppliers drive most of the warranty volume; low concentration means it's spread thin (often a sign of broad / process-level issues rather than supplier-specific ones)."
        formula="sum(top5.n) / sum(all suppliers.n)"
        source="partSupplier"
        rangeLabel={range}
        loading={supp.isLoading}
        className="lg:col-span-2"
        bodyClassName="p-4 flex items-center justify-center"
      >
        <ConcentrationGauge {...supplierConcentration} />
      </ChartCard>

      {/* ============================================================ */}
      {/* SUPPLIER OUTCOME MIX (stacked bars)                           */}
      {/* ============================================================ */}
      <ChartCard
        title="Supplier · outcome mix (top 15)"
        description="Stacked bars showing how each top supplier's claims break down by outcome. A big red Reject segment = suspect quality."
        info="One stacked horizontal bar per top-15 supplier. The width of each colour segment is the count of claims with that outcome."
        formula="count(*) GROUP BY (partSupplier, claimOutcome)"
        source="partSupplier, claimOutcome"
        rangeLabel={range}
        loading={supp.isLoading}
        className="lg:col-span-4"
        bodyClassName="h-[420px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stackData} layout="vertical" margin={{ left: 110 }}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis type="number" />
            <YAxis dataKey="label" type="category" width={220} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {['Accept', 'Reject', 'Z Code', 'More Info', 'Raise on Supplier'].map(k => (
              <Bar key={k} dataKey={k} stackId="a" fill={OUTCOME_COLORS[k] || '#888'} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ============================================================ */}
      {/* SUPPLIER REJECT-RATE LEAGUE                                   */}
      {/* ============================================================ */}
      <ChartCard
        title="Supplier reject-rate league"
        description="Same suppliers, sorted by reject rate so the worst quality issues surface at the top. Click a row to filter."
        info="The reject rate badge: red >15%, amber 7-15%, green <7%. The accept rate badge: green ≥85%, amber 70-85%, red <70%."
        source="partSupplier, claimOutcome"
        rangeLabel={range}
        loading={supp.isLoading}
        className="lg:col-span-2"
        bodyClassName="max-h-[420px] overflow-auto p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Claims</TableHead>
              <TableHead className="text-right">Reject</TableHead>
              <TableHead className="text-right">Accept</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(supp.data ?? []).slice().sort((a: any, b: any) => b.rejectRate - a.rejectRate).map((r: any) => (
              <TableRow
                key={r.supplier}
                onClick={setFilters ? () => addFilter('supplier', r.supplier) : undefined}
                className={setFilters ? 'cursor-pointer hover:bg-jcb-yellow/5' : ''}
                title={setFilters ? `Click to filter by ${r.supplier}` : undefined}
              >
                <TableCell className="text-xs truncate max-w-[160px]" title={r.supplier}>{r.supplier}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={r.rejectRate > 0.15 ? 'bad' : r.rejectRate > 0.07 ? 'warn' : 'good'}>{fmtPct(r.rejectRate)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={r.acceptRate < 0.7 ? 'bad' : r.acceptRate < 0.85 ? 'warn' : 'good'}>{fmtPct(r.acceptRate)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>

      {/* ============================================================ */}
      {/* TOP COUNTRIES BAR                                             */}
      {/* ============================================================ */}
      <ChartCard
        title="Top countries by claim volume"
        description="Top 20 countries ranked by claim count. Click any bar to filter."
        info="Same data as the world map above, sorted as a simple horizontal bar. Use the People & Places tab for a reject-rate-sorted view."
        formula="count(*) GROUP BY country"
        source="country"
        rangeLabel={range}
        loading={country.isLoading}
        className="lg:col-span-6"
        bodyClassName="h-[480px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={countryRows.slice(0, 20)} layout="vertical" margin={{ left: 90 }}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis type="number" />
            <YAxis dataKey="country" type="category" width={120} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any, n: any) => (n === 'acceptRate' ? fmtPct(v) : fmtInt(v))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="n"
              name="Claims"
              fill={JCB.yellow}
              cursor={setFilters ? 'pointer' : 'default'}
              onClick={setFilters ? (d: any) => addFilter('country', d.country) : undefined}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

// =================================================================
//   Sub-components
// =================================================================

function RegionalRollup({ stats, className }: { stats: ReturnType<any>; className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-widest text-jcb-yellow flex items-center gap-2">
            <Globe2 className="h-3.5 w-3.5" />
            Regional rollup
            <InfoBadge text="Each row aggregates claims by destination-country region. Share% adds to 100% across rows. Use it to spot which region is driving total claim volume and whether accept rates differ between regions." />
          </div>
          <div className="text-[10px] text-muted-foreground">
            5 regions · destination market
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.map((s: any) => (
            <RegionalTile key={s.region} {...s} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RegionalTile({
  region, label, n, sharePct, acceptRate, rejectRate, countries
}: {
  region: Region; label: string; n: number; sharePct: number; acceptRate: number; rejectRate: number; countries: number;
}) {
  const tone =
    n === 0 ? 'border-jcb-border'
      : acceptRate >= 0.85 ? 'border-emerald-400/40'
      : acceptRate >= 0.70 ? 'border-jcb-yellow/40'
      : 'border-red-400/40';
  return (
    <div className={cn('rounded-md border p-3 bg-jcb-ink/60 relative', tone)}>
      {/* Share-of-total progress bar across the bottom */}
      <div className="absolute left-0 bottom-0 right-0 h-0.5 bg-jcb-surface">
        <div className="h-full bg-jcb-yellow" style={{ width: `${sharePct * 100}%` }} />
      </div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-2xl font-black tabular-nums">{fmtInt(n)}</div>
      <div className="text-[10px] text-muted-foreground">{fmtPct(sharePct)} of total · {countries} cnt{countries === 1 ? 'y' : 'ries'}</div>
      <div className="mt-2 flex gap-1.5">
        <Badge variant={acceptRate >= 0.85 ? 'good' : acceptRate >= 0.70 ? 'warn' : 'bad'} className="text-[10px]">
          A {fmtPct(acceptRate)}
        </Badge>
        <Badge variant={rejectRate <= 0.07 ? 'good' : rejectRate <= 0.15 ? 'warn' : 'bad'} className="text-[10px]">
          R {fmtPct(rejectRate)}
        </Badge>
      </div>
    </div>
  );
}

function SupplierHighlights({
  highlights, onPick
}: {
  highlights: { byVolume: any; worstReject: any; heaviestZcode: any; eligibleCount: number };
  onPick?: (supplier: string) => void;
}) {
  const { byVolume, worstReject, heaviestZcode, eligibleCount } = highlights;
  if (!byVolume) {
    return <div className="text-xs text-muted-foreground py-8 text-center">No supplier data in current filter.</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <HighlightCard
        label="Highest claim volume"
        hint="who we deal with most often"
        accent="amber"
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        supplier={byVolume?.supplier}
        primary={fmtInt(byVolume?.n)}
        primaryLabel="claims"
        secondary={`${fmtPct(byVolume?.acceptRate ?? 0)} accept · ${fmtPct(byVolume?.rejectRate ?? 0)} reject`}
        secondaryTone={byVolume?.acceptRate >= 0.85 ? 'good' : byVolume?.acceptRate >= 0.70 ? 'warn' : 'bad'}
        onPick={onPick}
      />
      <HighlightCard
        label="Worst reject rate"
        hint={`min 30 claims · ${eligibleCount} eligible`}
        accent="red"
        icon={<ShieldAlert className="h-3.5 w-3.5" />}
        supplier={worstReject?.supplier}
        primary={fmtPct(worstReject?.rejectRate ?? 0)}
        primaryLabel="reject rate"
        secondary={worstReject ? `${fmtInt(worstReject.reject)} of ${fmtInt(worstReject.n)} claims rejected` : 'no eligible suppliers'}
        secondaryTone="bad"
        onPick={onPick}
      />
      <HighlightCard
        label="Heaviest Z-Code share"
        hint="goodwill payments - commercial review"
        accent="yellow"
        icon={<ShieldCheck className="h-3.5 w-3.5" />}
        supplier={heaviestZcode?.supplier}
        primary={fmtPct(heaviestZcode?.zcodeRate ?? 0)}
        primaryLabel="Z-Code rate"
        secondary={heaviestZcode ? `${fmtInt(heaviestZcode.zcode)} of ${fmtInt(heaviestZcode.n)} claims paid as goodwill` : 'no eligible suppliers'}
        secondaryTone="warn"
        onPick={onPick}
      />
    </div>
  );
}

function HighlightCard({
  label, hint, accent, icon, supplier, primary, primaryLabel, secondary, secondaryTone, onPick
}: {
  label: string;
  hint: string;
  accent: 'amber' | 'red' | 'yellow';
  icon: React.ReactNode;
  supplier: string | undefined;
  primary: string;
  primaryLabel: string;
  secondary: string;
  secondaryTone: 'good' | 'warn' | 'bad';
  onPick?: (supplier: string) => void;
}) {
  const accentRing =
    accent === 'red'   ? 'border-red-400/40 hover:border-red-400/70'
      : accent === 'yellow' ? 'border-jcb-yellow/40 hover:border-jcb-yellow/70'
      : 'border-amber-400/40 hover:border-amber-400/70';
  const accentText =
    accent === 'red'   ? 'text-red-300'
      : accent === 'yellow' ? 'text-jcb-yellow'
      : 'text-amber-300';
  const clickable = onPick && supplier;
  return (
    <button
      type="button"
      onClick={clickable ? () => onPick!(supplier!) : undefined}
      disabled={!clickable}
      title={clickable ? `Click to filter by ${supplier}` : undefined}
      className={cn(
        'group flex flex-col items-start gap-1.5 rounded-md border bg-jcb-ink/60 p-3 text-left transition-colors',
        accentRing,
        clickable && 'cursor-pointer hover:bg-jcb-yellow/5',
        !clickable && 'cursor-default'
      )}
    >
      <div className={cn('text-[10px] uppercase tracking-widest flex items-center gap-1', accentText)}>
        {icon} {label}
      </div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
      <div className="text-xs text-foreground truncate max-w-full" title={supplier}>
        {supplier ? (supplier.length > 28 ? supplier.slice(0, 26) + '…' : supplier) : '—'}
      </div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <div className={cn('text-2xl font-black tabular-nums', accentText)}>{primary}</div>
        <div className="text-[10px] text-muted-foreground">{primaryLabel}</div>
      </div>
      <Badge variant={secondaryTone} className="text-[10px]">{secondary}</Badge>
    </button>
  );
}

function ConcentrationGauge({ pct, top5, total, count }: { pct: number; top5: number; total: number; count: number }) {
  // Semi-circular gauge that sweeps left -> top -> right as pct goes 0 -> 1.
  //
  // Angle convention: we use math-style angles measured from +X axis, with
  // Y FLIPPED for SVG (cy - r*sin instead of cy + r*sin) so positive sin = up.
  //   pct 0   -> angle pi  -> tip at (cx-r, cy)  i.e. LEFT
  //   pct 0.5 -> angle pi/2 -> tip at (cx, cy-r) i.e. TOP
  //   pct 1   -> angle 0   -> tip at (cx+r, cy)  i.e. RIGHT
  const cx = 100, cy = 100, r = 75;
  const safePct = Math.max(0, Math.min(1, pct));
  const angle = Math.PI * (1 - safePct);
  const tipX = cx + r * Math.cos(angle);
  const tipY = cy - r * Math.sin(angle);

  const baseArcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  // Fill arc: from the left point to the current needle tip, along the top.
  const fillArcPath = safePct > 0
    ? `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${tipX.toFixed(2)} ${tipY.toFixed(2)}`
    : '';

  const tone =
    safePct >= 0.6 ? '#FCB026'
      : safePct >= 0.4 ? '#FDE68A'
      : '#22C55E';
  const verdict =
    safePct >= 0.6 ? 'concentrated'
      : safePct >= 0.4 ? 'moderate'
      : 'distributed';

  // 50% tick at the top of the arc
  const tickTopY = cy - r;
  return (
    <div className="flex flex-col items-center">
      <svg width={200} height={130} viewBox="0 0 200 130" className="block">
        {/* baseline arc (full semi-circle) */}
        <path d={baseArcPath} stroke="#1f2738" strokeWidth={14} fill="none" strokeLinecap="round" />
        {/* progress arc */}
        {fillArcPath && (
          <path d={fillArcPath} stroke={tone} strokeWidth={14} fill="none" strokeLinecap="round" />
        )}
        {/* tick marks */}
        <g fill="#777" fontSize={10} textAnchor="middle">
          <text x={cx - r} y={cy + 16}>0%</text>
          <text x={cx}     y={tickTopY - 6}>50%</text>
          <text x={cx + r} y={cy + 16}>100%</text>
        </g>
        {/* needle */}
        <line
          x1={cx} y1={cy}
          x2={tipX} y2={tipY}
          stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={6} fill="#ffffff" />
        <circle cx={cx} cy={cy} r={3} fill={tone} />
        {/* big central value */}
        <text x={cx} y={cy - 18} fontSize={26} fontWeight={800} fill={tone} textAnchor="middle">{fmtPct(safePct)}</text>
      </svg>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Top-5 share</div>
      <div className="text-[11px] text-foreground text-center mt-1 leading-snug">
        {fmtInt(top5)} of {fmtInt(total)} claims · {count} named suppliers ·
        {' '}<span style={{ color: tone }} className="font-semibold">{verdict}</span>
      </div>
    </div>
  );
}

function InfoBadge({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={120}>
      <UiTooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="info" className="text-muted-foreground/70 hover:text-jcb-yellow">
            <Info className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-[300px] leading-relaxed">{text}</TooltipContent>
      </UiTooltip>
    </TooltipProvider>
  );
}
