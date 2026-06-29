import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface ComparisonItem {
  label: string;
  value: string;
  change?: number; // positive = up, negative = down
  color?: string;
}

export interface ComparisonCardProps {
  title?: string;
  left: ComparisonItem;
  right: ComparisonItem;
  action?: Action;
}

export function ComparisonCard({
  title,
  left,
  right,
}: ComparisonCardProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const dividerDraw = spring({
    frame: frame - fps * 0.3, fps,
    config: { damping: 20, stiffness: 100 },
  });

  const leftEntrance = spring({
    frame, fps,
    config: { damping: 18, stiffness: 100 },
  });

  const rightEntrance = spring({
    frame: frame - fps * 0.15, fps,
    config: { damping: 18, stiffness: 100 },
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "6%",
      background: theme.colors.background,
    }}>
      {title && (
        <div style={{
          fontFamily: theme.fonts.heading, fontSize: "2em", fontWeight: 700,
          color: theme.colors.text, marginBottom: "1em",
          opacity: leftEntrance,
        }}>
          {title}
        </div>
      )}

      <div style={{
        display: "flex", gap: "5%", width: "100%", maxWidth: "80%",
        alignItems: "stretch",
      }}>
        {/* Left */}
        <div style={{
          flex: 1, padding: "2em",
          background: left.color || `${theme.colors.primary}15`,
          borderRadius: 16, textAlign: "center",
          opacity: leftEntrance,
          transform: `translateX(${(1 - leftEntrance) * -30}px)`,
        }}>
          <div style={{
            fontFamily: theme.fonts.body, fontSize: "1em",
            color: theme.colors.textMuted, textTransform: "uppercase",
            letterSpacing: "0.1em", marginBottom: "0.5em",
          }}>
            {left.label}
          </div>
          <div style={{
            fontFamily: theme.fonts.heading, fontSize: "3em", fontWeight: 800,
            color: left.color || theme.colors.primary,
          }}>
            {left.value}
          </div>
          {left.change !== undefined && (
            <ChangeBadge change={left.change} />
          )}
        </div>

        {/* Divider */}
        <div style={{
          width: 2,
          background: `linear-gradient(180deg, transparent, ${theme.colors.border}, transparent)`,
          transform: `scaleY(${dividerDraw})`,
          alignSelf: "stretch",
        }} />

        {/* Right */}
        <div style={{
          flex: 1, padding: "2em",
          background: right.color || `${theme.colors.gradient[1]}15`,
          borderRadius: 16, textAlign: "center",
          opacity: rightEntrance,
          transform: `translateX(${(1 - rightEntrance) * 30}px)`,
        }}>
          <div style={{
            fontFamily: theme.fonts.body, fontSize: "1em",
            color: theme.colors.textMuted, textTransform: "uppercase",
            letterSpacing: "0.1em", marginBottom: "0.5em",
          }}>
            {right.label}
          </div>
          <div style={{
            fontFamily: theme.fonts.heading, fontSize: "3em", fontWeight: 800,
            color: right.color || theme.colors.gradient[1],
          }}>
            {right.value}
          </div>
          {right.change !== undefined && (
            <ChangeBadge change={right.change} />
          )}
        </div>
      </div>
    </div>
  );
}

function ChangeBadge({ change }: { change: number }) {
  const isUp = change > 0;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      marginTop: "0.5em",
      fontFamily: "monospace", fontSize: "1.2em", fontWeight: 700,
      color: isUp ? "#10B981" : "#EF4444",
    }}>
      <span>{isUp ? "\u2191" : "\u2193"}</span>
      <span>{Math.abs(change)}%</span>
    </div>
  );
}
