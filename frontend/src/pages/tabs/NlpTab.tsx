import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from 'recharts';
// keep Legend import (used in both LineChart and BarChart below)
import { endpoints, type Filters } from '@/lib/api';
import ChartCard from '@/components/charts/ChartCard';
import RegimeLine from '@/components/charts/RegimeLine';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JCB, fmtInt, fmtPct, fmtMonth, cn, rangeLabel } from '@/lib/utils';

export default function NlpTab({ filters }: { filters: Filters; setFilters?: (f: Filters) => void }) {
  const tags = useQuery({ queryKey: ['desc-tags', filters], queryFn: () => endpoints.descriptionTags(filters) });
  const uni = useQuery({ queryKey: ['desc-uni', filters], queryFn: () => endpoints.descriptionNgrams(filters, 1, 60) });
  const bi  = useQuery({ queryKey: ['desc-bi',  filters], queryFn: () => endpoints.descriptionNgrams(filters, 2, 60) });
  const cooc = useQuery({ queryKey: ['tag-cooc', filters], queryFn: () => endpoints.tagCooccurrence(filters, 15) });
  const vetterNotes = useQuery({ queryKey: ['vetters-notes', filters], queryFn: () => endpoints.vettersNotes(filters) });
  const anom = useQuery({ queryKey: ['anom-nlp', filters], queryFn: () => endpoints.anomalies(filters) });
  const metaQ = useQuery({ queryKey: ['meta'], queryFn: () => endpoints.meta() });
  const range = rangeLabel(filters, metaQ.data);

  const top12 = useMemo(() => (tags.data || []).slice(0, 12).map((r: any) => r.tag), [tags.data]);
  const [selected, setSelected] = useState<string[] | null>(null);
  const active = selected ?? top12.slice(0, 5);

  const trend = useQuery({
    queryKey: ['desc-trend', filters, active],
    queryFn: () => endpoints.descriptionTrend(filters, active),
    enabled: active.length > 0
  });

  const trendData = useMemo(() => {
    const m = new Map<number, any>();
    (trend.data || []).forEach((r: any) => {
      const ts = +new Date(r.ym);
      if (!m.has(ts)) m.set(ts, { ts });
      m.get(ts)[r.tag] = r.n;
    });
    return Array.from(m.values()).sort((a, b) => a.ts - b.ts);
  }, [trend.data]);

  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const search = useQuery({
    queryKey: ['desc-search', filters, submitted],
    queryFn: () => endpoints.descriptionSearch(filters, submitted, 30),
    enabled: !!submitted
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {anom.data?.descTruncated > 0 && (
        <div className="lg:col-span-3 rounded-md border border-jcb-yellow/40 bg-jcb-yellow/10 px-3 py-2 text-xs text-jcb-yellow flex items-center gap-2">
          <span className="font-bold">⚠</span>
          The source <code className="text-foreground">description</code> field is hard-capped at <strong>600 chars</strong>. {fmtInt(anom.data.descTruncated)} of {fmtInt(anom.data.total)} claims in the current filter are at or above the cap and may be truncated upstream. Bigram counts on those rows are partial.
        </div>
      )}

      <ChartCard
        title="Description tag cloud"
        description="Controlled-vocab hits across claim narratives."
        info="Each tag is a controlled-vocabulary hit applied during ingest from a regex dictionary (oil-leak, hydraulic, valve, hose, loose, travel-site, etc.). Click to add to the trend chart below."
        formula="count(*) GROUP BY descriptionTags (multikey unwind)"
        source="descriptionTags (derived from description)"
        rangeLabel={range}
        loading={tags.isLoading}
        className="lg:col-span-2"
      >
        <div className="flex flex-wrap items-center gap-2 p-2">
          {(tags.data || []).map((t: any) => {
            const maxN = (tags.data || [])[0]?.n || 1;
            const scale = 0.7 + 1.6 * (t.n / maxN);
            const isActive = active.includes(t.tag);
            return (
              <button
                key={t.tag}
                onClick={() => {
                  const next = isActive ? active.filter((x: string) => x !== t.tag) : [...active, t.tag];
                  setSelected(next);
                }}
                style={{ fontSize: `${scale}rem`, lineHeight: 1.1 }}
                className={cn(
                  'rounded-md px-2 py-1 transition-colors font-semibold',
                  isActive ? 'bg-jcb-yellow text-black' : 'text-jcb-yellow/80 hover:text-jcb-yellow hover:bg-jcb-surface'
                )}
                title={`${t.tag} · ${fmtInt(t.n)} claims · ${fmtPct(t.acceptRate)} accept`}
              >
                {t.tag}
                <span className="ml-1 text-[10px] opacity-70 align-top">{fmtInt(t.n)}</span>
              </button>
            );
          })}
        </div>
      </ChartCard>

      <ChartCard
        title="Tag frequency"
        description="By claim count"
        info="Same source as the cloud above but sortable as a bar chart for precise rank comparison."
        source="descriptionTags"
        rangeLabel={range}
        loading={tags.isLoading}
        bodyClassName="h-[360px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={(tags.data || []).slice(0, 20)} layout="vertical" margin={{ left: 70 }}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis type="number" />
            <YAxis dataKey="tag" type="category" width={120} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="n" name="Claim mentions" fill={JCB.yellow} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Top n-grams"
        description="Tokenised, stop-words removed."
        info="Unigrams and bigrams computed at ingest by lowercasing descriptions, stripping ~80 stop-words, dropping tokens shorter than 3 chars, then counting."
        source="descriptionTokens / descriptionBigrams (derived)"
        rangeLabel={range}
        loading={uni.isLoading || bi.isLoading}
        className="lg:col-span-1"
      >
        <Tabs defaultValue="uni">
          <TabsList>
            <TabsTrigger value="uni">Unigrams</TabsTrigger>
            <TabsTrigger value="bi">Bigrams</TabsTrigger>
          </TabsList>
          <TabsContent value="uni">
            <NgramTable rows={uni.data || []} />
          </TabsContent>
          <TabsContent value="bi">
            <NgramTable rows={bi.data || []} />
          </TabsContent>
        </Tabs>
      </ChartCard>

      <ChartCard
        title="Tag trend (selected)"
        description="Monthly mentions for tags clicked above. Reference line = Jan 2025."
        info="Time series of selected tags. Useful for spotting emerging symptom themes or watching a known issue subside after a fix."
        formula="count(*) GROUP BY (month(vettedDate), tag) WHERE tag IN selected"
        source="vettedDate, descriptionTags"
        rangeLabel={range}
        loading={trend.isLoading}
        className="lg:col-span-2"
        bodyClassName="h-[360px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid stroke="#1a1a1a" />
            <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']} scale="time" tickFormatter={(v) => fmtMonth(new Date(v))} />
            <YAxis />
            <Tooltip labelFormatter={(v) => fmtMonth(new Date(v as number))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {active.map((t: string, i: number) => (
              <Line key={t} type="monotone" dataKey={t} stroke={lineColor(i)} strokeWidth={2} dot={false} connectNulls />
            ))}
            <RegimeLine />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Tag co-occurrence (top 15 tags)"
        description="Which symptom tags appear together in the same claim. Higher = stronger system-level interaction."
        info="Pair counts among the top 15 tags. Strong pairs reveal system-level interactions (e.g., oil-leak + hose + loose almost always co-occur)."
        formula="for each claim with ≥2 tags, count unordered pairs"
        source="descriptionTags"
        rangeLabel={range}
        loading={cooc.isLoading}
        className="lg:col-span-2"
        bodyClassName="max-h-[420px] overflow-auto p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag A</TableHead>
              <TableHead>Tag B</TableHead>
              <TableHead className="text-right">Co-occurrences</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(cooc.data?.pairs || []).slice(0, 40).map((p: any, i: number) => (
              <TableRow key={i}>
                <TableCell><span className="rounded bg-jcb-yellow/15 text-jcb-yellow px-1.5 py-0.5 text-[10px]">{p.a}</span></TableCell>
                <TableCell><span className="rounded bg-jcb-yellow/15 text-jcb-yellow px-1.5 py-0.5 text-[10px]">{p.b}</span></TableCell>
                <TableCell className="text-right tabular-nums">{fmtInt(p.n)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>

      <ChartCard
        title="Vetter notes — top tokens"
        description={`Mined from up to 8k most-recent vetter notes${vetterNotes.data?.sampledDocs ? ` (sampled ${fmtInt(vetterNotes.data.sampledDocs)})` : ''}. Surfaces vetter-side language patterns.`}
        info="On-demand tokenisation of the Vetters notes field (vs the indexed description). Limited to recent 8k docs for responsiveness."
        formula="tokenise(vettersNotes); strip stop-words; rank"
        source="vettersNotes"
        rangeLabel={range}
        loading={vetterNotes.isLoading}
        className="lg:col-span-1"
        bodyClassName="max-h-[420px] overflow-auto p-0"
      >
        <Table>
          <TableBody>
            {(vetterNotes.data?.rows || []).slice(0, 60).map((r: any) => (
              <TableRow key={r.token}>
                <TableCell className="text-xs">{r.token}</TableCell>
                <TableCell className="text-right text-xs tabular-nums text-jcb-yellow">{fmtInt(r.n)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ChartCard>

      <ChartCard
        title="Free-text claim search"
        description="Mongo text-index over the description column. Matching claim narratives below. Click any row to open detail."
        info="Type a phrase (e.g. 'boom shimming') and press Search to find the top 25 most-relevant claim narratives by Mongo text-index score. Click any row to open the full claim detail in a side drawer."
        formula="text-index search on description; sorted by $meta:'textScore' descending"
        source="description (text-indexed)"
        className="lg:col-span-3"
        right={
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(q); }} className="flex items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder='e.g. "boom shimming"' className="w-[280px]" />
            <Button type="submit" size="sm">Search</Button>
          </form>
        }
      >
        {!submitted && <div className="text-xs text-muted-foreground p-2">Enter a query and press Search.</div>}
        {submitted && (
          <div className="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Description (excerpt)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(search.data || []).map((r: any) => (
                  <TableRow key={r._id} className="cursor-pointer"
                    onClick={() => window.dispatchEvent(new CustomEvent('wty:open-claim', { detail: r._id }))}>
                    <TableCell className="font-mono text-xs">{r._id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{r.vettedDate ? fmtMonth(r.vettedDate) : '–'}</TableCell>
                    <TableCell className="text-xs">{r.machineModel}</TableCell>
                    <TableCell><Badge variant="ghost">{r.claimOutcome || '–'}</Badge></TableCell>
                    <TableCell className="text-[10px] text-jcb-yellow/80">{(r.descriptionTags || []).slice(0, 4).join(', ')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[520px]">{(r.description || '').slice(0, 220)}{(r.description || '').length > 220 ? '…' : ''}</TableCell>
                  </TableRow>
                ))}
                {search.data?.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-xs text-muted-foreground p-3">No matches.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function NgramTable({ rows }: { rows: any[] }) {
  return (
    <div className="max-h-[360px] overflow-auto">
      <Table>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.token + i}>
              <TableCell className="text-xs">{r.token}</TableCell>
              <TableCell className="text-right text-xs tabular-nums text-jcb-yellow">{fmtInt(r.n)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function lineColor(i: number) {
  const palette = ['#FCB026', '#22C55E', '#EF4444', '#60A5FA', '#A78BFA', '#F472B6', '#FBBF24', '#34D399', '#F87171', '#38BDF8'];
  return palette[i % palette.length];
}
