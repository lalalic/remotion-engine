import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface SpotlightRevealProps {
  /** Center X of spotlight, 0–100 */
  x?: number;
  /** Center Y of spotlight, 0–100 */
  y?: number;
  /** Max radius as % of viewport diagonal */
  maxRadius?: number;
  color?: string;
  children?: React.ReactNode;
  action?: Action;
}

export function SpotlightReveal({
  x = 50,
  y = 50,
  maxRadius = 100,
  color,
  children,
}: SpotlightRevealProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const prog = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 80, mass: 1.2 },
  });

  const radius = interpolate(prog, [0, 1], [0, maxRadius]);
  const bgColor = color ?? theme.colors.background;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Content behind mask */}
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>

      {/* Circular mask */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: bgColor,
          maskImage: `radial-gradient(circle ${radius}vw at ${x}% ${y}%, transparent 100%, black 100%)`,
          WebkitMaskImage: `radial-gradient(circle ${radius}vw at ${x}% ${y}%, transparent 100%, black 100%)`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
