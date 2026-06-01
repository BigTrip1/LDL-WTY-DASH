interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
}

export default function Sparkline({ values, width = 120, height = 32, color = '#FCB026', fill = 'rgba(252,176,38,0.18)' }: Props) {
  if (!values || values.length === 0) return <span className="text-muted-foreground text-[10px]">no data</span>;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const pts = values.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2] as [number, number]);
  const d = 'M ' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ');
  const dArea = d + ` L ${width.toFixed(1)} ${height} L 0 ${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <path d={dArea} fill={fill} stroke="none" />
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.2} fill={color} />
    </svg>
  );
}
