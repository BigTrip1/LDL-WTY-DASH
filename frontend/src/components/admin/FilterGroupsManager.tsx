import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Layers, Plus, Pencil, Trash2, Save, X, Check, Search, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  endpoints,
  type FilterDimension,
  type FilterGroup,
  FILTER_DIMENSIONS,
  DIMENSION_LABEL
} from '@/lib/api';
import { cn, fmtInt } from '@/lib/utils';

/**
 * Admin tool for creating named groups of filter values.
 *
 * Example: pick Model dimension -> tick 540V140, 535V125, 532V125 ->
 * name "Ag" -> save. The "Ag" group then appears as a one-click chip
 * inside the Model filter dropdown on the dashboard.
 */
export default function FilterGroupsManager() {
  const qc = useQueryClient();
  const [dimension, setDimension] = useState<FilterDimension>('model');

  const meta = useQuery({ queryKey: ['meta'], queryFn: () => endpoints.meta() });
  const groups = useQuery({
    queryKey: ['groups', dimension],
    queryFn: () => endpoints.groups(dimension)
  });

  const options: string[] = useMemo(() => {
    const m = meta.data || {};
    switch (dimension) {
      case 'model':    return m.models ?? [];
      case 'country':  return m.countries ?? [];
      case 'supplier': return m.suppliers ?? [];
      case 'area':     return m.areas ?? [];
      case 'tPeriod':  return m.tPeriods ?? [];
      case 'outcome':  return m.outcomes ?? [];
      case 'dealer':   return m.dealers ?? [];
      case 'vetter':   return m.vetters ?? [];
      case 'theme':    return m.themes ?? [];
      case 'customer': return m.customers ?? [];
      case 'tags':     return m.tags ?? [];
      default:         return [];
    }
  }, [meta.data, dimension]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-jcb-yellow" /> Filter groups
        </CardTitle>
        <CardDescription>
          Create named groups of values (e.g. "Ag" = all agricultural models). Saved groups
          appear as one-click chips inside the matching filter dropdown on the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Dimension selector */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Working on:</span>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_DIMENSIONS.map(d => (
              <button
                key={d}
                onClick={() => setDimension(d)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs transition-colors',
                  dimension === d
                    ? 'border-jcb-yellow bg-jcb-yellow/10 text-jcb-yellow font-semibold'
                    : 'border-jcb-border text-muted-foreground hover:text-foreground hover:border-jcb-yellow/50'
                )}
              >
                {DIMENSION_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: existing groups for this dimension */}
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
              Existing groups · {DIMENSION_LABEL[dimension]}
            </div>
            <ExistingGroups
              dimension={dimension}
              groups={groups.data?.items ?? []}
              options={options}
              loading={groups.isLoading}
            />
          </div>

          {/* RIGHT: builder for new groups */}
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
              Create new group · {DIMENSION_LABEL[dimension]}
            </div>
            <GroupBuilder
              dimension={dimension}
              options={options}
              loadingOptions={meta.isLoading}
              onCreated={() => qc.invalidateQueries({ queryKey: ['groups', dimension] })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =================================================================
//  Existing groups list (with inline edit + delete)
// =================================================================
function ExistingGroups({
  dimension, groups, options, loading
}: {
  dimension: FilterDimension;
  groups: FilterGroup[];
  options: string[];
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-32 w-full" />;
  if (groups.length === 0) {
    return (
      <div className="rounded-md border border-jcb-border bg-jcb-ink p-4 text-xs text-muted-foreground text-center">
        No groups yet for {DIMENSION_LABEL[dimension]}. Use the form on the right to create one.
      </div>
    );
  }
  return (
    <ul className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
      {groups.map(g => (
        <GroupRow key={g._id} group={g} options={options} dimension={dimension} />
      ))}
    </ul>
  );
}

function GroupRow({ group, options, dimension }: { group: FilterGroup; options: string[]; dimension: FilterDimension }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [selected, setSelected] = useState<string[]>(group.values);

  const save = useMutation({
    mutationFn: () => endpoints.updateGroup(group._id, { name: name.trim(), values: selected }),
    onSuccess: () => {
      toast.success(`Updated "${name.trim()}"`);
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['groups', dimension] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const del = useMutation({
    mutationFn: () => endpoints.deleteGroup(group._id),
    onSuccess: () => {
      toast.success(`Deleted "${group.name}"`);
      qc.invalidateQueries({ queryKey: ['groups', dimension] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  if (editing) {
    return (
      <li className="rounded-md border border-jcb-yellow/50 bg-jcb-yellow/5 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs" placeholder="Group name" />
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !name.trim() || selected.length === 0}>
            <Save className="h-3 w-3" /> Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setEditing(false); setName(group.name); setSelected(group.values); }}>
            <X className="h-3 w-3" /> Cancel
          </Button>
        </div>
        <OptionPicker options={options} selected={selected} onChange={setSelected} compact />
      </li>
    );
  }

  return (
    <li className="rounded-md border border-jcb-border bg-jcb-ink p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-jcb-yellow truncate">{group.name}</span>
            <Badge variant="warn" className="text-[10px]">{fmtInt(group.values.length)} values</Badge>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            updated {new Date(group.updatedAt).toLocaleDateString()}
          </div>
          <div className="mt-2 flex flex-wrap gap-1 max-h-16 overflow-y-auto">
            {group.values.slice(0, 12).map(v => (
              <span key={v} className="rounded-sm border border-jcb-border bg-jcb-surface px-1.5 py-0.5 text-[10px] text-foreground/85">
                {v}
              </span>
            ))}
            {group.values.length > 12 && (
              <span className="text-[10px] text-muted-foreground self-center">+{group.values.length - 12} more</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} title="Edit group">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              if (window.confirm(`Delete group "${group.name}"?\n\nThe ${group.values.length} individual values are not deleted, just the named bundle.`)) {
                del.mutate();
              }
            }}
            title="Delete group"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-300" />
          </Button>
        </div>
      </div>
    </li>
  );
}

// =================================================================
//  New-group builder
// =================================================================
function GroupBuilder({
  dimension, options, loadingOptions, onCreated
}: {
  dimension: FilterDimension;
  options: string[];
  loadingOptions: boolean;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: () => endpoints.createGroup({ dimension, name: name.trim(), values: selected }),
    onSuccess: () => {
      toast.success(`Created group "${name.trim()}" with ${selected.length} values`);
      setName('');
      setSelected([]);
      onCreated();
    },
    onError: (e: any) => toast.error(e.message)
  });

  // Reset selection when dimension changes (otherwise we'd carry over stale picks).
  // Note: deps include `dimension` so this fires once per switch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => { setSelected([]); setName(''); }, [dimension]);

  const canSave = name.trim().length > 0 && selected.length > 0;

  return (
    <div className="rounded-md border border-jcb-border bg-jcb-ink p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-8 text-xs"
          placeholder={`Name (e.g. "Ag", "EU", "Top dealers")`}
          maxLength={40}
        />
        <Button size="sm" onClick={() => create.mutate()} disabled={!canSave || create.isPending}>
          <Plus className="h-3 w-3" /> {create.isPending ? 'Saving…' : 'Save group'}
        </Button>
      </div>
      <div className="text-[10px] text-muted-foreground">
        {selected.length === 0
          ? `Pick one or more ${DIMENSION_LABEL[dimension].toLowerCase()} values below.`
          : `${selected.length} value${selected.length === 1 ? '' : 's'} selected.`}
      </div>
      {loadingOptions
        ? <Skeleton className="h-48 w-full" />
        : <OptionPicker options={options} selected={selected} onChange={setSelected} />}
    </div>
  );
}

// =================================================================
//  Reusable search-and-pick list
// =================================================================
function OptionPicker({
  options, selected, onChange, compact = false
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  compact?: boolean;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const lc = q.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(lc));
  }, [options, q]);
  const sel = new Set(selected);
  const toggle = (v: string) => {
    if (sel.has(v)) onChange(selected.filter(x => x !== v));
    else onChange([...selected, v]);
  };
  const selectAll  = () => onChange(Array.from(new Set([...selected, ...filtered])));
  const clearAll   = () => onChange(selected.filter(v => !filtered.includes(v)));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={`Search ${options.length} options…`}
            className="h-7 text-xs pl-7"
          />
        </div>
        <button onClick={selectAll}  className="text-[10px] text-jcb-yellow hover:underline">Select all{q && ' (filtered)'}</button>
        <button onClick={clearAll}   className="text-[10px] text-muted-foreground hover:text-jcb-yellow">Clear{q && ' (filtered)'}</button>
      </div>
      <div
        className={cn(
          'rounded-md border border-jcb-border bg-jcb-surface',
          compact ? 'max-h-40' : 'max-h-72',
          'overflow-y-auto'
        )}
      >
        {filtered.length === 0 && <div className="p-3 text-[11px] text-muted-foreground">No matches.</div>}
        <ul className="divide-y divide-jcb-border">
          {filtered.map(v => (
            <li key={v}>
              <button
                onClick={() => toggle(v)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-2 py-1.5 text-xs text-left hover:bg-jcb-yellow/5 transition-colors',
                  sel.has(v) && 'bg-jcb-yellow/10'
                )}
              >
                <span className="truncate" title={v}>{v}</span>
                {sel.has(v) && <Check className="h-3 w-3 text-jcb-yellow shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
