export function ElevationChart({ elevations }: { elevations: number[] | null }) {
  if (!elevations || elevations.length < 2) return null;

  const w = 300;
  const h = 70;
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const span = max - min || 1;

  const pts = elevations.map((v, i) => {
    const x = (i / (elevations.length - 1)) * w;
    const y = h - 4 - ((v - min) / span) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = "M " + pts.join(" L ");
  const area = `${line} L ${w},${h} L 0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-[70px] w-full">
      <defs>
        <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#elevGrad)" />
      <path d={line} fill="none" stroke="#7C3AED" strokeWidth={2} />
    </svg>
  );
}
