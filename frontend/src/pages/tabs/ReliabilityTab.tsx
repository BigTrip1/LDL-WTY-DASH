import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
// Legend used in both BarChart instances below
import { endpoints, type Filters } from '@/lib/api';
import ChartCard from '@/components/charts/ChartCard';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { JCB, fmtInt, fmtPct, rangeLabel } from '@/lib/utils';

const T_COLOURS: Record<string, string> = {
  DOA: '#EF4444', T000: '#F87171', T001: '#FBBF24', T002: '#FCB026',
  T003: '#FFD24A', T004: '#FFE48A', T005: '#94A3B8', T006: '#64748B', Unknown: '#525252'
};
const HOURS_LABELS: Record<string, string> = {
  '0': '0–25', '25': '25–50', '50': '50–100', '100': '100–250', '250': '250–500',
  '500': '500–1000', '1000': '1000–2500', '2500': '2500–5000', '5000': '5000–20000', 'other': 'Unknown'
};

export default function ReliabilityTab({ filters }: { filters: Filters }) {
  const hist = useQuery({ queryKey: ['hours', filters], queryFn: () => endpoints.hours(filters) });
  const mix = useQuery({ queryKey: ['tperiod-mix', filters], queryFn: () => endpoints.tperiodMix(filters) });
  const byModel = useQuery({ queryKey: ['by-model-rel', filters], queryFn: () => endpoints.byModel(filters) });
  const metaQ = useQuery({ queryKey: ['meta'], queryFn: () => endpoints.meta() });
  const range = rangeLabel(filters, metaQ.data);

  const histData = useMemo(() => (hist.data || []).map((r: any) => ({
    bucket: HOURS_LABELS[String(r._id)] || String(r._id), n: r.n
  })), [hist.data]);

  const mixData = useMemo(() => {
    const map = new Map<string, any>();
    const tSet = new Set<string>();
    (mix.data || []).forEach((r: any) => {
      tSet.add(r.tPeriod);
      if (!map.has(r.model)) map.set(r.model, { model: r.model, total: 0 });
      const row = map.get(r.model);
      row[r.tPeriod] = (row[r.tPeriod] || 0) + r.n;
      row.total += r.n;
    });
    const tList = Array.from(tSet).sort();
    const data = Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 15);
    const norm = data.map(r => {
      const out: any = { model: r.model };
      tList.forEach(t => { out[t] = r.total ? (r[t] || 0) / r.total : 0; });
      return out;
    });
    return { data: norm, tList };
  }, [mix.data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard
        title="Hours-to-fail distribution"
        description="Claims by operating-hour bucket (null/'#' excluded)."
        info="Histogram of machine operating hours at the time of claim. Rows with '#' placeholder or values > 20,000 hrs are dropped during ingest as unreliable."
        formula="$bucket boundaries [0,25,50,100,250,500,1000,2500,5000,20000]"
        source="hours (cleaned)"
        rangeLabel={range}
        loading={hist.isLoading}
        bodyClassName="h-[340px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histData}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip formatter={(v: any) => fmtInt(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="n" name="Claims" fill={JCB.yellow} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="tPeriod mix per model (top 15)"
        description="DOA share = red. Higher T = later in warranty life."
        info="100% stacked bars showing warranty-period mix per model. tPeriod buckets: DOA, T000 (first weeks), T001-T006 (later in warranty life)."
        formula="share of count(*) GROUP BY (machineModel, tPeriod), normalised per model"
        source="machineModel, tPeriod"
        rangeLabel={range}
        loading={mix.isLoading}
        bodyClassName="h-[340px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mixData.data} layout="vertical" margin={{ left: 70 }}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
            <YAxis dataKey="model" type="category" width={180} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: any) => fmtPct(v)} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {mixData.tList.map(t => (
              <Bar key={t} dataKey={t} stackId="a" fill={T_COLOURS[t] || '#888'} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="DOA league table (all models)"
        info="Every model sorted by DOA rate. DOA = tPeriod 'DOA'. Worst-DOA family deserves a design / first-fit review."
        formula="count(tPeriod=='DOA')/count(*) GROUP BY machineModel"
        source="machineModel, tPeriod, claimOutcome"
        rangeLabel={range}
        loading={byModel.isLoading}
        className="lg:col-span-2"
        bodyClassName="max-h-[420px] overflow-auto p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead className="text-right">Claims</TableHead>
              <TableHead className="text-right">DOA rate</TableHead>
              <TableHead className="text-right">Reject</TableHead>
              <TableHead className="text-right">Z-Code</TableHead>
              <TableHead className="text-right">Accept</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(byModel.data || []).slice().sort((a: any, b: any) => b.doaRate - a.doaRate).map((r: any) => (
              <TableRow key={r.model}>
                <TableCell className="font-medium">{r.model}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(r.n)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={r.doaRate > 0.4 ? 'bad' : r.doaRate > 0.3 ? 'warn' : 'good'}>{fmtPct(r.doaRate)}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(r.rejectRate)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(r.zcodeRate)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPct(r.acceptRate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>
    </div>
  );
}
