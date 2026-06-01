import { useMemo } from 'react';
import { fmtInt } from '@/lib/utils';

interface Day { date: string; n: number }
interface Props { days: Day[]; cellSize?: number; gap?: number }

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarHeatmap({ days, cellSize = 11, gap = 2 }: Props) {
  const { weeks, max, monthStarts } = useMemo(() => {
    if (!days.length) return { weeks: [] as Day[][], max: 0, monthStarts: [] as Array<{ col: number; label: string }> };
    // Build a 7-row x N-col grid: column = week of the year, row = day of week.
    // We pad the leading days of the first week with nulls so Sunday lines up
    // with the top row regardless of which weekday the range starts on.
    const first = new Date(days[0].date + 'T00:00:00Z');
    const lead = first.getUTCDay(); // 0 = Sun
    const padded: Array<Day | null> = Array(lead).fill(null).concat(days);
    const weeks: Array<Array<Day | null>> = [];
    for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
    let max = 0;
    days.forEach(d => { if (d.n > max) max = d.n; });

    // Month boundary labels - put a tick when a column's first non-null day is day 1 of any month.
    const monthStarts: Array<{ col: number; label: string }> = [];
    weeks.forEach((w, col) => {
      const firstDay = w.find(Boolean);
      if (firstDay) {
        const dt = new Date(firstDay.date + 'T00:00:00Z');
        if (dt.getUTCDate() <= 7 && (col === 0 || !monthStarts.length || monthStarts[monthStarts.length - 1].label !== monthLabel(dt))) {
          monthStarts.push({ col, label: monthLabel(dt) });
        }
      }
    });
    return { weeks: weeks as Day[][], max, monthStarts };
  }, [days]);

  const colour = (n: number) => {
    if (n === 0) return '#181818';
    const t = max > 0 ? n / max : 0;
    // Yellow scale: dark -> JCB yellow
    const alpha = 0.18 + 0.82 * t;
    return `rgba(252, 176, 38, ${alpha})`;
  };

  const width = weeks.length * (cellSize + gap) + 30;
  const height = 7 * (cellSize + gap) + 25;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="block">
        {/* Day-of-week labels on the left, only Mon/Wed/Fri to save space */}
        {[1, 3, 5].map(row => (
          <text
            key={row} x={0} y={20 + row * (cellSize + gap) + cellSize - 1}
            fontSize={9} fill="#888"
          >
            {DOW_LABELS[row]}
          </text>
        ))}
        {/* Month ticks along the top */}
        {monthStarts.map((m, i) => (
          <text
            key={i}
            x={28 + m.col * (cellSize + gap)}
            y={10}
            fontSize={9}
            fill="#aaa"
          >
            {m.label}
          </text>
        ))}
        {/* Cells */}
        {weeks.map((week, col) => week.map((day, row) => {
          if (!day) return null;
          return (
            <rect
              key={`${col}-${row}`}
              x={28 + col * (cellSize + gap)}
              y={18 + row * (cellSize + gap)}
              width={cellSize} height={cellSize}
              fill={colour(day.n)}
              rx={1.5}
            >
              <title>{day.date}: {fmtInt(day.n)} claim{day.n === 1 ? '' : 's'}</title>
            </rect>
          );
        }))}
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map(t => (
          <span key={t} className="inline-block h-3 w-3 rounded-sm" style={{ background: t === 0 ? '#181818' : `rgba(252,176,38,${0.18 + 0.82 * t})` }} />
        ))}
        <span>More</span>
        <span className="ml-3">Max: {fmtInt(max)}/day</span>
      </div>
    </div>
  );
}

function monthLabel(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
}
