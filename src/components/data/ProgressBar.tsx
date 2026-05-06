import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface ProgressBarProps {
  items: Array<{
    label: string;
    value: number; // 0–100
    color?: string;
  }>;
  action?: Action;
}

export function ProgressBar({ items }: ProgressBarProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "8%",
        gap: "1.5em",
      }}
    >
      {items.map((item, i) => {
        const delay = i * theme.timing.stagger * 2;
        const prog = spring({
          frame: frame - delay,
          fps,
          config: { damping: 20, stiffness: 100, mass: 1 },
        });

        const barWidth = interpolate(prog, [0, 1], [0, item.value]);

        const entrance = spring({
          frame: frame - delay,
          fps,
          config: { damping: 15, stiffness: 180, mass: 0.8 },
        });

        return (
          <div
            key={i}
            style={{
              opacity: entrance,
              transform: `translateX(${(1 - entrance) * 30}px)`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
                fontFamily: theme.fonts.body,
                fontSize: "1.1em",
              }}
            >
              <span style={{ color: theme.colors.text }}>{item.label}</span>
              <span style={{ color: theme.colors.textMuted }}>
                {Math.floor(barWidth)}%
              </span>
            </div>
            <div
              style={{
                height: 8,
                background: `${theme.colors.surface}`,
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${barWidth}%`,
                  background: item.color
                    ? item.color
                    : `linear-gradient(90deg, ${theme.colors.gradient[0]}, ${theme.colors.gradient[1]})`,
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
