import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface BarDatum {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarDatum[];
  title?: string;
  colors?: string[];
  showGrid?: boolean;
  showValues?: boolean;
  animationStyle?: "grow-up" | "slide-in" | "pop";
  action?: Action;
}

export function BarChart({
  data,
  title,
  colors: customColors,
  showGrid = true,
  showValues = true,
  animationStyle = "grow-up",
}: BarChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const colors = customColors || theme.colors.chart;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartLeft = 140;
  const chartRight = 1780;
  const chartTop = title ? 160 : 80;
  const chartBottom = 920;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  const barGap = 12;
  const barCount = data.length;
  const totalGap = barGap * (barCount + 1);
  const barWidth = Math.min((chartWidth - totalGap) / barCount, 120);
  const actualTotalWidth = barCount * barWidth + (barCount + 1) * barGap;
  const offsetX = chartLeft + (chartWidth - actualTotalWidth) / 2;

  const gridLineCount = 5;
  const gridLines = Array.from({ length: gridLineCount + 1 }, (_, i) => ({
    value: (maxValue / gridLineCount) * i,
    y: chartBottom - (i / gridLineCount) * chartHeight,
  }));

  return (
    <svg viewBox="0 0 1920 1080" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      {/* Title */}
      {title && (
        <text x={960} y={80} textAnchor="middle" fill={theme.colors.text}
          fontFamily={theme.fonts.heading} fontWeight={700} fontSize={48}
          opacity={spring({ frame, fps, config: { damping: 20 } })}
        >
          {title}
        </text>
      )}

      {/* Grid */}
      {showGrid && gridLines.map((line, i) => {
        const opacity = interpolate(frame, [0, 10], [0, 0.6], { extrapolateRight: "clamp" });
        return (
          <g key={`g-${i}`}>
            <line x1={chartLeft} y1={line.y} x2={chartRight} y2={line.y}
              stroke={theme.colors.border} strokeWidth={1} opacity={opacity} />
            <text x={chartLeft - 12} y={line.y + 5} textAnchor="end"
              fill={theme.colors.textMuted} fontFamily={theme.fonts.body} fontSize={20} opacity={opacity}>
              {formatValue(line.value)}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom}
        stroke={theme.colors.border} strokeWidth={2}
        opacity={interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" })} />
      <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom}
        stroke={theme.colors.border} strokeWidth={2}
        opacity={interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" })} />

      {/* Bars */}
      {data.map((datum, i) => {
        const color = colors[i % colors.length];
        const barX = offsetX + barGap + i * (barWidth + barGap);
        const barHeightFull = (datum.value / maxValue) * chartHeight;
        const delay = i * 4;

        let progress: number;
        if (animationStyle === "grow-up") {
          progress = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 80 } });
        } else if (animationStyle === "slide-in") {
          progress = interpolate(frame, [delay + 5, delay + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        } else {
          progress = spring({ frame: frame - delay, fps, config: { damping: 8, stiffness: 200 } });
        }

        const barHeight = barHeightFull * progress;
        const barY = chartBottom - barHeight;
        const opacity = interpolate(frame, [delay, delay + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const xOffset = animationStyle === "slide-in" ? (1 - progress) * 40 : 0;

        return (
          <g key={i} opacity={opacity} transform={`translate(${xOffset}, 0)`}>
            <rect x={barX} y={barY} width={barWidth} height={barHeight} rx={4}
              fill={color} />
            {showValues && (
              <text x={barX + barWidth / 2} y={barY - 10} textAnchor="middle"
                fill={theme.colors.text} fontFamily={theme.fonts.body} fontSize={22} fontWeight={600}>
                {formatValue(datum.value)}
              </text>
            )}
            <text x={barX + barWidth / 2} y={chartBottom + 30} textAnchor="middle"
              fill={theme.colors.textMuted} fontFamily={theme.fonts.body} fontSize={18}>
              {datum.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return Math.floor(v).toLocaleString();
}
