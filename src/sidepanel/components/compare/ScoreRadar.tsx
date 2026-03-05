import React, { useEffect, useState, useRef } from 'react';

export interface RadarDataPoint {
  axis: string;
  value: number; // 0-100
}

export interface RadarSeries {
  label: string;
  color: string;
  data: RadarDataPoint[];
}

interface ScoreRadarProps {
  series: RadarSeries[];
  size?: number;
  showLegend?: boolean;
  animated?: boolean;
}

const SERIES_COLORS = ['#5c7cfa', '#51cf66', '#fcc419', '#ff6b6b', '#cc5de8', '#20c997'];

export const ScoreRadar: React.FC<ScoreRadarProps> = ({
  series,
  size = 240,
  showLegend = true,
  animated = true,
}) => {
  const [progress, setProgress] = useState(animated ? 0 : 1);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!animated) {
      setProgress(1);
      return;
    }

    let start: number | null = null;
    const duration = 800;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const p = Math.min(elapsed / duration, 1);
      // Ease out cubic
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animated]);

  if (series.length === 0 || series[0].data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-gray-500 py-8">
        No data available
      </div>
    );
  }

  const axes = series[0].data.map((d) => d.axis);
  const numAxes = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = (size / 2) * 0.75;
  const levels = 5;

  const angleStep = (2 * Math.PI) / numAxes;
  const startAngle = -Math.PI / 2;

  function getPoint(axisIndex: number, value: number): { x: number; y: number } {
    const angle = startAngle + axisIndex * angleStep;
    const r = (value / 100) * maxR * progress;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  function getLabelPoint(axisIndex: number): { x: number; y: number } {
    const angle = startAngle + axisIndex * angleStep;
    const r = maxR + 18;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  // Grid lines
  const gridPaths: string[] = [];
  for (let lvl = 1; lvl <= levels; lvl++) {
    const r = (lvl / levels) * maxR;
    const points: string[] = [];
    for (let i = 0; i < numAxes; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    gridPaths.push(`M${points.join('L')}Z`);
  }

  // Axis lines
  const axisLines = Array.from({ length: numAxes }, (_, i) => {
    const angle = startAngle + i * angleStep;
    return {
      x1: cx,
      y1: cy,
      x2: cx + maxR * Math.cos(angle),
      y2: cy + maxR * Math.sin(angle),
    };
  });

  // Data polygons
  const polygons = series.map((s, si) => {
    const points = s.data
      .map((d, di) => {
        const pt = getPoint(di, d.value);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');
    return {
      points,
      color: s.color || SERIES_COLORS[si % SERIES_COLORS.length],
      label: s.label,
    };
  });

  return (
    <div className="flex flex-col items-center gap-3 animate-in">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Grid */}
        {gridPaths.map((path, i) => (
          <path
            key={`grid-${i}`}
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.5}
            className="text-dark-3/40"
            strokeDasharray={i === levels - 1 ? undefined : '2,2'}
          />
        ))}

        {/* Axes */}
        {axisLines.map((line, i) => (
          <line
            key={`axis-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="currentColor"
            strokeWidth={0.5}
            className="text-dark-3/30"
          />
        ))}

        {/* Data polygons */}
        {polygons.map((poly, i) => (
          <g key={`poly-${i}`}>
            <polygon
              points={poly.points}
              fill={`${poly.color}15`}
              stroke={poly.color}
              strokeWidth={1.5}
              strokeLinejoin="round"
              style={{
                filter: `drop-shadow(0 0 6px ${poly.color}30)`,
              }}
            />
            {/* Data points */}
            {series[i].data.map((d, di) => {
              const pt = getPoint(di, d.value);
              return (
                <circle
                  key={`dot-${i}-${di}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={3}
                  fill={poly.color}
                  stroke="#1a1b1e"
                  strokeWidth={1.5}
                />
              );
            })}
          </g>
        ))}

        {/* Labels */}
        {axes.map((axis, i) => {
          const pt = getLabelPoint(i);
          const angle = startAngle + i * angleStep;
          const isRight = Math.cos(angle) > 0.1;
          const isLeft = Math.cos(angle) < -0.1;
          const textAnchor = isRight ? 'start' : isLeft ? 'end' : 'middle';

          return (
            <text
              key={`label-${i}`}
              x={pt.x}
              y={pt.y}
              textAnchor={textAnchor}
              dominantBaseline="central"
              className="fill-gray-400"
              style={{ fontSize: '9px', fontWeight: 500 }}
            >
              {axis}
            </text>
          );
        })}

        {/* Center score labels (on hover) */}
        {levels > 0 &&
          [20, 40, 60, 80, 100].map((val, i) => {
            const r = ((i + 1) / levels) * maxR;
            return (
              <text
                key={`score-${i}`}
                x={cx + 3}
                y={cy - r + 3}
                className="fill-gray-600"
                style={{ fontSize: '7px' }}
              >
                {val}
              </text>
            );
          })}
      </svg>

      {showLegend && series.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {series.map((s, i) => {
            const color = s.color || SERIES_COLORS[i % SERIES_COLORS.length];
            return (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-gray-400 font-medium truncate max-w-[80px]">
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
