import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRY_COORDS, COUNTRY_NAME_TO_ATLAS, project } from '@/lib/countryCoords';
import { COUNTRY_SHAPES, WORLD_CANVAS } from '@/lib/worldShapes';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Info, ZoomIn, ZoomOut, Home } from 'lucide-react';
import { fmtInt, fmtPct } from '@/lib/utils';

interface CountryRow { country: string; n: number; acceptRate?: number }

interface Props {
  rows: CountryRow[];
  onPick?: (country: string) => void;
  /** Show choropleth fill in addition to the bubble overlay. Default true. */
  choropleth?: boolean;
}

const BUBBLE_GREEN = '#22C55E';
const BUBBLE_AMBER = '#FCB026';
const BUBBLE_RED   = '#EF4444';

function bubbleColor(acceptRate: number | undefined): string {
  if (acceptRate === undefined || acceptRate === null) return '#888';
  if (acceptRate < 0.7) return BUBBLE_RED;
  if (acceptRate < 0.85) return BUBBLE_AMBER;
  return BUBBLE_GREEN;
}

function choroplethFill(n: number, max: number): string {
  if (n <= 0) return '#1a1a1a';
  const t = Math.min(1, Math.sqrt(n / max));
  const r = Math.round(20 + (252 - 20) * t);
  const g = Math.round(20 + (176 - 20) * t);
  const b = Math.round(22 + (38 - 22) * t);
  return `rgb(${r},${g},${b})`;
}

const SHAPE_BY_NAME = new Map(COUNTRY_SHAPES.map(c => [c.name, c.paths]));

// The full world map is 1000x500 (lat -90..+90 -> y 0..500). We crop the empty
// polar regions for the default view: top of Greenland is ~y=30 (lat 75°N),
// southern tip of South America is ~y=440 (lat 55°S). Antarctica is dropped.
const INITIAL_VIEW = { x: 0, y: 30, w: 1000, h: 410 };
const MIN_VIEW_SIZE = 80;       // closest zoom: viewBox ~80 wide  (=> 12.5x zoom)
const MAX_VIEW_W    = 1000;     // furthest zoom: full crop

export default function WorldBubbleMap({ rows, onPick, choropleth = true }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState(INITIAL_VIEW);
  const dragRef = useRef<{ startX: number; startY: number; startView: typeof INITIAL_VIEW } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { placed, byAtlasName, max, missing } = useMemo(() => {
    const max = rows.reduce((m, r) => Math.max(m, r.n), 0) || 1;
    const byAtlasName = new Map<string, CountryRow>();
    for (const r of rows) {
      const atlasName = COUNTRY_NAME_TO_ATLAS[r.country] ?? r.country;
      const existing = byAtlasName.get(atlasName);
      if (existing) {
        existing.n += r.n;
        if (existing.acceptRate !== undefined && r.acceptRate !== undefined) {
          existing.acceptRate = (existing.acceptRate + r.acceptRate) / 2;
        }
      } else {
        byAtlasName.set(atlasName, { ...r });
      }
    }
    const placed: Array<CountryRow & { x: number; y: number; radius: number }> = [];
    for (const r of rows) {
      const coord = COUNTRY_COORDS[r.country];
      if (!coord) continue;
      const [x, y] = project(coord[0], coord[1], WORLD_CANVAS.width, WORLD_CANVAS.height);
      const radius = 5 + 22 * Math.sqrt(r.n / max);
      placed.push({ ...r, x, y, radius });
    }
    placed.sort((a, b) => b.radius - a.radius);
    const missing = rows.filter(r => !COUNTRY_COORDS[r.country]).map(r => r.country);
    return { placed, byAtlasName, max, missing };
  }, [rows]);

  // Bubble + label scale relative to zoom level so they don't bloat/shrink.
  const zoomRatio = view.w / INITIAL_VIEW.w;
  const scale = Math.max(0.35, Math.min(1.5, zoomRatio));

  // ---------- Interaction handlers -------------------------------------------
  // Translate a client-coordinate point into SVG-space (the current viewBox).
  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const x = view.x + ((clientX - r.left) / r.width) * view.w;
    const y = view.y + ((clientY - r.top) / r.height) * view.h;
    return { x, y };
  }, [view]);

  const zoomBy = useCallback((factor: number, anchorClientX?: number, anchorClientY?: number) => {
    setView(prev => {
      const newW = Math.max(MIN_VIEW_SIZE, Math.min(MAX_VIEW_W, prev.w * factor));
      const newH = newW * (prev.h / prev.w);
      // Zoom toward the cursor if we have an anchor; otherwise toward centre.
      let anchorX = prev.x + prev.w / 2;
      let anchorY = prev.y + prev.h / 2;
      const svg = svgRef.current;
      if (svg && anchorClientX !== undefined && anchorClientY !== undefined) {
        const r = svg.getBoundingClientRect();
        anchorX = prev.x + ((anchorClientX - r.left) / r.width) * prev.w;
        anchorY = prev.y + ((anchorClientY - r.top) / r.height) * prev.h;
      }
      // Keep the anchor under the cursor by scaling around it.
      const t = newW / prev.w;
      const x = anchorX - (anchorX - prev.x) * t;
      const y = anchorY - (anchorY - prev.y) * t;
      // Clamp so the user can't pan into the void (allow a small margin)
      const cx = Math.max(-newW * 0.15, Math.min(WORLD_CANVAS.width - newW * 0.85, x));
      const cy = Math.max(-newH * 0.15, Math.min(WORLD_CANVAS.height - newH * 0.85, y));
      return { x: cx, y: cy, w: newW, h: newH };
    });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    // 10% per wheel notch; inverted so wheel-up zooms in.
    const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    zoomBy(factor, e.clientX, e.clientY);
  }, [zoomBy]);

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startView: view };
    setIsDragging(true);
  }, [view]);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const dx = (e.clientX - drag.startX) * (drag.startView.w / r.width);
    const dy = (e.clientY - drag.startY) * (drag.startView.h / r.height);
    setView({
      x: drag.startView.x - dx,
      y: drag.startView.y - dy,
      w: drag.startView.w,
      h: drag.startView.h
    });
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    setIsDragging(false);
    try { (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId); } catch {}
  }, []);

  const reset = useCallback(() => setView(INITIAL_VIEW), []);

  // Double-click resets.
  const onDoubleClick = useCallback(() => reset(), [reset]);

  // Keep `dragRef` alive across renders without forcing extra re-renders.
  useEffect(() => () => { dragRef.current = null; }, []);

  // ---------- Render --------------------------------------------------------
  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid slice"
        className="block w-full h-full select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        role="img"
        aria-label="World map of claim counts by country (drag to pan, wheel to zoom)"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onDoubleClick}
      >
        {/* Ocean background */}
        <rect x={-2000} y={-2000} width={6000} height={6000} fill="#0a0e16" />

        {/* Faint graticule (10° spacing now that we can zoom in) */}
        <g stroke="#13192a" strokeWidth={0.4} fill="none">
          {Array.from({ length: 17 }, (_, i) => i * 30 + 30).map(y => (
            <line key={`h${y}`} x1={0} y1={y * WORLD_CANVAS.height / 540} x2={WORLD_CANVAS.width} y2={y * WORLD_CANVAS.height / 540} />
          ))}
          {Array.from({ length: 11 }, (_, i) => i * 100).map(x => (
            <line key={`v${x}`} x1={x} y1={0} x2={x} y2={WORLD_CANVAS.height} />
          ))}
          <line x1={0} y1={WORLD_CANVAS.height / 2} x2={WORLD_CANVAS.width} y2={WORLD_CANVAS.height / 2} stroke="#1f2738" strokeWidth={0.7} />
          <line x1={WORLD_CANVAS.width / 2} y1={0} x2={WORLD_CANVAS.width / 2} y2={WORLD_CANVAS.height} stroke="#1f2738" strokeWidth={0.7} />
        </g>

        {/* Country shapes */}
        <g pointerEvents="visible">
          {COUNTRY_SHAPES.map(c => {
            const data = byAtlasName.get(c.name);
            const fill = choropleth && data ? choroplethFill(data.n, max) : '#1c2434';
            return c.paths.map((d, i) => (
              <path
                key={`${c.name}-${i}`}
                d={d}
                fill={fill}
                stroke="#2a334a"
                strokeWidth={Math.max(0.3, 0.5 * zoomRatio)}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              >
                <title>
                  {c.name}{data ? `: ${fmtInt(data.n)} claims${data.acceptRate !== undefined ? ` · ${fmtPct(data.acceptRate)} accept` : ''}` : ''}
                </title>
              </path>
            ));
          })}
        </g>

        {/* Bubbles */}
        <g>
          {placed.map(p => {
            const r = p.radius * scale;
            return (
              <g
                key={p.country}
                transform={`translate(${p.x},${p.y})`}
                className={onPick ? 'cursor-pointer' : ''}
                onClick={onPick && !isDragging ? (e) => { e.stopPropagation(); onPick(p.country); } : undefined}
              >
                <circle r={r * 1.4} fill={bubbleColor(p.acceptRate)} fillOpacity={0.10} />
                <circle
                  r={r}
                  fill={bubbleColor(p.acceptRate)}
                  fillOpacity={0.72}
                  stroke="#fff"
                  strokeOpacity={0.85}
                  strokeWidth={0.8}
                  vectorEffect="non-scaling-stroke"
                >
                  <title>
                    {p.country}: {fmtInt(p.n)} claims
                    {p.acceptRate !== undefined ? ` · ${fmtPct(p.acceptRate)} accept` : ''}
                    {onPick ? ' · click to filter' : ''}
                  </title>
                </circle>
                {r >= 14 && (
                  <text
                    textAnchor="middle"
                    dy={3.5 * scale}
                    fontSize={9 * scale}
                    fontWeight={800}
                    fill="#0a0e16"
                    pointerEvents="none"
                  >
                    {fmtInt(p.n)}
                  </text>
                )}
                {r >= 18 && (
                  <text
                    textAnchor="middle"
                    y={r + 11 * scale}
                    fontSize={9 * scale}
                    fontWeight={600}
                    fill="#e5e7eb"
                    pointerEvents="none"
                    style={{ paintOrder: 'stroke', stroke: '#0a0e16', strokeWidth: 2 }}
                  >
                    {p.country.length > 18 ? p.country.slice(0, 16) + '…' : p.country}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom + pan controls (top-right) */}
      <div className="absolute right-2 top-2 flex flex-col gap-1 rounded-md border border-jcb-border bg-jcb-ink/95 p-1 backdrop-blur">
        <ZoomBtn label="Zoom in"  onClick={() => zoomBy(1 / 1.4)}><ZoomIn  className="h-3.5 w-3.5" /></ZoomBtn>
        <ZoomBtn label="Zoom out" onClick={() => zoomBy(1.4)}><ZoomOut className="h-3.5 w-3.5" /></ZoomBtn>
        <ZoomBtn label="Reset"    onClick={reset}><Home    className="h-3.5 w-3.5" /></ZoomBtn>
      </div>

      {/* Legend (bottom-right) */}
      <div className="absolute right-2 bottom-2 flex flex-wrap items-center gap-3 rounded-md border border-jcb-border bg-jcb-ink/95 px-3 py-1.5 text-[10px] backdrop-blur">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: BUBBLE_GREEN }} /> Accept &ge; 85%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: BUBBLE_AMBER }} /> 70-85%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: BUBBLE_RED }} /> &lt; 70%
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">bubble = claim count</span>
        {choropleth && (
          <>
            <span className="text-muted-foreground">|</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              fill <span className="inline-block h-2 w-4" style={{ background: 'linear-gradient(to right, #14141a, #FCB026)' }} />
            </span>
          </>
        )}
      </div>

      {/* Pan/zoom hint (top-left) */}
      <div className="absolute left-2 top-2 rounded-md border border-jcb-border bg-jcb-ink/95 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur pointer-events-none">
        drag to pan · wheel to zoom · double-click to reset
      </div>

      {/* Zoom indicator (bottom-left) - hidden at default zoom */}
      {Math.abs(view.w - INITIAL_VIEW.w) > 1 && (
        <div className="absolute left-2 bottom-2 rounded-md border border-jcb-border bg-jcb-ink/95 px-2 py-1 text-[10px] text-jcb-yellow backdrop-blur font-mono">
          {(INITIAL_VIEW.w / view.w).toFixed(1)}x
        </div>
      )}

      {missing.length > 0 && (
        <TooltipProvider delayDuration={120}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="absolute left-20 bottom-2 inline-flex items-center gap-1 rounded-md border border-jcb-border bg-jcb-ink/95 px-2 py-1 text-[10px] text-muted-foreground hover:text-jcb-yellow backdrop-blur">
                <Info className="h-3 w-3" /> {missing.length} not placed
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]" side="top" align="start">
              <div className="text-[10px] mb-1">No coordinates for: {missing.join(', ')}</div>
              <div className="text-[10px] text-muted-foreground">
                Add to <code>frontend/src/lib/countryCoords.ts</code> to place them on the map.
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

function ZoomBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded p-1 text-muted-foreground hover:text-jcb-yellow hover:bg-jcb-yellow/10 transition-colors"
    >
      {children}
    </button>
  );
}
