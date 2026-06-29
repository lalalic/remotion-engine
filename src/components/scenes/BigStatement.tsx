import React from "react";
import { useCurrentFrame, interpolate, Easing, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "./design";

/**
 * BigStatement — Kinetic typography with word-by-word animation.
 * Each word springs in with independent scale/rotation/position.
 * Dramatic glow pulses behind, words have motion blur illusion.
 */
export const BigStatement: React.FC<{
  headline: string;
  subhead?: string;
  color?: string;
}> = ({ headline, subhead, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = headline.split(/\s+/);
  const WORD_STAGGER = 4; // frames between each word
  const WORD_ANIM_DUR = 14; // frames for each word to settle

  // Container fade (subtle — words handle their own entrance)
  const containerOpacity = interpolate(frame, [0, 5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Pulsing glow — intensifies as words land
  const wordsLanded = Math.min(words.length, Math.floor(frame / WORD_STAGGER));
  const glowIntensity = interpolate(wordsLanded, [0, words.length], [0.1, 0.6], {
    extrapolateRight: "clamp",
  });
  const glowPulse = glowIntensity + Math.sin(frame * 0.06) * 0.1;
  const glowSize = 400 + wordsLanded * 30 + Math.sin(frame * 0.03) * 60;

  // Accent line that sweeps across
  const lineProgress = interpolate(frame, [3, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const lineOpacity = interpolate(frame, [3, 12, 30, 45], [0, 0.6, 0.6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: containerOpacity,
      }}
    >
      {/* Cinematic glow orb */}
      <div
        style={{
          position: "absolute",
          width: glowSize,
          height: glowSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.accentOrange}${Math.round(glowPulse * 255).toString(16).padStart(2, "0")} 0%, ${COLORS.accentPink}18 35%, transparent 65%)`,
          filter: "blur(90px)",
          pointerEvents: "none",
        }}
      />

      {/* Accent sweep line */}
      <div
        style={{
          position: "absolute",
          width: `${lineProgress * 60}%`,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${COLORS.accentOrange}, ${COLORS.accentPink}, transparent)`,
          opacity: lineOpacity,
          top: "42%",
          left: "20%",
          filter: "blur(1px)",
          boxShadow: `0 0 20px ${COLORS.accentOrange}60`,
        }}
      />

      {/* Kinetic headline — word-by-word */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          maxWidth: 1400,
          padding: "0 80px",
          position: "relative",
          zIndex: 1,
          gap: "0 22px",
          lineHeight: 1.1,
        }}
      >
        {words.map((word, i) => {
          const wordStart = i * WORD_STAGGER;
          const wordF = frame - wordStart;

          // Spring physics for each word
          const prog = spring({
            frame: Math.max(0, wordF),
            fps,
            config: {
              damping: 12,
              stiffness: 180,
              mass: 0.8,
            },
          });

          // Each word comes from a slightly different direction
          const directions = [
            { x: 0, y: 50, r: -3 },    // from below
            { x: -40, y: 20, r: 2 },    // from left
            { x: 30, y: -30, r: -2 },   // from upper right
            { x: 0, y: 60, r: 1 },      // from below
            { x: -50, y: 0, r: 3 },     // from left
            { x: 40, y: 30, r: -1 },    // from lower right
          ];
          const dir = directions[i % directions.length]!;

          const x = (1 - prog) * dir.x;
          const y = (1 - prog) * dir.y;
          const rotate = (1 - prog) * dir.r;
          const scale = interpolate(prog, [0, 1], [0.7, 1]);
          const opacity = wordF < 0 ? 0 : Math.min(1, prog * 1.5);

          // "Impact flash" — brief brightness burst when word lands
          const flash = wordF > 0 && wordF < 8
            ? interpolate(wordF, [0, 3, 8], [0, 0.4, 0], { extrapolateRight: "clamp" })
            : 0;

          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontFamily: FONTS.heading,
                fontSize: 92,
                fontWeight: 800,
                background: color
                  ? "none"
                  : `linear-gradient(135deg, ${COLORS.textPrimary} 0%, ${COLORS.accentOrange} 60%, ${COLORS.accentPink} 100%)`,
                WebkitBackgroundClip: color ? undefined : "text",
                WebkitTextFillColor: color ? color : "transparent",
                backgroundClip: color ? undefined : "text",
                letterSpacing: "-0.04em",
                opacity,
                transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`,
                filter: flash > 0 ? `brightness(${1 + flash})` : undefined,
                willChange: "transform, opacity",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* Subhead — slides up after all words land */}
      {subhead && (() => {
        const subStart = words.length * WORD_STAGGER + 5;
        const subF = frame - subStart;
        const subProg = spring({
          frame: Math.max(0, subF),
          fps,
          config: { damping: 14, stiffness: 120, mass: 1 },
        });
        return (
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: 34,
              fontWeight: 400,
              color: COLORS.textSecondary,
              marginTop: 32,
              textAlign: "center",
              letterSpacing: "0.02em",
              maxWidth: 900,
              opacity: subF < 0 ? 0 : subProg,
              transform: `translateY(${(1 - subProg) * 30}px)`,
            }}
          >
            {subhead}
          </div>
        );
      })()}
    </div>
  );
};
