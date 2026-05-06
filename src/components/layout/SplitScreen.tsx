import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface SplitScreenProps {
  direction?: "horizontal" | "vertical";
  ratio?: number; // 0–1, left/top portion
  gap?: number;
  children?: React.ReactNode;
  action?: Action;
}

export function SplitScreen({
  direction = "horizontal",
  ratio = 0.5,
  gap = 16,
  children,
}: SplitScreenProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 1 },
  });

  const childArray = React.Children.toArray(children);
  const left = childArray[0];
  const right = childArray[1];

  const isH = direction === "horizontal";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: isH ? "row" : "column",
        gap,
        padding: gap,
        opacity: entrance,
      }}
    >
      <div
        style={{
          flex: `0 0 calc(${ratio * 100}% - ${gap / 2}px)`,
          overflow: "hidden",
          borderRadius: 12,
          position: "relative",
          transform: `translateX(${isH ? (1 - entrance) * -30 : 0}px) translateY(${!isH ? (1 - entrance) * -30 : 0}px)`,
        }}
      >
        {left}
      </div>
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          borderRadius: 12,
          position: "relative",
          transform: `translateX(${isH ? (1 - entrance) * 30 : 0}px) translateY(${!isH ? (1 - entrance) * 30 : 0}px)`,
        }}
      >
        {right}
      </div>
    </div>
  );
}
