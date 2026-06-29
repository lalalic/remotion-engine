import * as React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface PieDatum {
  label: string;
  value: number;
}

export interface PieChartProps {
  data: PieDatum[];
  title?: string;
  colors?: string[];
  donut?: boolean;
  showLegend?: boolean;
  animationStyle?: "spin" | "expand" | "sequential";
  action?: Action;
}

export function PieChart({
  data,
  title,
  colors: customColors,
  donut = false,
  showLegend = true,
  animationStyle = "spin",
}: PieChartProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const colors = customColors || theme.colors.chart;

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 960;
  const cy = 540;
  const radius = Math.min(
    showLegend ? 300 : 380,
    title ? 340 : 400,
  );
  const innerRadius = donut ? radius * 0.45 : 0;

  // Build arc segments
  let currentAngle = -Math.PI / 2;
  const segments = data.map((d, i) => {
    const sliceAngle = (d.value / total) * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;
    return { ...d, startAngle, endAngle, color: colors[i % colors.length] };
  });

  const spinProgress = animationStyle === "spin"
    ? interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;

  const labelOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <svg viewBox="0 0 1920 1080" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      {title && (
        <text x={960} y={80} textAnchor="middle" fill={theme.colors.text}
          fontFamily={theme.fonts.heading} fontWeight={700} fontSize={48}>
          {title}
        </text>
      )}

      <g transform={`rotate(${spinProgress * 360 - 90}, ${cx}, ${cy})`}>
        {segments.map((seg, i) => {
          const start = seg.startAngle;
          const end = seg.endAngle;

          // Compute SVG arc path
          const x1 = cx + radius * Math.cos(start);
          const y1 = cy + radius * Math.sin(start);
          const x2 = cx + radius * Math.cos(end);
          const y2 = cy + radius * Math.sin(end);
          const largeArc = end - start > Math.PI ? 1 : 0;

          let pathD: string;
          if (animationStyle === "sequential") {
            const segProgress = interpolate(frame, [i * 5, i * 5 + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const currentEnd = start + (end - start) * segProgress;
            const cx2 = cx + radius * Math.cos(currentEnd);
            const cy2 = cy + radius * Math.sin(currentEnd);
            pathD = describeArc(cx, cy, radius, innerRadius, start, currentEnd);
            if (segProgress <= 0) return null;
          } else {
            pathD = describeArc(cx, cy, radius, innerRadius, start, end);
          }

          return (
            <g key={i}>
              <path d={pathD} fill={seg.color} stroke={theme.colors.background} strokeWidth={2} />
              {/* Label inside segment */}
              {showLegend && (end - start) > 0.3 && (
                <text
                  x={cx + (radius + innerRadius) / 2 * Math.cos(start + (end - start) / 2 + (animationStyle === "spin" ? spinProgress * 360 * Math.PI / 180 : 0))}
                  y={cy + (radius + innerRadius) / 2 * Math.sin(start + (end - start) / 2 + (animationStyle === "spin" ? spinProgress * 360 * Math.PI / 180 : 0))}
                  textAnchor="middle" dominantBaseline="central"
                  fill="#fff" fontFamily={theme.fonts.body} fontSize={16} fontWeight={600}
                  opacity={labelOpacity}
                >
                  {Math.round((seg.value / total) * 100)}%
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* Legend */}
      {showLegend && (
        <g transform={`translate(${cx + radius + 60}, ${cy - segments.length * 18})`}>
          {segments.map((seg, i) => (
            <g key={i} transform={`translate(0, ${i * 36})`} opacity={labelOpacity}>
              <rect x={0} y={0} width={16} height={16} rx={3} fill={seg.color} />
              <text x={22} y={13} fill={theme.colors.text} fontFamily={theme.fonts.body} fontSize={14}>
                {seg.label}
              </text>
              <text x={22} y={28} fill={theme.colors.textMuted} fontFamily={theme.fonts.body} fontSize={12}>
                {formatValue(seg.value)}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

function describeArc(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number): string {
  const x1 = cx + outerR * Math.cos(startAngle);
  const y1 = cy + outerR * Math.sin(startAngle);
  const x2 = cx + outerR * Math.cos(endAngle);
  const y2 = cy + outerR * Math.sin(endAngle);
  const x3 = cx + innerR * Math.cos(endAngle);
  const y3 = cy + innerR * Math.sin(endAngle);
  const x4 = cx + innerR * Math.cos(startAngle);
  const y4 = cy + innerR * Math.sin(startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  if (innerR === 0) {
    return `M ${cx} ${cy} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }
  return `M ${x4} ${y4} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return Math.floor(v).toLocaleString();
}
