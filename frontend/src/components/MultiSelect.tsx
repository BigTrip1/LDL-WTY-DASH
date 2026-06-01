import { useMemo, useState } from 'react';
import { Check, ChevronDown, X, Info, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { endpoints, type FilterDimension, type FilterGroup } from '@/lib/api';

interface Props {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  className?: string;
  placeholder?: string;
  /** Optional plain-English explanation shown in a tooltip next to the label. */
  helpText?: string;
  /**
   * If set, MultiSelect fetches custom user-defined groups for this dimension
   * (`/api/groups?dimension=X`) and shows them as one-click pills at the top
   * of the popover. Picking a group adds every member value to the current
   * selection; tapping it again removes them. Manage groups in /admin.
   */
  dimension?: FilterDimension;
}

export default function MultiSelect({ label, options, value, onChange, className, placeholder, helpText, dimension }: Props) {
  const [q, setQ] = useState('');

  // Load custom groups for this dimension (only when one is supplied).
  const groupsQ = useQuery({
    queryKey: ['groups', dimension],
    queryFn: () => endpoints.groups(dimension!),
    enabled: !!dimension,
    staleTime: 30_000
  });
  const groups: FilterGroup[] = groupsQ.data?.items ?? [];

  const filtered = useMemo(() => {
    const lc = q.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(lc)).slice(0, 200);
  }, [q, options]);

  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);

  const applyGroup = (g: FilterGroup) => {
    // Toggle behaviour: if every value of the group is already selected,
    // remove them. Otherwise add (union with) all of them.
    const selected = new Set(value);
    const allIn = g.values.every(v => selected.has(v));
    if (allIn) {
      onChange(value.filter(v => !g.values.includes(v)));
    } else {
      const next = new Set(value);
      g.values.forEach(v => next.add(v));
      onChange(Array.from(next));
    }
  };

  const groupState = (g: FilterGroup): 'none' | 'partial' | 'full' => {
    const sel = new Set(value);
    const hit = g.values.filter(v => sel.has(v)).length;
    if (hit === 0) return 'none';
    if (hit === g.values.length) return 'full';
    return 'partial';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex h-8 items-center justify-between gap-1.5 rounded-md border border-jcb-border bg-jcb-ink px-2.5 text-xs',
            'hover:bg-jcb-surface transition-colors focus:outline-none focus:ring-2 focus:ring-jcb-yellow',
            'min-w-[110px] max-w-[220px]',
            className
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            <span className="text-muted-foreground">{label}</span>
            {value.length > 0 && (
              <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                {value.length}
              </Badge>
            )}
            {value.length === 0 && placeholder && <span className="text-muted-foreground/70">{placeholder}</span>}
          </span>
          <ChevronDown className="h-4 w-4 opacity-60 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium flex items-center gap-1.5">
            {label}
            {helpText && (
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label={`What is ${label}?`} className="text-muted-foreground/70 hover:text-jcb-yellow">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="max-w-[260px]">{helpText}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </span>
          {value.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="text-[10px] text-muted-foreground hover:text-jcb-yellow"
              title="Clear all"
            >
              <X className="h-3 w-3 inline mr-0.5" />clear
            </button>
          )}
        </div>

        {/* Group pills (only shown when a dimension is wired AND groups exist) */}
        {dimension && groups.length > 0 && (
          <div className="mb-2 border-b border-jcb-border pb-2">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
              <Layers className="h-2.5 w-2.5" /> Groups · click to apply
            </div>
            <div className="flex flex-wrap gap-1">
              {groups.map(g => {
                const state = groupState(g);
                return (
                  <button
                    key={g._id}
                    onClick={() => applyGroup(g)}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] transition-colors',
                      state === 'full'    && 'bg-jcb-yellow text-black border-jcb-yellow font-bold',
                      state === 'partial' && 'bg-jcb-yellow/15 border-jcb-yellow/60 text-jcb-yellow',
                      state === 'none'    && 'border-jcb-border text-foreground/85 hover:border-jcb-yellow/60 hover:text-jcb-yellow'
                    )}
                    title={`Expands to ${g.values.length} value${g.values.length === 1 ? '' : 's'}: ${g.values.slice(0, 8).join(', ')}${g.values.length > 8 ? ', …' : ''}`}
                  >
                    {state === 'full' && <Check className="h-2.5 w-2.5 inline -mt-0.5 mr-0.5" />}
                    {g.name}
                    <span className={cn('ml-1 text-[9px]', state === 'full' ? 'text-black/70' : 'text-muted-foreground/70')}>
                      ({g.values.length})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Input
          placeholder={`Search ${label.toLowerCase()}…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-8 text-xs mb-2"
        />
        <div
          className="flex flex-col gap-0.5 overflow-y-auto overscroll-contain pr-1"
          style={{ maxHeight: dimension && groups.length > 0 ? '15rem' : '18rem' }}
          onWheelCapture={(e) => e.stopPropagation()}
        >
          {filtered.length === 0 && <div className="text-xs text-muted-foreground p-2">No results</div>}
          {filtered.map(o => {
            const checked = value.includes(o);
            return (
              <button
                key={o}
                onClick={() => toggle(o)}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-jcb-surface shrink-0"
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border border-jcb-border shrink-0',
                    checked && 'bg-jcb-yellow border-jcb-yellow'
                  )}
                >
                  {checked && <Check className="h-3 w-3 text-black" />}
                </span>
                <span className="truncate">{o}</span>
              </button>
            );
          })}
          {options.length > filtered.length && (
            <div className="text-[10px] text-muted-foreground px-2 py-1 sticky bottom-0 bg-jcb-ink border-t border-jcb-border/60">
              showing {filtered.length} of {options.length} · search to refine
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
