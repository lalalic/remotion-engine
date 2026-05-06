import * as React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, random } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface LightLeakProps {
  intensity?: number; // 0–1
  color?: string;
  action?: Action;
}

export function LightLeak({
  intensity = 0.4,
  color,
}: LightLeakProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const leakColor = color ?? theme.colors.primary;

  const t = frame / fps;

  // Two moving light spots
  const spots = [
    {
      x: 30 + Math.sin(t * 0.5) * 40,
      y: 20 + Math.cos(t * 0.3) * 30,
      size: 50 + Math.sin(t * 0.7) * 20,
      opacity: intensity * (0.5 + 0.5 * Math.sin(t * 0.4)),
    },
    {
      x: 70 + Math.cos(t * 0.4) * 30,
      y: 70 + Math.sin(t * 0.6) * 25,
      size: 40 + Math.cos(t * 0.5) * 15,
      opacity: intensity * (0.3 + 0.3 * Math.cos(t * 0.5)),
    },
  ];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    >
      {spots.map((spot, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${spot.x}%`,
            top: `${spot.y}%`,
            width: `${spot.size}%`,
            height: `${spot.size}%`,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${leakColor}${Math.floor(spot.opacity * 255).toString(16).padStart(2, "0")}, transparent 70%)`,
            transform: "translate(-50%, -50%)",
            filter: "blur(40px)",
          }}
        />
      ))}
    </div>
  );
}
