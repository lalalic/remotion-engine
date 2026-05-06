import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface StatCounterProps {
  value: number;
  label?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  action?: Action;
}

export function StatCounter({
  value,
  label,
  prefix = "",
  suffix = "",
  decimals = 0,
}: StatCounterProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const countProg = spring({
    frame,
    fps,
    config: { damping: 30, stiffness: 80, mass: 1.5 },
  });

  const currentValue = interpolate(countProg, [0, 1], [0, value]);
  const displayValue = decimals > 0
    ? currentValue.toFixed(decimals)
    : Math.floor(currentValue).toLocaleString();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 180, mass: 0.8 },
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: entrance,
        transform: `scale(${0.8 + 0.2 * entrance})`,
      }}
    >
      <div
        style={{
          fontFamily: theme.fonts.heading,
          fontSize: "6em",
          fontWeight: 800,
          background: `linear-gradient(135deg, ${theme.colors.gradient[0]}, ${theme.colors.gradient[1]})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          lineHeight: 1,
        }}
      >
        {prefix}{displayValue}{suffix}
      </div>
      {label && (
        <div
          style={{
            fontFamily: theme.fonts.body,
            fontSize: "1.5em",
            color: theme.colors.textMuted,
            marginTop: "0.3em",
            opacity: interpolate(frame, [fps * 0.5, fps * 0.8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
