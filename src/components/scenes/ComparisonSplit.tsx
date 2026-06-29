import React from "react";
import { useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "./design";

/**
 * ComparisonSplit — Side-by-side "Old way vs New way" with dramatic reveal.
 * Left side desaturates, right side ignites. Divider slashes through.
 */
export const ComparisonSplit: React.FC<{
  headline: string;
  leftTitle?: string;
  rightTitle?: string;
  leftItems?: string[];
  rightItems?: string[];
  matchPercent?: number;
}> = ({
  headline,
  leftTitle = "Before",
  rightTitle = "After",
  leftItems = [],
  rightItems = [],
  matchPercent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Headline springs in
  const headlineProg = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 150, mass: 0.8 },
  });

  // Divider slashes through dramatically
  const dividerProg = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 8, stiffness: 200, mass: 0.6 },
  });
  const dividerHeight = dividerProg * 600;
  const dividerGlow = interpolate(frame, [10, 20, 40], [0, 1, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Match percent counter
  const counterValue = matchPercent
    ? interpolate(frame, [60, 120], [0, matchPercent], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      })
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {headline && (
        <div
          style={{
            textAlign: "center",
            fontFamily: FONTS.heading,
            fontSize: 42,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${COLORS.textPrimary}, ${COLORS.accentOrange})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            paddingTop: 80,
            opacity: headlineProg,
            transform: `translateY(${(1 - headlineProg) * 30}px)`,
          }}
        >
          {headline}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        {/* Left side — faded, old way */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 80px",
            gap: 24,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 28,
              fontWeight: 600,
              color: COLORS.accentRed,
              opacity: 0.8,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 20,
            }}
          >
            {leftTitle}
          </div>
          {leftItems.map((item, i) => {
            const itemStart = 20 + i * 8;
            const itemProg = spring({
              frame: Math.max(0, frame - itemStart),
              fps,
              config: { damping: 14, stiffness: 120, mass: 0.8 },
            });
            return (
              <div
                key={i}
                style={{
                  opacity: frame < itemStart ? 0 : itemProg * 0.6,
                  transform: `translateX(${(1 - itemProg) * -30}px)`,
                  fontFamily: FONTS.body,
                  fontSize: 22,
                  color: COLORS.textMuted,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textDecoration: "line-through",
                  textDecorationColor: COLORS.accentRed + "60",
                }}
              >
                <span style={{ color: COLORS.accentRed, opacity: 0.7, fontSize: 20 }}>✕</span>
                {item}
              </div>
            );
          })}
        </div>

        {/* Center divider — dramatic slash */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 3,
            height: dividerHeight,
            background: `linear-gradient(180deg, transparent, ${COLORS.accentOrange}, ${COLORS.accentPink}, transparent)`,
            boxShadow: `0 0 ${20 + dividerGlow * 40}px ${COLORS.accentOrange}${Math.round(dividerGlow * 0.6 * 255).toString(16).padStart(2, "0")}`,
          }}
        />

        {/* Right side — vibrant, new way */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 80px",
            gap: 24,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 28,
              fontWeight: 600,
              color: COLORS.accentOrange,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 20,
            }}
          >
            {rightTitle}
          </div>
          {rightItems.map((item, i) => {
            const itemStart = 35 + i * 8;
            const itemProg = spring({
              frame: Math.max(0, frame - itemStart),
              fps,
              config: { damping: 10, stiffness: 200, mass: 0.7 },
            });
            // Impact flash
            const flash = frame > itemStart && frame < itemStart + 8
              ? interpolate(frame, [itemStart, itemStart + 3, itemStart + 8], [0, 0.3, 0], { extrapolateRight: "clamp" })
              : 0;
            return (
              <div
                key={i}
                style={{
                  opacity: frame < itemStart ? 0 : itemProg,
                  transform: `translateX(${(1 - itemProg) * 40}px) scale(${1 + flash * 0.05})`,
                  fontFamily: FONTS.body,
                  fontSize: 22,
                  color: COLORS.textPrimary,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  filter: flash > 0 ? `brightness(${1 + flash})` : undefined,
                }}
              >
                <span style={{ color: COLORS.accentGreen, fontSize: 20 }}>✓</span>
                {item}
              </div>
            );
          })}

          {/* Match percent counter */}
          {matchPercent && frame > 60 && (
            <div
              style={{
                marginTop: 24,
                fontFamily: FONTS.mono,
                fontSize: 56,
                fontWeight: 800,
                background: `linear-gradient(135deg, ${COLORS.accentGreen}, ${COLORS.accentCyan})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                opacity: interpolate(frame, [60, 75], [0, 1], { extrapolateRight: "clamp" }),
              }}
            >
              {counterValue.toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
