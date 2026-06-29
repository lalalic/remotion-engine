import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface CalloutBoxProps {
  text: string;
  type?: "info" | "warning" | "tip" | "quote";
  icon?: string;
  author?: string;
  action?: Action;
}

interface ColorSet { accent: string; bg: string }

const TYPE_COLORS: Record<string, ColorSet> = {
  info: { accent: "#3B82F6", bg: "#EFF6FF" },
  warning: { accent: "#F59E0B", bg: "#FFFBEB" },
  tip: { accent: "#10B981", bg: "#ECFDF5" },
  quote: { accent: "#8B5CF6", bg: "#F5F3FF" },
};

const TYPE_ICONS: Record<string, string> = {
  info: "i",
  warning: "!",
  tip: "\u2713",
  quote: "\u201C",
};

export function CalloutBox({
  text,
  type = "info",
  icon,
  author,
}: CalloutBoxProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const colors: ColorSet = TYPE_COLORS[type] ?? TYPE_COLORS.info;
  const displayIcon = icon || TYPE_ICONS[type] || "";

  const slideIn = spring({
    frame, fps,
    config: { damping: 15, stiffness: 120, mass: 0.8 },
  });

  const accentDraw = spring({
    frame: frame - 5, fps,
    config: { damping: 20, stiffness: 150, mass: 0.5 },
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "10%",
      transform: `translateX(${(1 - slideIn) * 30}px)`,
      opacity: slideIn,
    }}>
      <div style={{
        display: "flex", gap: 24,
        background: colors.bg,
        borderRadius: 16,
        padding: "2em 2.5em",
        maxWidth: "70%",
        boxShadow: `0 4px 20px ${theme.colors.primary}15`,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Accent border (animated draw from top) */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
          background: colors.accent,
          transform: `scaleY(${accentDraw})`,
          transformOrigin: "top",
        }} />

        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: colors.accent, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: theme.fonts.heading, fontSize: "1.5em", fontWeight: 700,
          flexShrink: 0,
        }}>
          {displayIcon}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: type === "quote" ? theme.fonts.heading : theme.fonts.body,
            fontSize: type === "quote" ? "1.8em" : "1.4em",
            fontStyle: type === "quote" ? "italic" : "normal",
            color: theme.colors.text, lineHeight: 1.4,
          }}>
            {text}
          </div>
          {author && (
            <div style={{
              fontFamily: theme.fonts.body, fontSize: "1em",
              color: theme.colors.textMuted, marginTop: "0.8em",
              opacity: interpolate(frame, [fps * 0.5, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}>
              — {author}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
