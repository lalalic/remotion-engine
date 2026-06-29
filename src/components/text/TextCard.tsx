import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface TextCardProps {
  text: string;
  subtext?: string;
  align?: "center" | "left" | "right";
  backgroundColor?: string;
  textColor?: string;
  animation?: "fade" | "slide-up" | "scale" | "none";
  action?: Action;
}

export function TextCard({
  text,
  subtext,
  align = "center",
  backgroundColor,
  textColor,
  animation = "fade",
}: TextCardProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const bg = backgroundColor || theme.colors.surface;
  const color = textColor || theme.colors.text;

  const entrance = spring({
    frame, fps,
    config: { damping: 20, stiffness: 120, mass: 1 },
  });

  let transform = "";
  let opacity = entrance;

  if (animation === "slide-up") {
    transform = `translateY(${(1 - entrance) * 40}px)`;
  } else if (animation === "scale") {
    transform = `scale(${0.8 + 0.2 * entrance})`;
  } else if (animation === "none") {
    opacity = 1;
    transform = "none";
  }

  const textAlign = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: textAlign, justifyContent: "center",
      padding: "8%",
      background: bg,
      opacity,
      transform,
    }}>
      <div style={{
        fontFamily: theme.fonts.heading,
        fontSize: "3.5em", fontWeight: 700, lineHeight: 1.2,
        color, textAlign: align,
        maxWidth: "80%",
      }}>
        {text}
      </div>
      {subtext && (
        <div style={{
          fontFamily: theme.fonts.body,
          fontSize: "1.5em",
          color: theme.colors.textMuted,
          marginTop: "0.5em",
          textAlign: align,
          opacity: interpolate(frame, [fps * 0.3, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [fps * 0.3, fps * 0.6], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
