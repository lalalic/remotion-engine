import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface ComparisonSliderProps {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  dividerStart?: number; // 0–1, initial position
  dividerEnd?: number;   // 0–1, final position
  action?: Action;
}

export function ComparisonSlider({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
  dividerStart = 0.1,
  dividerEnd = 0.7,
}: ComparisonSliderProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  // Entrance
  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100, mass: 1 },
  });

  // Divider slides from dividerStart to dividerEnd
  const slideProg = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 20, stiffness: 80, mass: 1.5 },
  });
  const dividerPos = interpolate(slideProg, [0, 1], [dividerStart, dividerEnd]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: entrance,
        transform: `scale(${0.9 + 0.1 * entrance})`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "85%",
          height: "70%",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* After (full background) */}
        <Img
          src={after}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Before (clipped) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            clipPath: `inset(0 ${(1 - dividerPos) * 100}% 0 0)`,
          }}
        >
          <Img
            src={before}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>

        {/* Divider line */}
        <div
          style={{
            position: "absolute",
            left: `${dividerPos * 100}%`,
            top: 0,
            bottom: 0,
            width: 3,
            background: theme.colors.text,
            transform: "translateX(-50%)",
            zIndex: 2,
            boxShadow: "0 0 10px rgba(0,0,0,0.3)",
          }}
        />

        {/* Divider handle */}
        <div
          style={{
            position: "absolute",
            left: `${dividerPos * 100}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: theme.colors.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          }}
        >
          <span style={{ color: theme.colors.background, fontSize: 18, fontWeight: 700 }}>⇔</span>
        </div>

        {/* Labels */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            padding: "4px 12px",
            background: `${theme.colors.background}cc`,
            borderRadius: 6,
            fontFamily: theme.fonts.body,
            fontSize: 14,
            color: theme.colors.textMuted,
            zIndex: 1,
          }}
        >
          {beforeLabel}
        </div>
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            padding: "4px 12px",
            background: `${theme.colors.background}cc`,
            borderRadius: 6,
            fontFamily: theme.fonts.body,
            fontSize: 14,
            color: theme.colors.textMuted,
            zIndex: 1,
          }}
        >
          {afterLabel}
        </div>
      </div>
    </div>
  );
}
