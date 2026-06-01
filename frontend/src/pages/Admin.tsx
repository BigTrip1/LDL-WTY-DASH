import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { CloudUpload, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { endpoints } from '@/lib/api';
import { fmtInt } from '@/lib/utils';
import Aurora from '@/components/reactbits/Aurora';
import FilterGroupsManager from '@/components/admin/FilterGroupsManager';

export default function Admin() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);

  const history = useQuery({ queryKey: ['upload-history'], queryFn: endpoints.uploadHistory });

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      toast.error('Only .csv files accepted');
      return;
    }
    setFile(f);
    setResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    maxSize: 200 * 1024 * 1024
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('no file');
      const form = new FormData();
      form.append('file', file);
      const xhr = new XMLHttpRequest();
      return new Promise<any>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch (e) { reject(new Error('bad response')); }
          } else reject(new Error(xhr.responseText || xhr.statusText));
        };
        xhr.onerror = () => reject(new Error('network error'));
        xhr.open('POST', '/api/upload');
        xhr.send(form);
      });
    },
    onSuccess: (data) => {
      setResult(data);
      setProgress(0);
      toast.success(`Inserted ${fmtInt(data.inserted)} new claims · ${fmtInt(data.skippedDuplicates)} duplicates skipped`);
      qc.invalidateQueries({ queryKey: ['upload-history'] });
      qc.invalidateQueries();
    },
    onError: (err: any) => {
      setProgress(0);
      toast.error(err.message || 'upload failed');
    }
  });

  return (
    <div className="relative">
      <Aurora />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-black mb-1">Admin</h1>
        <p className="text-xs text-muted-foreground mb-6">
          CSV ingest, deduplication, upload history, and custom filter-group management.
        </p>
        <h2 className="text-lg font-bold text-jcb-yellow mb-1">CSV upload</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Upload the standard <code className="text-foreground">claims.csv</code>. The pipeline parses, cleans, tags description text, and upserts on
          <code className="text-jcb-yellow"> claimNumber</code> — duplicates are automatically skipped, so re-uploading the same file is safe.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CloudUpload className="h-5 w-5 text-jcb-yellow" /> Drop or pick a CSV</CardTitle>
            <CardDescription>Maximum 200 MB. Format must match the LDL claims export (25 columns).</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors ${
                isDragActive ? 'border-jcb-yellow bg-jcb-yellow/5' : 'border-jcb-border hover:border-jcb-yellow/50'
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="h-10 w-10 text-jcb-yellow" />
              {file ? (
                <>
                  <div className="text-sm font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </>
              ) : (
                <>
                  <div className="text-sm">{isDragActive ? 'Drop here…' : 'Drag and drop, or click to choose'}</div>
                  <div className="text-xs text-muted-foreground">claims.csv</div>
                </>
              )}
            </div>

            {file && (
              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  {upload.isPending && <Progress value={progress} className="h-2" />}
                </div>
                <Button onClick={() => upload.mutate()} disabled={upload.isPending}>
                  {upload.isPending ? `Uploading… ${progress}%` : 'Ingest CSV'}
                </Button>
                <Button variant="outline" onClick={() => { setFile(null); setResult(null); }} disabled={upload.isPending}>
                  Clear
                </Button>
              </div>
            )}

            {result && (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Stat label="Received" n={result.received} tone="muted" />
                <Stat label="Inserted" n={result.inserted} tone="good" />
                <Stat label="Skipped (dupes)" n={result.skippedDuplicates} tone="warn" />
                <Stat label="Parse errors" n={result.parseErrors} tone={result.parseErrors > 0 ? 'bad' : 'muted'} />
                <Stat label="Duration" n={(result.durationMs / 1000).toFixed(1) + 's'} tone="muted" />
                {result.errorSamples?.length > 0 && (
                  <div className="col-span-full mt-2 text-xs">
                    <div className="flex items-center gap-1 text-amber-300 mb-1"><AlertTriangle className="h-3 w-3" /> Sample parse errors:</div>
                    <ul className="text-muted-foreground list-disc list-inside space-y-0.5 font-mono">
                      {result.errorSamples.map((e: string, i: number) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
                {result.parseErrors === 0 && (
                  <div className="col-span-full flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Clean ingest — no parse errors.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8">
          <h2 className="text-lg font-bold text-jcb-yellow mb-1">Filter groups</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Bundle multiple values into a single named chip that appears in the matching filter dropdown on the dashboard. For example, group all agricultural models under "Ag" so you can apply them in one click.
          </p>
          <FilterGroupsManager />
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Upload history</CardTitle>
            <CardDescription>Last 20 ingests</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Finished</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Inserted</TableHead>
                  <TableHead className="text-right">Dupes</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(history.data || []).map((r: any) => (
                  <TableRow key={r._id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.finishedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{r.filename}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtInt(r.received)}</TableCell>
                    <TableCell className="text-right tabular-nums"><Badge variant="good">{fmtInt(r.inserted)}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtInt(r.skippedDuplicates)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.parseErrors > 0 ? <Badge variant="bad">{fmtInt(r.parseErrors)}</Badge> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{(r.durationMs / 1000).toFixed(1)}s</TableCell>
                  </TableRow>
                ))}
                {history.data?.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-xs text-muted-foreground p-3">No uploads yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, n, tone }: { label: string; n: number | string; tone: 'bad' | 'warn' | 'good' | 'muted' }) {
  const colour = tone === 'bad' ? 'text-red-300' : tone === 'warn' ? 'text-jcb-yellow' : tone === 'good' ? 'text-emerald-300' : 'text-foreground';
  return (
    <div className="rounded-md border border-jcb-border bg-jcb-ink p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-xl font-black tabular-nums ${colour}`}>{typeof n === 'number' ? fmtInt(n) : n}</div>
    </div>
  );
}
