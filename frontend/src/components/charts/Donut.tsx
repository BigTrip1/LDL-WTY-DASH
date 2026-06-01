interface Props {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

export default function Donut({ data, size = 140, thickness = 18, centerLabel, centerValue }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" stroke="#1a1a1a" strokeWidth={thickness} />
        {data.map((d, i) => {
          const dash = (d.value / total) * circumference;
          const arc = (
            <circle
              key={i}
              cx={c} cy={c} r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return arc;
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue && <div className="text-lg font-black text-foreground tabular-nums leading-none">{centerValue}</div>}
          {centerLabel && <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{centerLabel}</div>}
        </div>
      )}
    </div>
  );
}
