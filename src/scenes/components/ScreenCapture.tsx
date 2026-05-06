import React from "react";
import { useCurrentFrame, interpolate, Easing, Img, staticFile, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../design";

/**
 * ScreenCapture — Real app screenshot with cinematic reveal.
 * Dramatic entrance: rises from depth with perspective tilt,
 * aggressive Ken Burns zoom, spotlight highlight that moves
 * across the screen, simulated cursor movement.
 */
export const ScreenCapture: React.FC<{
  headline?: string;
  screenshot: string;
  zoom?: number;
  panX?: number;
  panY?: number;
  /** Spotlight position path: array of {x, y, t} waypoints (% coords, t in frames) */
  spotlights?: Array<{ x: number; y: number; t: number }>;
}> = ({ headline, screenshot, zoom = 1, panX = 0, panY = 0, spotlights }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // === Dramatic entrance: perspective zoom-in ===
  const entranceProg = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100, mass: 1.2 },
  });

  const perspZ = interpolate(entranceProg, [0, 1], [200, 0]); // depth
  const rotX = interpolate(entranceProg, [0, 1], [8, 0]);      // tilt
  const slideY = interpolate(entranceProg, [0, 1], [100, 0]);

  // === Aggressive Ken Burns: continuous zoom + pan ===
  const kbZoom = interpolate(frame, [0, 300], [zoom, zoom + 0.12], {
    extrapolateRight: "clamp",
  });
  const kbX = interpolate(frame, [0, 300], [panX, panX + 3], {
    extrapolateRight: "clamp",
  });
  const kbY = interpolate(frame, [0, 300], [panY, panY + 2], {
    extrapolateRight: "clamp",
  });

  // === Spotlight effect ===
  let spotX = 50, spotY = 50, spotOpacity = 0;
  if (spotlights && spotlights.length > 0) {
    // Find current segment
    for (let i = 0; i < spotlights.length - 1; i++) {
      const a = spotlights[i]!;
      const b = spotlights[i + 1]!;
      if (frame >= a.t && frame < b.t) {
        const t = (frame - a.t) / (b.t - a.t);
        const ease = t * t * (3 - 2 * t); // smoothstep
        spotX = a.x + (b.x - a.x) * ease;
        spotY = a.y + (b.y - a.y) * ease;
        spotOpacity = 0.5;
        break;
      }
    }
    // Fade in/out
    if (spotlights.length > 0) {
      const firstT = spotlights[0]!.t;
      const lastT = spotlights[spotlights.length - 1]!.t;
      if (frame < firstT) spotOpacity = 0;
      else if (frame < firstT + 10) spotOpacity = interpolate(frame, [firstT, firstT + 10], [0, 0.5], { extrapolateRight: "clamp" });
      else if (frame > lastT - 10) spotOpacity = interpolate(frame, [lastT - 10, lastT], [0.5, 0], { extrapolateRight: "clamp" });
      else spotOpacity = 0.5;
    }
  }

  // === Simulated cursor ===
  const cursorX = 35 + Math.sin(frame * 0.015) * 15 + Math.cos(frame * 0.008) * 8;
  const cursorY = 40 + Math.cos(frame * 0.012) * 12 + Math.sin(frame * 0.019) * 5;
  const cursorOpacity = interpolate(frame, [20, 35, 250, 280], [0, 0.7, 0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // === Headline entrance ===
  const headlineProg = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 12, stiffness: 150, mass: 0.8 },
  });

  // === Border glow pulse ===
  const glowPulse = 0.15 + Math.sin(frame * 0.04) * 0.1;

  const resolvedSrc = /^https?:\/\//.test(screenshot)
    ? screenshot
    : screenshot.startsWith("/")
      ? screenshot
      : staticFile(screenshot);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        perspective: 1200,
      }}
    >
      {/* Optional headline */}
      {headline && (
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: 48,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${COLORS.textPrimary}, ${COLORS.accentOrange})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textAlign: "center",
            marginBottom: 28,
            opacity: headlineProg,
            transform: `translateY(${(1 - headlineProg) * 20}px)`,
            letterSpacing: "-0.02em",
          }}
        >
          {headline}
        </div>
      )}

      {/* Screenshot container with 3D perspective entrance */}
      <div
        style={{
          position: "relative",
          width: "85%",
          maxWidth: 1600,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: `
            0 25px 60px rgba(0,0,0,0.6),
            0 0 ${60 + glowPulse * 80}px ${COLORS.accentOrange}${Math.round(glowPulse * 255).toString(16).padStart(2, "0")},
            inset 0 0 0 1px rgba(255,255,255,0.08)
          `,
          transform: `
            translateY(${slideY}px)
            translateZ(${-perspZ}px)
            rotateX(${rotX}deg)
          `,
          transformStyle: "preserve-3d",
          opacity: entranceProg,
        }}
      >
        {/* Screenshot with Ken Burns */}
        <div style={{ width: "100%", overflow: "hidden" }}>
          <Img
            src={resolvedSrc}
            style={{
              width: "100%",
              display: "block",
              transform: `scale(${kbZoom}) translate(${kbX}%, ${kbY}%)`,
              transformOrigin: "center center",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* Spotlight overlay */}
        {spotOpacity > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(circle 200px at ${spotX}% ${spotY}%, transparent 0%, rgba(0,0,0,${spotOpacity}) 100%)`,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Simulated cursor */}
        {cursorOpacity > 0 && (
          <div
            style={{
              position: "absolute",
              left: `${cursorX}%`,
              top: `${cursorY}%`,
              width: 20,
              height: 20,
              opacity: cursorOpacity,
              pointerEvents: "none",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
            }}
          >
            {/* CSS arrow cursor */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1">
              <path d="M5 3 L5 20 L10 15 L15 22 L18 20 L13 13 L19 13 Z" />
            </svg>
          </div>
        )}

        {/* Top edge highlight sweep */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent ${interpolate(frame, [0, 60], [0, 100], { extrapolateRight: "clamp" }) - 20}%, ${COLORS.accentOrange} ${interpolate(frame, [0, 60], [0, 100], { extrapolateRight: "clamp" })}%, transparent ${interpolate(frame, [0, 60], [0, 100], { extrapolateRight: "clamp" }) + 20}%)`,
            opacity: interpolate(frame, [5, 15, 55, 65], [0, 0.8, 0.8, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      </div>
    </div>
  );
};
