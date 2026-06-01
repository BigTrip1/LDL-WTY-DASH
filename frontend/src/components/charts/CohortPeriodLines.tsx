import { Line } from 'recharts';
import { TPERIOD_GROUP_LINES } from '@/lib/tPeriodGroups';

export type CohortPeriodLinesProps = {
  yAxisId?: string | number;
  /** Use `linear` for categorical X-axes (e.g. model league). */
  lineType?: 'monotone' | 'linear';
};

/**
 * Recharts only registers chart primitives that are *direct* children of
 * ComposedChart/LineChart — not lines nested inside a wrapper component.
 * Call this function inside the chart: {cohortPeriodLines({ yAxisId: 'right' })}
 */
export function cohortPeriodLines({
  yAxisId,
  lineType = 'monotone'
}: CohortPeriodLinesProps = {}) {
  return TPERIOD_GROUP_LINES.map(g => (
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
  ));
}

/** @deprecated Use cohortPeriodLines() as direct children of the chart. */
export default function CohortPeriodLines(props: CohortPeriodLinesProps) {
  return <>{cohortPeriodLines(props)}</>;
}
