import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Sankey } from 'recharts';
import { endpoints, type Filters } from '@/lib/api';
import ChartCard from '@/components/charts/ChartCard';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OUTCOME_COLORS, fmtInt, fmtPct, cn } from '@/lib/utils';

const DIMS = [
  { id: 'area', label: 'Area', filterKey: 'area' },
  { id: 'theme', label: 'Theme', filterKey: 'theme' },
  { id: 'model', label: 'Model', filterKey: 'model' },
  { id: 'supplier', label: 'Supplier', filterKey: 'supplier' },
  { id: 'tPeriod', label: 'T-period', filterKey: 'tPeriod' },
  { id: 'hoursBucket', label: 'Hours bucket', filterKey: 'hoursBucket' },
  { id: 'country', label: 'Country', filterKey: 'country' },
  { id: 'dealer', label: 'Dealer', filterKey: 'dealer' },
  { id: 'detection', label: 'Detection', filterKey: null },
  { id: 'tag', label: 'Description tag', filterKey: 'tags' }
] as const;

interface TabProps { filters: Filters; setFilters?: (f: Filters) => void }

export default function DriversTab({ filters, setFilters }: TabProps) {
  const [dim, setDim] = useState('area');
  const { data, isLoading } = useQuery({
    queryKey: ['outcome-drivers', filters, dim],
    queryFn: () => endpoints.outcomeDrivers(filters, dim, 30)
  });
  const sankey = useQuery({
    queryKey: ['sankey', filters],
    queryFn: () => endpoints.sankey(filters)
  });

  const sorted = useMemo(() => (data?.rows || []).slice().sort((a: any, b: any) => b.n - a.n), [data]);
  const topRej = useMemo(() => sorted.slice().sort((a: any, b: any) => b.rejectRate - a.rejectRate).slice(0, 10), [sorted]);
  const topAcc = useMemo(() => sorted.slice().sort((a: any, b: any) => b.acceptRate - a.acceptRate).slice(0, 10), [sorted]);
  const topZ   = useMemo(() => sorted.slice().sort((a: any, b: any) => b.zcodeRate - a.zcodeRate).slice(0, 10), [sorted]);

  const stackData = useMemo(() => sorted.slice(0, 15).map((r: any) => ({
    label: String(r.value).slice(0, 30),
    Accept: r.accept, Reject: r.reject, 'Z Code': r.zcode, 'More Info': r.moreInfo, 'Raise on Supplier': r.raise
  })), [sorted]);

  const currentDim = DIMS.find(d => d.id === dim);
  const filterKey = currentDim?.filterKey as keyof Filters | null | undefined;
  const onPick = (value: string) => {
    if (!setFilters || !filterKey) return;
    const cur = (filters[filterKey] as string[] | undefined) ?? [];
    if (cur.includes(value)) return;
    setFilters({ ...filters, [filterKey]: [...cur, value] });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-3 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Dimension:</span>
        <Select value={dim} onValueChange={setDim}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIMS.map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">min 30 claims · sorted to surface most over/under-accepted values</span>
      </div>

      <DriverTable title="Most-rejected values" rows={topRej} dim={dim} loading={isLoading} metric="rejectRate" tone="bad" onPick={filterKey ? onPick : undefined} />
      <DriverTable title="Most-accepted values" rows={topAcc} dim={dim} loading={isLoading} metric="acceptRate" tone="good" onPick={filterKey ? onPick : undefined} />
      <DriverTable title="Most Z-coded values" rows={topZ}  dim={dim} loading={isLoading} metric="zcodeRate"  tone="warn" onPick={filterKey ? onPick : undefined} />

      <ChartCard
        title="Failure flow · Area → Failed part → Outcome"
        description="Sankey diagram showing claim-volume flow through the three tiers. Top 8 areas, top 12 parts, four outcome buckets (Accept / Reject / Z-Code / Other)."
        info="A Sankey diagram is a flow chart. Each band's thickness is proportional to the number of claims that took that path. Use it to spot a single area → part → outcome chain that dominates the dataset."
        formula="count(*) GROUP BY (area, failedPart, claimOutcome) for top areas × top parts; outcomes collapsed to {Accept, Reject, Z Code, Other}."
        source="area, failedPart, claimOutcome"
        loading={sankey.isLoading}
        className="lg:col-span-3"
        bodyClassName="h-[500px] p-2"
      >
        {sankey.data && sankey.data.nodes?.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={{ nodes: sankey.data.nodes, links: sankey.data.links }}
              nodeWidth={10}
              nodePadding={20}
              link={{ stroke: '#FCB026', strokeOpacity: 0.25 }}
              node={(props: any) => {
                const { x, y, width, height, index, payload } = props;
                const name = (payload?.name as string) || '';
                const colour = name.startsWith('A:') ? '#60A5FA' : name.startsWith('P:') ? '#FCB026' : name.startsWith('O:') ? sankeyOutcomeColour(name.slice(2)) : '#888';
                return (
                  <g>
                    <rect x={x} y={y} width={width} height={height} fill={colour} />
                    {height > 8 && (
                      <text
                        x={x < 500 ? x + width + 4 : x - 4}
                        y={y + height / 2 + 3}
                        textAnchor={x < 500 ? 'start' : 'end'}
                        fontSize={10}
                        fill="#e5e5e5"
                      >
                        {name.replace(/^[APO]:/, '')}
                      </text>
                    )}
                  </g>
                );
              }}
              margin={{ top: 10, right: 100, bottom: 10, left: 100 }}
            >
              <Tooltip />
            </Sankey>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title={`Outcome mix · top 15 ${dim} by volume`}
        info="Same data as the three tables above, displayed as horizontal stacked bars so you can see the absolute outcome mix per value at a glance."
        formula="count(*) GROUP BY (value, outcome)"
        source={`${dim}, claimOutcome`}
        loading={isLoading}
        className="lg:col-span-3"
        bodyClassName="h-[360px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stackData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis type="number" />
            <YAxis dataKey="label" type="category" width={200} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {['Accept', 'Reject', 'Z Code', 'More Info', 'Raise on Supplier'].map(k => (
              <Bar key={k} dataKey={k} stackId="a" fill={OUTCOME_COLORS[k] || '#888'} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function sankeyOutcomeColour(o: string): string {
  if (o === 'Accept') return '#22C55E';
  if (o === 'Reject') return '#EF4444';
  if (o === 'Z Code') return '#FCB026';
  return '#94A3B8';
}

function DriverTable({
  title, rows, dim, loading, metric, tone, onPick
}: {
  title: string; rows: any[]; dim: string; loading: boolean;
  metric: 'rejectRate' | 'acceptRate' | 'zcodeRate'; tone: 'bad' | 'good' | 'warn';
  onPick?: (value: string) => void;
}) {
  return (
    <ChartCard
      title={title}
      description={onPick ? `Click any row to add to filter (n ≥ 30)` : `Of all '${dim}' values (n ≥ 30)`}
      loading={loading}
      bodyClassName="p-0"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dim}</TableHead>
            <TableHead className="text-right">n</TableHead>
            <TableHead className="text-right">Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r: any) => (
            <TableRow
              key={String(r.value)}
              onClick={onPick ? () => onPick(String(r.value)) : undefined}
              className={cn(onPick && 'cursor-pointer hover:bg-jcb-yellow/5')}
              title={onPick ? `Click to add "${r.value}" to the global filter` : undefined}
            >
              <TableCell className="text-xs truncate max-w-[220px]" title={String(r.value)}>{String(r.value)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground text-xs">{fmtInt(r.n)}</TableCell>
              <TableCell className="text-right">
                <Badge variant={tone}>{fmtPct(r[metric])}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ChartCard>
  );
}
