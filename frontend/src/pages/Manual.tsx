import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { renderMarkdown } from '@/lib/markdown';

interface ManualItem { id: string; title: string }

const fetchJson = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
};

const fetchText = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.text();
};

export default function Manual() {
  const [sp, setSp] = useSearchParams();
  const toc = useQuery<{ items: ManualItem[] }>({ queryKey: ['manual-toc'], queryFn: () => fetchJson('/api/manual') });

  // Active section comes from ?s=01-getting-started, else first item.
  const items = toc.data?.items || [];
  const requestedId = sp.get('s');
  const activeId = useMemo(() => {
    if (!items.length) return null;
    if (requestedId && items.some(i => i.id === requestedId)) return requestedId;
    return items[0].id;
  }, [items, requestedId]);

  const section = useQuery<string>({
    queryKey: ['manual-section', activeId],
    queryFn: () => fetchText(`/api/manual/${activeId}`),
    enabled: !!activeId
  });

  const setActive = (id: string) => {
    const u = new URLSearchParams(sp);
    u.set('s', id);
    setSp(u, { replace: true });
    // Scroll the article back to the top.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync the document title so browser tabs show which section is open.
  useEffect(() => {
    const active = items.find(i => i.id === activeId);
    if (active) document.title = `WTY · Manual · ${active.title}`;
    return () => { document.title = 'WTY - Warranty Telehandler Yard'; };
  }, [activeId, items]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6 flex gap-6">
      {/* Sidebar TOC */}
      <aside className="no-print w-72 shrink-0">
        <div className="sticky top-24">
          <div className="rounded-md border border-jcb-border bg-jcb-ink p-4">
            <div className="text-[11px] uppercase tracking-widest text-jcb-yellow mb-3 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Operation manual
            </div>
            {toc.isLoading && <Skeleton className="h-40 w-full" />}
            {toc.isError && <div className="text-xs text-red-300">Could not load manual TOC.</div>}
            <ul className="space-y-0.5">
              {items.map(it => (
                <li key={it.id}>
                  <button
                    onClick={() => setActive(it.id)}
                    className={`block w-full text-left text-xs rounded-md px-2 py-1.5 transition-colors ${
                      activeId === it.id
                        ? 'bg-jcb-yellow/15 text-jcb-yellow font-semibold ring-1 ring-inset ring-jcb-yellow/30'
                        : 'text-foreground/90 hover:bg-jcb-surface hover:text-jcb-yellow'
                    }`}
                  >
                    {it.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            <Button variant="outline" size="sm" className="h-8 w-full text-[11px] justify-start" onClick={() => window.print()}>
              <Printer className="h-3 w-3" /> Print this section
            </Button>
            <a
              href="/api/manual"
              className="text-[10px] text-muted-foreground hover:text-jcb-yellow px-2"
              title="Raw JSON listing of all manual sections"
            >
              Raw TOC JSON
            </a>
          </div>
        </div>
      </aside>

      {/* Content */}
      <article className="flex-1 min-w-0 manual-article">
        <Card>
          <CardContent className="p-6">
            {section.isLoading && <Skeleton className="h-96 w-full" />}
            {section.isError && (
              <div className="text-sm text-red-300">
                Failed to load section: {(section.error as Error).message}
              </div>
            )}
            {section.data && (
              <div
                className="wty-md max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(section.data) }}
              />
            )}
          </CardContent>
        </Card>

        {/* Prev / next nav */}
        {items.length > 1 && activeId && (
          <div className="no-print mt-4 flex items-center justify-between text-xs">
            {(() => {
              const idx = items.findIndex(i => i.id === activeId);
              const prev = idx > 0 ? items[idx - 1] : null;
              const next = idx < items.length - 1 ? items[idx + 1] : null;
              return (
                <>
                  {prev ? (
                    <button onClick={() => setActive(prev.id)} className="text-muted-foreground hover:text-jcb-yellow">
                      ← {prev.title}
                    </button>
                  ) : <span />}
                  {next ? (
                    <button onClick={() => setActive(next.id)} className="text-muted-foreground hover:text-jcb-yellow">
                      {next.title} →
                    </button>
                  ) : <span />}
                </>
              );
            })()}
          </div>
        )}
      </article>
    </div>
  );
}
