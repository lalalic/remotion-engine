import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface EndTagProps {
  title: string;
  subtitle?: string;
  cta?: string;
  showShimmer?: boolean;
  action?: Action;
}

export function EndTag({
  title,
  subtitle,
  cta,
  showShimmer = true,
}: EndTagProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const entrance = spring({
    frame, fps,
    config: { damping: 18, stiffness: 100, mass: 1.2 },
  });

  const underlineDraw = spring({
    frame: frame - fps * 0.3, fps,
    config: { damping: 20, stiffness: 150 },
  });

  // Shimmer pass
  const shimmerX = showShimmer
    ? interpolate(frame, [0, fps * 0.6], [-200, 1200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : -200;

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: theme.colors.background,
      padding: "5%",
      opacity: entrance,
      transform: `scale(${0.85 + 0.15 * entrance})`,
    }}>
      {/* Subtitle */}
      {subtitle && (
        <div style={{
          fontFamily: theme.fonts.body, fontSize: "1.2em",
          color: theme.colors.textMuted,
          textTransform: "uppercase", letterSpacing: "0.3em",
          marginBottom: "0.5em",
          opacity: interpolate(frame, [fps * 0.2, fps * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>
          {subtitle}
        </div>
      )}

      {/* Title with underline */}
      <div style={{ position: "relative", marginBottom: "0.3em" }}>
        <div style={{
          fontFamily: theme.fonts.heading,
          fontSize: "4em", fontWeight: 800,
          color: theme.colors.text,
          textAlign: "center", lineHeight: 1.1,
        }}>
          {title}
        </div>
        <div style={{
          height: 4, width: `${underlineDraw * 60}%`,
          background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.gradient[1]})`,
          borderRadius: 2, marginTop: 8,
          marginLeft: `${(100 - underlineDraw * 60) / 2}%`,
        }} />
      </div>

      {/* CTA */}
      {cta && (
        <div style={{
          fontFamily: theme.fonts.body, fontSize: "1.3em",
          color: theme.colors.primary,
          marginTop: "0.8em",
          opacity: interpolate(frame, [fps * 0.6, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [fps * 0.6, fps * 0.9], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}>
          {cta}
        </div>
      )}

      {/* Shimmer overlay */}
      {showShimmer && (
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)`,
          transform: `translateX(${shimmerX}px)`,
          pointerEvents: "none",
        }} />
      )}
    </div>
  );
}
