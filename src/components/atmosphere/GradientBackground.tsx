import * as React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface GradientBackgroundProps {
  type?: "linear" | "radial" | "conic";
  colors?: string[];
  animated?: boolean;
  noise?: boolean;
  action?: Action;
}

export function GradientBackground({
  type = "linear",
  colors,
  animated = true,
  noise = false,
}: GradientBackgroundProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const c = colors ?? [theme.colors.background, theme.colors.surface, theme.colors.primary + "33"];

  const angle = animated
    ? interpolate(frame, [0, fps * 10], [135, 315], { extrapolateRight: "extend" })
    : 135;

  let gradient: string;
  if (type === "radial") {
    const pos = animated
      ? `${50 + Math.sin(frame / fps) * 20}% ${50 + Math.cos(frame / fps) * 20}%`
      : "50% 50%";
    gradient = `radial-gradient(ellipse at ${pos}, ${c.join(", ")})`;
  } else if (type === "conic") {
    gradient = `conic-gradient(from ${angle}deg, ${c.join(", ")})`;
  } else {
    gradient = `linear-gradient(${angle}deg, ${c.join(", ")})`;
  }

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: gradient,
        }}
      />
      {noise && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.04,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "256px 256px",
          }}
        />
      )}
    </div>
  );
}
