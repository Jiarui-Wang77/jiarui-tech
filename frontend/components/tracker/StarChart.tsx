"use client";

import { useMemo } from "react";
import type { RepoSnapshot } from "@/lib/api";

type Props = {
  snapshots: RepoSnapshot[];
  /** Chart height in px */
  height?: number;
  locale: string;
};

/**
 * Lightweight SVG line chart of a repo's star count over time.
 * No external deps — hand-rolled so we don't ship recharts/chart.js.
 */
export default function StarChart({ snapshots, height = 200, locale }: Props) {
  const isZh = locale === "zh";

  const chart = useMemo(() => {
    if (snapshots.length < 2) return null;

    const values = snapshots.map((s) => s.stars_count);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 800; // viewBox width; svg is scaled responsively
    const chartTop = 20;
    const chartBottom = height - 30;
    const chartLeft = 50;
    const chartRight = width - 20;
    const chartW = chartRight - chartLeft;
    const chartH = chartBottom - chartTop;

    const points = snapshots.map((s, i) => {
      const x = chartLeft + (i / (snapshots.length - 1)) * chartW;
      const y = chartBottom - ((s.stars_count - min) / range) * chartH;
      return { x, y, value: s.stars_count, date: s.captured_at };
    });

    // Smooth path
    const pathD = points
      .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
      .join(" ");

    // Area fill path (path + bottom line back to start)
    const areaD = `${pathD} L ${points[points.length - 1].x},${chartBottom} L ${points[0].x},${chartBottom} Z`;

    // Y-axis ticks (5 even divisions)
    const ticks = Array.from({ length: 5 }, (_, i) => {
      const v = min + (range * (4 - i)) / 4;
      const y = chartTop + (chartH * i) / 4;
      return { v: Math.round(v), y };
    });

    return { points, pathD, areaD, ticks, width, chartLeft, chartRight, chartTop, chartBottom };
  }, [snapshots, height]);

  if (!chart) {
    return (
      <div
        className="flex items-center justify-center text-slate-500 text-sm bg-slate-900/40 border border-slate-800 rounded-2xl"
        style={{ height }}
      >
        {isZh ? "数据点不足，至少需要 2 次快照" : "Need at least 2 snapshots to plot"}
      </div>
    );
  }

  const fmtNum = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
      <svg
        viewBox={`0 0 ${chart.width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="star-area-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(34,211,238,0.45)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {chart.ticks.map((t, i) => (
          <line
            key={i}
            x1={chart.chartLeft}
            x2={chart.chartRight}
            y1={t.y}
            y2={t.y}
            stroke="rgba(100,116,139,0.15)"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ))}

        {/* Y-axis labels */}
        {chart.ticks.map((t, i) => (
          <text
            key={i}
            x={chart.chartLeft - 8}
            y={t.y + 4}
            textAnchor="end"
            fontSize="11"
            fill="#64748b"
            fontFamily="monospace"
          >
            {fmtNum(t.v)}
          </text>
        ))}

        {/* Area fill */}
        <path d={chart.areaD} fill="url(#star-area-fill)" />

        {/* Line */}
        <path
          d={chart.pathD}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.4))" }}
        />

        {/* Data points + tooltips on hover */}
        {chart.points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill="#22d3ee" stroke="#0f172a" strokeWidth={1.5}>
              <title>
                {new Date(p.date).toLocaleDateString(isZh ? "zh-CN" : "en-US")} — ⭐{" "}
                {p.value.toLocaleString()}
              </title>
            </circle>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500 font-mono">
        <span>
          {new Date(chart.points[0].date).toLocaleDateString(isZh ? "zh-CN" : "en-US")}
        </span>
        <span>
          {isZh ? "⭐ 星数轨迹" : "⭐ Star trajectory"} · {chart.points.length} pts
        </span>
        <span>
          {new Date(chart.points[chart.points.length - 1].date).toLocaleDateString(
            isZh ? "zh-CN" : "en-US"
          )}
        </span>
      </div>
    </div>
  );
}
