import { Line } from 'recharts';
import { TPERIOD_GROUP_LINES } from '@/lib/tPeriodGroups';

/** DOA + T1 + T3 + T6 rate lines (Y domain 0–1). Matches Admin tPeriod filter groups. */
export default function CohortPeriodLines({
  yAxisId,
  lineType = 'monotone'
}: {
  yAxisId?: string | number;
  /** Use `linear` for categorical X-axes (e.g. model league). */
  lineType?: 'monotone' | 'linear';
}) {
  return (
    <>
      {TPERIOD_GROUP_LINES.map(g => (
        <Line
          key={g.dataKey}
          {...(yAxisId !== undefined ? { yAxisId } : {})}
          type={lineType}
          dataKey={g.dataKey}
          name={g.name}
          stroke={g.color}
          strokeWidth={2}
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
      ))}
    </>
  );
}
