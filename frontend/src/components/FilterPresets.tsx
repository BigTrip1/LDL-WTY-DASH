import { useEffect, useState } from 'react';
import { Bookmark, Star, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Filters } from '@/lib/api';

const KEY = 'wty.filterPresets.v1';

interface Preset { name: string; filters: Filters }

function load(): Preset[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}
function save(p: Preset[]) { localStorage.setItem(KEY, JSON.stringify(p)); }

export default function FilterPresets({ current, onApply }: { current: Filters; onApply: (f: Filters) => void }) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [name, setName] = useState('');
  useEffect(() => { setPresets(load()); }, []);

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = [...presets.filter(p => p.name !== trimmed), { name: trimmed, filters: current }];
    save(next); setPresets(next); setName('');
  };
  const remove = (n: string) => {
    const next = presets.filter(p => p.name !== n);
    save(next); setPresets(next);
  };
  const activeKeys = Object.entries(current).filter(([_, v]) => Array.isArray(v) ? v.length : !!v);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]">
          <Bookmark className="h-3 w-3" /> Presets {presets.length > 0 && <span className="text-jcb-yellow">({presets.length})</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="text-xs font-medium mb-1">Save current filter</div>
        <div className="flex items-center gap-1 mb-3">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="name…" className="h-7 text-xs"
            onKeyDown={e => { if (e.key === 'Enter') add(); }} />
          <Button size="sm" className="h-7 px-2 text-[11px]" onClick={add} disabled={!name.trim() || !activeKeys.length}>Save</Button>
        </div>
        {!activeKeys.length && <div className="text-[10px] text-muted-foreground mb-2">Apply some filters first.</div>}
        <div className="text-xs font-medium mb-1">Saved</div>
        {presets.length === 0 && <div className="text-[10px] text-muted-foreground">No presets yet.</div>}
        <div className="flex flex-col gap-0.5 max-h-60 overflow-auto">
          {presets.map(p => (
            <div key={p.name} className="flex items-center justify-between rounded-sm px-2 py-1 hover:bg-jcb-surface group">
              <button onClick={() => onApply(p.filters)} className="flex-1 text-left text-xs flex items-center gap-1.5">
                <Star className="h-3 w-3 text-jcb-yellow" />
                <span>{p.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  ({Object.values(p.filters).reduce((acc: number, v: any) => acc + (Array.isArray(v) ? v.length : v ? 1 : 0), 0)} filters)
                </span>
              </button>
              <button onClick={() => remove(p.name)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
