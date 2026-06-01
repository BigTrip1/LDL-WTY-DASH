import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download, Printer, FileText } from 'lucide-react';
import { renderMarkdown } from '@/lib/markdown';

export default function ReportTab() {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['report-md'], queryFn: endpoints.reportMarkdown });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-jcb-ink/95 backdrop-blur border-b border-jcb-border px-4 py-2">
          <div className="text-xs text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-jcb-yellow" /> REPORT.md · long-form analysis</div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-7 px-2 text-[11px]">
              <a href="/api/report" download="WTY-REPORT.md"><Download className="h-3 w-3" /> Download .md</a>
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => window.print()}>
              <Printer className="h-3 w-3" /> Print / Save PDF
            </Button>
          </div>
        </div>
        <div className="p-6">
          {isLoading && <Skeleton className="h-96 w-full" />}
          {isError && <div className="text-sm text-red-300">Failed to load report: {(error as Error).message}</div>}
          {data && (
            <article
              className="wty-md max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(data) }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
