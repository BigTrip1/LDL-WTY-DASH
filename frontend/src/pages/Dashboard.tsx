import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, ShieldCheck, ShieldX, Sparkles, Skull, Hourglass, Wrench, Truck, Loader2 } from 'lucide-react';
import { endpoints, type Filters } from '@/lib/api';
import Aurora from '@/components/reactbits/Aurora';
import SplitText from '@/components/reactbits/SplitText';
import ShinyText from '@/components/reactbits/ShinyText';
import KpiTile from '@/components/KpiTile';
import FilterBar, { useUrlFilters } from '@/components/FilterBar';
import TopBar from '@/components/TopBar';
import ClaimModal from '@/components/ClaimModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
// Tabs lazy-loaded so the initial bundle is small. Each tab becomes its own JS chunk.
const OverviewTab = lazy(() => import('./tabs/OverviewTab'));
const BuildTab = lazy(() => import('./tabs/BuildTab'));
const RegimeTab = lazy(() => import('./tabs/RegimeTab'));
const DriversTab = lazy(() => import('./tabs/DriversTab'));
const NlpTab = lazy(() => import('./tabs/NlpTab'));
const SupplyTab = lazy(() => import('./tabs/SupplyTab'));
const ReliabilityTab = lazy(() => import('./tabs/ReliabilityTab'));
const DataQualityTab = lazy(() => import('./tabs/DataQualityTab'));
const OperationsTab = lazy(() => import('./tabs/OperationsTab'));
const PeoplePlacesTab = lazy(() => import('./tabs/PeoplePlacesTab'));
const ReportTab = lazy(() => import('./tabs/ReportTab'));
import { getDataAnchor, ytdRange } from '@/lib/dateRanges';
import { fmtInt, fmtPct, rangeLabel } from '@/lib/utils';

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-20 text-xs text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin mr-2 text-jcb-yellow" /> Loading tab…
    </div>
  );
}

const TAB_IDS = ['overview', 'build', 'regime', 'drivers', 'nlp', 'supply', 'reliability', 'ops', 'people', 'dq', 'report'] as const;
type TabId = (typeof TAB_IDS)[number];

export default function Dashboard() {
  const [filters, setFilters] = useUrlFilters();
  const [sp, setSp] = useSearchParams();
  const defaultDatesApplied = useRef(false);
  const urlTab = sp.get('tab') as TabId | null;
  const activeTab: TabId = urlTab && TAB_IDS.includes(urlTab) ? urlTab : 'overview';
  const setActiveTab = (next: string) => {
    const u = new URLSearchParams(sp);
    if (next === 'overview') u.delete('tab'); else u.set('tab', next);
    setSp(u, { replace: true });
  };

  const meta = useQuery({ queryKey: ['meta'], queryFn: () => endpoints.meta() });
  const dataAnchor = getDataAnchor(meta.data);

  // Default landing view: calendar YTD (1 Jan current year → today).
  useEffect(() => {
    if (defaultDatesApplied.current) return;
    defaultDatesApplied.current = true;
    if (sp.get('from') || sp.get('to') || sp.get('regime')) return;
    setFilters(ytdRange(new Date()));
  }, [sp, setFilters]);

  const kpis = useQuery({ queryKey: ['kpis', filters], queryFn: () => endpoints.kpis(filters) });
  const k = kpis.data || {} as any;
  const range = rangeLabel(filters, meta.data);

  const [claimNumber, setClaimNumber] = useState<number | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = Number((e as CustomEvent).detail);
      if (!isNaN(id)) setClaimNumber(id);
    };
    const onSerial = (e: Event) => {
      const s = Number((e as CustomEvent).detail);
      if (!isNaN(s)) {
        endpoints.relatedBySerial(s, undefined, 1).then((r: any) => {
          if (r?.rows?.length) setClaimNumber(r.rows[0]._id);
        });
      }
    };
    window.addEventListener('wty:open-claim', onOpen);
    window.addEventListener('wty:open-serial', onSerial);
    return () => {
      window.removeEventListener('wty:open-claim', onOpen);
      window.removeEventListener('wty:open-serial', onSerial);
    };
  }, []);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-jcb-border">
        <Aurora />
        <div className="mx-auto max-w-[1600px] px-6 pt-6 pb-5">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                <SplitText text="Warranty intelligence" className="text-foreground" />
                <span className="ml-3"><ShinyText>LDL telehandler claims</ShinyText></span>
              </h1>
              <p className="mt-2 text-xs text-muted-foreground max-w-2xl">
                Live aggregations from the <span className="text-foreground">claims</span> collection. Every monthly chart marks the
                <span className="text-jcb-yellow"> Jan-2025 vetting regime change</span>. Z-Code is treated as a non-accept in the True Accept Rate.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <KpiTile
              label="Total claims" value={k.total ?? 0}
              icon={<Activity className="h-4 w-4" />} accent="yellow"
              info="Every row in the claims collection that matches the current filter (incl. unvetted)."
              formula="count(*)"
              source="claims._id"
              range={range}
            />
            <KpiTile
              label="True accept rate" value={k.acceptRate ?? 0}
              format={(n) => fmtPct(n)} icon={<ShieldCheck className="h-4 w-4" />} accent="green"
              hint={`${fmtInt(k.accept)} of ${fmtInt(k.vetted)} vetted`}
              info="Share of vetted claims whose outcome is exactly 'Accept'. Z-Code is treated as a non-accept per the vetting team's KPI rule."
              formula="count(claimOutcome=='Accept') / count(claimOutcome!=null)"
              source="claimOutcome"
              range={range}
            />
            <KpiTile
              label="Reject rate" value={k.rejectRate ?? 0}
              format={(n) => fmtPct(n)} icon={<ShieldX className="h-4 w-4" />} accent="red"
              hint={`${fmtInt(k.reject)} rejects`}
              info="Share of vetted claims with outcome 'Reject'. Climbing post-Jan 2025 reflects the new vetting manager's stricter stance."
              formula="count(claimOutcome=='Reject') / count(claimOutcome!=null)"
              source="claimOutcome"
              range={range}
            />
            <KpiTile
              label="Z-Code rate" value={k.zcodeRate ?? 0}
              format={(n) => fmtPct(n)} icon={<Sparkles className="h-4 w-4" />} accent="yellow"
              hint={`${fmtInt(k.zcode)} goodwill payments`}
              info="Z-Code = goodwill payment. Not counted as an accept in the True Accept Rate."
              formula="count(claimOutcome=='Z Code') / count(claimOutcome!=null)"
              source="claimOutcome"
              range={range}
            />
            <KpiTile
              label="DOA rate" value={k.doaRate ?? 0}
              format={(n) => fmtPct(n)} icon={<Skull className="h-4 w-4" />} accent="red"
              hint={`${fmtInt(k.doa)} DOA claims`}
              info="Dead-on-arrival: machines that failed before any operating life. Includes both unvetted and vetted rows."
              formula="count(tPeriod=='DOA') / count(*)"
              source="tPeriod"
              range={range}
            />
            <KpiTile
              label="Pending vets" value={k.pending ?? 0}
              icon={<Hourglass className="h-4 w-4" />} accent="muted"
              info="Claims that have been raised but not yet vetted (claimOutcome is null)."
              formula="count(claimOutcome==null)"
              source="claimOutcome"
              range={range}
            />
            <KpiTile
              label="Avg hours-to-fail" value={k.avgHours ?? 0}
              format={(n) => Math.round(n).toLocaleString()}
              icon={<Wrench className="h-4 w-4" />} accent="blue"
              hint="outliers > 20k hrs clipped"
              info="Mean machine operating hours at time of claim. Source rows with '#' or implausible values (>20,000 hrs or <0) are dropped during ingest."
              formula="avg(hours) where hours is not null"
              source="hours (cleaned)"
              range={range}
            />
            <KpiTile
              label="Active models" value={k.activeModels ?? 0}
              icon={<Truck className="h-4 w-4" />} accent="yellow"
              info="Distinct machineModel values appearing in the filtered set."
              formula="distinct(machineModel)"
              source="machineModel"
              range={range}
            />
          </div>
        </div>
      </section>

      <TopBar filters={filters} onChange={setFilters} dataAnchor={dataAnchor} />
      <FilterBar filters={filters} onChange={setFilters} />

      <section className="mx-auto max-w-[1600px] px-6 py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="build">Build-date</TabsTrigger>
            <TabsTrigger value="regime">Vetting &amp; regime</TabsTrigger>
            <TabsTrigger value="drivers">Outcome drivers</TabsTrigger>
            <TabsTrigger value="nlp">Description NLP</TabsTrigger>
            <TabsTrigger value="supply">Supply &amp; geography</TabsTrigger>
            <TabsTrigger value="reliability">Reliability</TabsTrigger>
            <TabsTrigger value="ops">Operations</TabsTrigger>
            <TabsTrigger value="people">People &amp; places</TabsTrigger>
            <TabsTrigger value="dq">Data quality &amp; drill-down</TabsTrigger>
            <TabsTrigger value="report">Full report</TabsTrigger>
          </TabsList>

          <Suspense fallback={<TabLoading />}>
            <TabsContent value="overview"><OverviewTab filters={filters} setFilters={setFilters} /></TabsContent>
            <TabsContent value="build"><BuildTab filters={filters} setFilters={setFilters} /></TabsContent>
            <TabsContent value="regime"><RegimeTab filters={filters} setFilters={setFilters} /></TabsContent>
            <TabsContent value="drivers"><DriversTab filters={filters} setFilters={setFilters} /></TabsContent>
            <TabsContent value="nlp"><NlpTab filters={filters} setFilters={setFilters} /></TabsContent>
            <TabsContent value="supply"><SupplyTab filters={filters} setFilters={setFilters} /></TabsContent>
            <TabsContent value="reliability"><ReliabilityTab filters={filters} /></TabsContent>
            <TabsContent value="ops"><OperationsTab filters={filters} setFilters={setFilters} /></TabsContent>
            <TabsContent value="people"><PeoplePlacesTab filters={filters} setFilters={setFilters} /></TabsContent>
            <TabsContent value="dq"><DataQualityTab filters={filters} /></TabsContent>
            <TabsContent value="report"><ReportTab /></TabsContent>
          </Suspense>
        </Tabs>
      </section>

      <ClaimModal claimNumber={claimNumber} onClose={() => setClaimNumber(null)} />
    </div>
  );
}
