"use client";

import { useMemo } from "react";

type Series = {
  name: string;
  color: string;
  values: number[];   // same length as `axes`
};

type Props = {
  axes: string[];         // e.g. ["Coding", "Academic", "Office", "Lifestyle"]
  series: Series[];       // 1-3 models to overlay
  size?: number;          // px; chart is square
  maxValue?: number;      // default 100
};

/**
 * Pure-SVG radar chart — no external deps.
 * Supports overlaying up to 3 series for comparison.
 */
export default function RadarChart({ axes, series, size = 320, maxValue = 100 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const n = axes.length;

  // Axis anchor points (where each corner sits on the outer ring)
  const axisPoints = useMemo(() => {
    return axes.map((_, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        angle,
      };
    });
  }, [axes, cx, cy, radius, n]);

  // Concentric gridlines (4 rings: 25, 50, 75, 100)
  const rings = [0.25, 0.5, 0.75, 1];

  const gridPolys = rings.map((r) => {
    const pts = axisPoints
      .map((p) => {
        const x = cx + (p.x - cx) * r;
        const y = cy + (p.y - cy) * r;
        return `${x},${y}`;
      })
      .join(" ");
    return pts;
  });

  // Series polygons
  const seriesPolys = series.map((s) => {
    const pts = s.values.map((v, i) => {
      const r = Math.max(0, Math.min(1, v / maxValue));
      const p = axisPoints[i];
      const x = cx + (p.x - cx) * r;
      const y = cy + (p.y - cy) * r;
      return { x, y };
    });
    return { ...s, points: pts };
  });

  // Axis label positions (slightly outside the outer ring)
  const labelRadius = radius + 24;
  const labelPoints = axes.map((_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return {
      x: cx + labelRadius * Math.cos(angle),
      y: cy + labelRadius * Math.sin(angle),
      anchor:
        Math.abs(Math.cos(angle)) < 0.1
          ? "middle"
          : Math.cos(angle) > 0
          ? "start"
          : "end",
    };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto select-none">
      {/* Grid */}
      {gridPolys.map((poly, i) => (
        <polygon
          key={i}
          points={poly}
          fill={i === gridPolys.length - 1 ? "rgba(15,23,42,0.25)" : "none"}
          stroke="rgba(100,116,139,0.25)"
          strokeWidth={1}
          strokeDasharray={i === gridPolys.length - 1 ? undefined : "3 3"}
        />
      ))}

      {/* Axis spokes */}
      {axisPoints.map((p, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke="rgba(100,116,139,0.3)"
          strokeWidth={1}
        />
      ))}

      {/* Series polygons */}
      {seriesPolys.map((s, idx) => {
        const pointsStr = s.points.map((p) => `${p.x},${p.y}`).join(" ");
        return (
          <g key={idx}>
            <polygon
              points={pointsStr}
              fill={s.color}
              fillOpacity={0.2}
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 6px ${s.color}44)` }}
            />
            {s.points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3}
                fill={s.color}
                stroke="white"
                strokeWidth={1.5}
              >
                <title>
                  {s.name} — {axes[i]}: {s.values[i].toFixed(1)}
                </title>
              </circle>
            ))}
          </g>
        );
      })}

      {/* Axis labels */}
      {axes.map((label, i) => (
        <text
          key={i}
          x={labelPoints[i].x}
          y={labelPoints[i].y}
          textAnchor={labelPoints[i].anchor}
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="700"
          fill="#64748b"
          fontFamily="ui-sans-serif, system-ui"
        >
          {label}
        </text>
      ))}

      {/* Ring scale (25/50/75/100) */}
      {rings.map((r, i) => (
        <text
          key={i}
          x={cx + 3}
          y={cy - radius * r}
          fontSize="9"
          fill="rgba(100,116,139,0.7)"
          fontFamily="ui-monospace, monospace"
        >
          {Math.round(maxValue * r)}
        </text>
      ))}
    </svg>
  );
}
