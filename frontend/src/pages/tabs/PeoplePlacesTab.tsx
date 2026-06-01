import { useQuery } from '@tanstack/react-query';
import { endpoints, type Filters } from '@/lib/api';
import ChartCard from '@/components/charts/ChartCard';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { fmtInt, fmtPct, fmtDate, rangeLabel } from '@/lib/utils';

interface TabProps { filters: Filters; setFilters?: (f: Filters) => void }

export default function PeoplePlacesTab({ filters, setFilters }: TabProps) {
  const recid = useQuery({ queryKey: ['recid', filters], queryFn: () => endpoints.serialRecidivism(filters, 5, 60) });
  const dealers = useQuery({ queryKey: ['by-dealer', filters], queryFn: () => endpoints.byDealer(filters, 50) });
  const customers = useQuery({ queryKey: ['by-customer', filters], queryFn: () => endpoints.byCustomer(filters, 40) });
  const countries = useQuery({ queryKey: ['by-country-pp', filters], queryFn: () => endpoints.byCountry(filters) });
  const metaQ = useQuery({ queryKey: ['meta'], queryFn: () => endpoints.meta() });
  const range = rangeLabel(filters, metaQ.data);

  const addFilter = (key: keyof Filters, value: string) => {
    if (!setFilters) return;
    const cur = (filters[key] as string[] | undefined) ?? [];
    if (cur.includes(value)) return;
    setFilters({ ...filters, [key]: [...cur, value] });
  };

  const sum = recid.data?.summary;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Stat label="Unique serials (filtered)" n={sum?.totalSerials}
        info="Number of distinct machine serial numbers represented in the current filter. This is the denominator for the recidivism percentages below." />
      <Stat label="Serials with ≥2 claims" n={sum?.repeat2} pctOf={sum?.totalSerials}
        info="Machines that have had at least 2 claims in the current filter. Anything above ~30 % means recidivism is widespread in this slice." />
      <Stat label="Serials with ≥5 claims" n={sum?.repeat5} pctOf={sum?.totalSerials} tone="warn"
        info="Machines with 5 or more claims. These appear in the repeat-offender table below and are good candidates for site investigation." />
      <Stat label="Serials with ≥10 claims" n={sum?.repeat10} pctOf={sum?.totalSerials} tone="bad"
        info="Machines with 10+ claims. Typically a small number of severe problem machines - consider buy-back, customer call, or root-cause investigation." />

      <ChartCard
        title="Repeat-offender machines (≥5 claims)"
        description="Click serial to see all its claims. Click model/dealer to add to filter."
        info="Individual machines (by serial number) with ≥5 claims in the current filter. Strong recidivism candidates for site investigation or buy-back consideration."
        formula="count(*) GROUP BY serial HAVING count >= 5"
        source="serial"
        rangeLabel={range}
        loading={recid.isLoading}
        className="lg:col-span-4"
        bodyClassName="max-h-[460px] overflow-auto p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serial</TableHead>
              <TableHead className="text-right">Claims</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Dealer</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>First built</TableHead>
              <TableHead>First vetted</TableHead>
              <TableHead>Last vetted</TableHead>
              <TableHead title="Rule-based recurrence prediction: serial has >=3 claims AND >=180 days since last vetted claim. Flagged machines are likely to claim again - candidates for site visit or buy-back conversation.">Likely repeat</TableHead>
              <TableHead className="text-right">Reject</TableHead>
              <TableHead className="text-right">Z-Code</TableHead>
              <TableHead className="text-right">Accept</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(recid.data?.rows || []).map((r: any) => (
              <TableRow key={r.serial}>
                <TableCell className="font-mono text-xs">
                  <button className="text-jcb-yellow hover:underline" onClick={() => window.dispatchEvent(new CustomEvent('wty:open-serial', { detail: r.serial }))}>
                    {r.serial}
                  </button>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  <Badge variant={r.n >= 10 ? 'bad' : r.n >= 5 ? 'warn' : 'ghost'}>{fmtInt(r.n)}</Badge>
                </TableCell>
                <TableCell className="text-xs">
                  <button className="hover:text-jcb-yellow" onClick={() => addFilter('model', r.machineModel)}>{r.machineModel}</button>
                </TableCell>
                <TableCell className="text-xs truncate max-w-[200px]" title={r.dealer}>
                  <button className="hover:text-jcb-yellow text-left" onClick={() => addFilter('dealer', r.dealer)}>{r.dealer}</button>
                </TableCell>
                <TableCell className="text-xs">
                  <button className="hover:text-jcb-yellow" onClick={() => addFilter('country', r.country)}>{r.country}</button>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.firstBuild)}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.firstVetted)}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(r.lastVetted)}</TableCell>
                <TableCell>
                  {r.likelyRepeat
                    ? <Badge variant="warn" title={`${r.daysSinceLastClaim} days since last claim · ${r.n} historical claims`}>likely</Badge>
                    : <span className="text-[10px] text-muted-foreground">{r.daysSinceLastClaim != null ? `${r.daysSinceLastClaim}d` : '–'}</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{fmtInt(r.reject)}</TableCell>
                <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{fmtInt(r.zcode)}</TableCell>
                <TableCell className="text-right tabular-nums text-xs">{fmtInt(r.accept)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>

      <ChartCard
        title="Dealer scorecard (top 50 by volume)"
        description="Click dealer to add to filter. Reject rate ≥ 15 % flagged red."
        info="Top 50 dealers by claim volume with outcome rates. Country count = number of distinct destination markets the dealer ships to."
        formula="count(*), outcome rates, distinct countries GROUP BY dealer"
        source="dealer, country, claimOutcome"
        rangeLabel={range}
        loading={dealers.isLoading}
        className="lg:col-span-2"
        bodyClassName="max-h-[520px] overflow-auto p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dealer</TableHead>
              <TableHead className="text-right">Claims</TableHead>
              <TableHead className="text-right">Countries</TableHead>
              <TableHead className="text-right">Reject</TableHead>
              <TableHead className="text-right">Z-Code</TableHead>
              <TableHead className="text-right">Accept</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(dealers.data || []).map((r: any) => (
              <TableRow key={r.dealer}>
                <TableCell className="text-xs truncate max-w-[260px]" title={r.dealer}>
                  <button className="hover:text-jcb-yellow text-left" onClick={() => addFilter('dealer', r.dealer)}>{r.dealer}</button>
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{r.countryCount}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={r.rejectRate > 0.15 ? 'bad' : r.rejectRate > 0.07 ? 'warn' : 'ghost'}>{fmtPct(r.rejectRate)}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(r.zcodeRate)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={r.acceptRate < 0.7 ? 'bad' : r.acceptRate < 0.85 ? 'warn' : 'good'}>{fmtPct(r.acceptRate)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>

      <ChartCard
        title="Customer scorecard (excl. stock)"
        description="Rental fleets dominate the top of the list."
        info="Top 40 customers with outcome rates. Excludes the '#' stock placeholder used when no end-customer is assigned."
        formula="count + outcome rates GROUP BY customer WHERE customer NOT IN ('', '#')"
        source="customer, claimOutcome"
        rangeLabel={range}
        loading={customers.isLoading}
        className="lg:col-span-2"
        bodyClassName="max-h-[520px] overflow-auto p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Claims</TableHead>
              <TableHead className="text-right">Reject</TableHead>
              <TableHead className="text-right">Z-Code</TableHead>
              <TableHead className="text-right">Accept</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(customers.data || []).map((r: any) => (
              <TableRow
                key={r.customer}
                onClick={setFilters ? () => addFilter('customer', r.customer) : undefined}
                className={setFilters ? 'cursor-pointer hover:bg-jcb-yellow/5' : ''}
                title={setFilters ? `Click to filter dashboard by ${r.customer}` : undefined}
              >
                <TableCell className="text-xs truncate max-w-[260px]" title={r.customer}>{r.customer}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(r.rejectRate)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(r.zcodeRate)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={r.acceptRate < 0.7 ? 'bad' : r.acceptRate < 0.85 ? 'warn' : 'good'}>{fmtPct(r.acceptRate)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>

      <ChartCard
        title="Country reject-rate league (n ≥ 200)"
        description="High reject rates may indicate genuine market issues OR vetter bias on non-UK claims — worth investigating."
        info="Countries with at least 200 claims sorted ascending by Accept rate — the most-rejected markets surface at the top."
        formula="count + acceptRate GROUP BY country HAVING count >= 200"
        source="country, claimOutcome"
        rangeLabel={range}
        loading={countries.isLoading}
        className="lg:col-span-4"
        bodyClassName="max-h-[420px] overflow-auto p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Claims</TableHead>
              <TableHead className="text-right">Accept</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(countries.data || []).filter((c: any) => c.n >= 200).slice().sort((a: any, b: any) => a.acceptRate - b.acceptRate).map((r: any) => (
              <TableRow key={r.country}>
                <TableCell className="text-xs">
                  <button className="hover:text-jcb-yellow" onClick={() => addFilter('country', r.country)}>{r.country}</button>
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={r.acceptRate < 0.78 ? 'bad' : r.acceptRate < 0.86 ? 'warn' : 'good'}>{fmtPct(r.acceptRate)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>
    </div>
  );
}

function Stat({ label, n, pctOf, tone = 'muted', info }: { label: string; n: number | undefined; pctOf?: number; tone?: 'muted' | 'warn' | 'bad'; info?: string }) {
  const colour = tone === 'bad' ? 'text-red-300' : tone === 'warn' ? 'text-jcb-yellow' : 'text-foreground';
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
                <TooltipContent side="bottom" align="start" className="max-w-[260px] leading-relaxed">{info}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className={`mt-1 text-2xl font-black tabular-nums ${colour}`}>{fmtInt(n ?? 0)}</div>
        {pctOf ? <div className="text-[11px] text-muted-foreground">{fmtPct((n ?? 0) / pctOf)} of unique serials</div> : null}
      </CardContent>
    </Card>
  );
}
