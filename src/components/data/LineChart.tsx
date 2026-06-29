import * as React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface SeriesDatum {
  label: string;
  value: number;
}

export interface Series {
  name: string;
  data: SeriesDatum[];
  color?: string;
}

export interface LineChartProps {
  series: Series[];
  title?: string;
  showGrid?: boolean;
  showMarkers?: boolean;
  showLegend?: boolean;
  animationStyle?: "draw" | "fade-in";
  action?: Action;
}

export function LineChart({
  series,
  title,
  showGrid = true,
  showMarkers = true,
  showLegend = true,
  animationStyle = "draw",
}: LineChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const chartLeft = 140;
  const chartRight = 1780;
  const chartTop = title ? 200 : 120;
  const chartBottom = 920;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  // Collect all data points
  const allValues = series.flatMap((s) => s.data.map((d) => d.value));
  const maxValue = Math.max(...allValues, 1);
  const allLabels = series[0]?.data.map((d) => d.label) || [];
  const xStep = allLabels.length > 1 ? chartWidth / (allLabels.length - 1) : chartWidth;

  const gridLineCount = 5;
  const gridLines = Array.from({ length: gridLineCount + 1 }, (_, i) => ({
    value: (maxValue / gridLineCount) * i,
    y: chartBottom - (i / gridLineCount) * chartHeight,
  }));

  return (
    <svg viewBox="0 0 1920 1080" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      {title && (
        <text x={960} y={80} textAnchor="middle" fill={theme.colors.text}
          fontFamily={theme.fonts.heading} fontWeight={700} fontSize={48}>
          {title}
        </text>
      )}

      {/* Grid */}
      {showGrid && gridLines.map((line, i) => (
        <g key={`g-${i}`}>
          <line x1={chartLeft} y1={line.y} x2={chartRight} y2={line.y}
            stroke={theme.colors.border} strokeWidth={1}
            opacity={interpolate(frame, [0, 10], [0, 0.5], { extrapolateRight: "clamp" })} />
          <text x={chartLeft - 12} y={line.y + 5} textAnchor="end"
            fill={theme.colors.textMuted} fontFamily={theme.fonts.body} fontSize={20}>
            {formatValue(line.value)}
          </text>
        </g>
      ))}

      {/* Axes */}
      <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom}
        stroke={theme.colors.border} strokeWidth={2} />
      <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom}
        stroke={theme.colors.border} strokeWidth={2} />

      {/* X-axis labels */}
      {allLabels.map((label, i) => (
        <text key={i} x={chartLeft + i * xStep} y={chartBottom + 30} textAnchor="middle"
          fill={theme.colors.textMuted} fontFamily={theme.fonts.body} fontSize={16}>
          {label}
        </text>
      ))}

      {/* Series lines */}
      {series.map((s, si) => {
        const color = s.color || theme.colors.chart[si % theme.colors.chart.length];
        const points = s.data.map((d, i) => ({
          x: chartLeft + i * xStep,
          y: chartBottom - (d.value / maxValue) * chartHeight,
          value: d.value,
        }));

        const drawProgress = animationStyle === "draw"
          ? interpolate(frame, [si * 10, si * 10 + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          : interpolate(frame, [si * 10, si * 10 + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        const pathD = points.map((p, i) => {
          const visibleLength = Math.floor(points.length * drawProgress);
          if (i > visibleLength) return null;
          const prev = points[Math.min(i, Math.max(0, visibleLength - 1))];
          if (!prev) return null;
          return `${i === 0 ? "M" : "L"} ${prev.x} ${prev.y}`;
        }).filter(Boolean).join(" ");

        return (
          <g key={si}>
            {/* Line */}
            <path d={pathD} fill="none" stroke={color} strokeWidth={3}
              strokeLinecap="round" strokeLinejoin="round"
              opacity={interpolate(frame, [si * 10, si * 10 + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />

            {/* Area fill */}
            <path d={`${pathD} L ${points[points.length - 1]?.x || chartLeft} ${chartBottom} L ${points[0]?.x || chartLeft} ${chartBottom} Z`}
              fill={color} opacity={0.1} />

            {/* Markers */}
            {showMarkers && points.map((p, pi) => {
              const markerShow = frame >= si * 10 + pi * 2;
              return (
                <g key={pi} opacity={markerShow ? 1 : 0}>
                  <circle cx={p.x} cy={p.y} r={5} fill={color} stroke={theme.colors.background} strokeWidth={2} />
                  <text x={p.x} y={p.y - 12} textAnchor="middle" fill={theme.colors.text}
                    fontFamily={theme.fonts.body} fontSize={16} fontWeight={600}>
                    {formatValue(p.value)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Legend */}
      {showLegend && series.length > 1 && (
        <g transform={`translate(${chartRight - 200}, ${chartTop})`}>
          {series.map((s, i) => {
            const color = s.color || theme.colors.chart[i % theme.colors.chart.length];
            return (
              <g key={i} transform={`translate(0, ${i * 30})`}>
                <rect x={0} y={0} width={16} height={16} rx={3} fill={color} />
                <text x={22} y={13} fill={theme.colors.text} fontFamily={theme.fonts.body} fontSize={14}>{s.name}</text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return Math.floor(v).toLocaleString();
}
