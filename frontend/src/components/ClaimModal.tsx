import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Hash, Truck, Calendar, MapPin, User, Tag } from 'lucide-react';
import { endpoints } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtDate, fmtInt, OUTCOME_COLORS } from '@/lib/utils';

interface Props { claimNumber: number | null; onClose: () => void }

export default function ClaimModal({ claimNumber, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['claim', claimNumber],
    queryFn: () => endpoints.claim(claimNumber!),
    enabled: claimNumber !== null
  });
  const related = useQuery({
    queryKey: ['related-serial', data?.serial, claimNumber],
    queryFn: () => endpoints.relatedBySerial(data.serial, claimNumber!, 50),
    enabled: !!data?.serial
  });

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  if (claimNumber === null) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[840px] h-full bg-jcb-ink border-l-2 border-jcb-yellow overflow-y-auto">
        <div className="sticky top-0 bg-jcb-ink/95 backdrop-blur border-b border-jcb-border px-6 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-jcb-yellow" />
            <span className="font-mono text-sm">{claimNumber}</span>
            {data?.claimOutcome && (
              <Badge style={{ background: OUTCOME_COLORS[data.claimOutcome] || '#888', color: '#000' }}>
                {data.claimOutcome}
              </Badge>
            )}
            {data?.regime && <Badge variant="ghost">{data.regime}</Badge>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-jcb-yellow"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {isLoading && <Skeleton className="h-64 w-full" />}
          {data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <Field icon={<Truck className="h-3 w-3" />} label="Model"        value={data.machineModel} />
                <Field icon={<Truck className="h-3 w-3" />} label="Variant"      value={data.model} />
                <Field icon={<Hash className="h-3 w-3" />}  label="Serial"       value={data.serial} mono />
                <Field icon={<Calendar className="h-3 w-3" />} label="Built"     value={fmtDate(data.buildDate)} />
                <Field icon={<Calendar className="h-3 w-3" />} label="Failed"    value={fmtDate(data.failDate)} />
                <Field icon={<Calendar className="h-3 w-3" />} label="Claimed"   value={fmtDate(data.claimDate)} />
                <Field icon={<Calendar className="h-3 w-3" />} label="Vetted"    value={fmtDate(data.vettedDate)} />
                <Field icon={<User className="h-3 w-3" />}     label="Vetted by" value={data.vettedBy} />
                <Field icon={<MapPin className="h-3 w-3" />}   label="Country"   value={data.country} />
                <Field                                       label="Dealer"    value={data.dealer} />
                <Field                                       label="Customer"  value={data.customer} />
                <Field                                       label="tPeriod"   value={data.tPeriod} />
                <Field                                       label="Hours"     value={data.hours} />
                <Field                                       label="Area"      value={data.area} />
                <Field                                       label="ASD"       value={data.asd} />
                <Field                                       label="Theme"     value={data.theme} />
                <Field                                       label="Detection" value={data.detection} />
                <Field                                       label="Supplier"  value={data.partSupplier} />
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Failed part</div>
                <div className="font-mono text-xs">{data.failedPart || '–'}</div>
              </div>

              {data.descriptionTags?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1"><Tag className="h-3 w-3" /> Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {data.descriptionTags.map((t: string) => <Badge key={t} variant="warn">{t}</Badge>)}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Description</div>
                <div className="rounded-md border border-jcb-border bg-black/40 p-3 text-xs whitespace-pre-wrap leading-relaxed">{data.description || '–'}</div>
                {(data.description?.length ?? 0) >= 600 && (
                  <div className="text-[10px] text-jcb-yellow mt-1">⚠ Source description field hard-capped at 600 chars — may be truncated upstream.</div>
                )}
              </div>

              {data.vettersNotes && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Vetter notes</div>
                  <div className="rounded-md border border-jcb-border bg-black/40 p-3 text-xs whitespace-pre-wrap leading-relaxed">{data.vettersNotes}</div>
                </div>
              )}

              <div className="pt-4 border-t border-jcb-border">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Other claims on serial <span className="text-jcb-yellow font-mono">{data.serial}</span>
                  {related.data && <span className="ml-2 text-muted-foreground">({fmtInt(related.data.total - 1)} more)</span>}
                </div>
                {related.isLoading && <Skeleton className="h-24 w-full" />}
                {related.data && related.data.rows.length === 0 && <div className="text-xs text-muted-foreground">No other claims for this serial.</div>}
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {(related.data?.rows || []).map((r: any) => (
                    <div key={r._id} className="rounded-md border border-jcb-border/60 px-2 py-1.5 hover:bg-jcb-surface cursor-pointer text-xs flex items-center justify-between gap-2"
                         onClick={() => window.dispatchEvent(new CustomEvent('wty:open-claim', { detail: r._id }))}>
                      <span className="font-mono text-jcb-yellow w-24 shrink-0">{r._id}</span>
                      <span className="text-muted-foreground whitespace-nowrap w-20">{fmtDate(r.vettedDate)}</span>
                      <span className="w-28 shrink-0"><Badge variant="ghost">{r.tPeriod}</Badge></span>
                      <span className="w-32 truncate text-muted-foreground">{r.area}</span>
                      <span className="flex-1 truncate text-muted-foreground">{(r.description || '').slice(0, 120)}</span>
                      <Badge variant="ghost">{r.claimOutcome || '–'}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, value, mono }: { icon?: React.ReactNode; label: string; value: any; mono?: boolean }) {
  return (
    <div className="rounded-md border border-jcb-border bg-black/40 p-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className={`mt-0.5 text-foreground ${mono ? 'font-mono' : ''}`}>{value === null || value === undefined || value === '' ? '–' : String(value)}</div>
    </div>
  );
}
