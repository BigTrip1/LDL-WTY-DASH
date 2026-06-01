import { Line } from 'recharts';
import { TPERIOD_GROUP_LINES } from '@/lib/tPeriodGroups';

/** DOA + T1 + T3 + T6 rate lines for cohort trend charts (Y domain 0–1). */
export default function CohortPeriodLines({ yAxisId }: { yAxisId?: string | number }) {
  return (
    <>
      {TPERIOD_GROUP_LINES.map(g => (
        <Line
          key={g.dataKey}
          {...(yAxisId !== undefined ? { yAxisId } : {})}
          type="monotone"
          dataKey={g.dataKey}
          name={g.name}
          stroke={g.color}
          strokeWidth={2}
          dot={false}
        />
      ))}
    </>
  );
}
