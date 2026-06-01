import { ReferenceLine } from 'recharts';

export const REGIME_DATE_MS = new Date('2025-01-01T00:00:00Z').getTime();

interface Props {
  xValue?: string | number;
  label?: string;
}

export default function RegimeLine({ xValue = REGIME_DATE_MS, label = 'New vetting regime' }: Props) {
  return (
    <ReferenceLine
      x={xValue}
      stroke="#FCB026"
      strokeDasharray="4 3"
      strokeWidth={1.5}
      label={{ value: label, position: 'top', fill: '#FCB026', fontSize: 10, fontWeight: 600 }}
    />
  );
}
