import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "./design";

/**
 * PromptTyping — Simulates typing a chat prompt with cinematic flair.
 * Input field scales up from nothing, cursor blinks, characters appear
 * with subtle scale-bounce per keystroke. Glow intensifies as text grows.
 */
export const PromptTyping: React.FC<{
  headline: string;
  typingSpeed?: number;
  icon?: string;
}> = ({ headline, typingSpeed = 2, icon = "✦" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const charsTyped = Math.min(Math.floor(frame / typingSpeed), headline.length);
  const displayText = headline.slice(0, charsTyped);
  const isComplete = charsTyped >= headline.length;
  const showCursor = !isComplete || Math.floor(frame / 15) % 2 === 0;

  // Container entrance — springs from small to full
  const containerProg = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 1 },
  });

  // Glow intensifies with text length
  const typingProgress = charsTyped / headline.length;
  const glowIntensity = typingProgress * 0.4;

  // Per-keystroke micro-bounce
  const lastKeyFrame = charsTyped * typingSpeed;
  const keystrokeBounce = frame - lastKeyFrame < 4 && charsTyped > 0
    ? interpolate(frame - lastKeyFrame, [0, 2, 4], [0, -1.5, 0], { extrapolateRight: "clamp" })
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: containerProg,
        transform: `scale(${0.85 + containerProg * 0.15})`,
      }}
    >
      <div
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.glassBorder}`,
          borderRadius: 20,
          padding: "24px 36px",
          minWidth: 800,
          maxWidth: 1200,
          display: "flex",
          alignItems: "center",
          gap: 18,
          boxShadow: `
            0 0 ${40 + glowIntensity * 80}px ${COLORS.accentOrange}${Math.round(glowIntensity * 255).toString(16).padStart(2, "0")},
            0 20px 60px rgba(0,0,0,0.4)
          `,
          transform: `translateY(${keystrokeBounce}px)`,
        }}
      >
        {/* Icon with spinning gradient */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `linear-gradient(${135 + frame * 0.5}deg, ${COLORS.accentOrange}, ${COLORS.accentPink})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
            boxShadow: `0 0 ${10 + typingProgress * 20}px ${COLORS.accentOrange}40`,
          }}
        >
          {icon}
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 26,
            color: COLORS.textPrimary,
            flex: 1,
            lineHeight: 1.5,
            minHeight: 40,
          }}
        >
          {displayText}
          {showCursor && (
            <span
              style={{
                display: "inline-block",
                width: 2.5,
                height: 30,
                background: isComplete
                  ? COLORS.accentOrange
                  : `linear-gradient(180deg, ${COLORS.accentOrange}, ${COLORS.accentPink})`,
                marginLeft: 2,
                verticalAlign: "middle",
                borderRadius: 1,
                boxShadow: `0 0 8px ${COLORS.accentOrange}60`,
              }}
            />
          )}
        </div>
      </div>

      {/* Completion flash */}
      {isComplete && (() => {
        const flashF = frame - headline.length * typingSpeed;
        const flashOpacity = interpolate(flashF, [0, 5, 20], [0, 0.3, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return flashOpacity > 0 ? (
          <div
            style={{
              position: "absolute",
              width: 1400,
              height: 200,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${COLORS.accentOrange}${Math.round(flashOpacity * 255).toString(16).padStart(2, "0")} 0%, transparent 60%)`,
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />
        ) : null;
      })()}
    </div>
  );
};
