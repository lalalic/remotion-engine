import React from "react";
import {
  useCurrentFrame,
  interpolate,
  Easing,
  OffthreadVideo,
  staticFile,
  useVideoConfig,
  spring,
} from "remotion";
import { COLORS, FONTS } from "../design";

/**
 * VideoClip — Play a pre-recorded demo video with cinematic entrance.
 * 3D perspective reveal, pulsing border glow, aggressive Ken Burns.
 */
export const VideoClip: React.FC<{
  src: string;
  headline?: string;
  startFrom?: number;
  endAt?: number;
  zoom?: number;
  muted?: boolean;
}> = ({ src, headline, startFrom, endAt, zoom = 1, muted = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // === 3D perspective entrance ===
  const entranceProg = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 90, mass: 1.3 },
  });

  const perspZ = interpolate(entranceProg, [0, 1], [250, 0]);
  const rotX = interpolate(entranceProg, [0, 1], [10, 0]);
  const slideY = interpolate(entranceProg, [0, 1], [120, 0]);

  // Ken Burns
  const kbZoom = interpolate(frame, [0, 600], [zoom, zoom + 0.06], {
    extrapolateRight: "clamp",
  });

  // Border glow
  const glowPulse = 0.15 + Math.sin(frame * 0.04) * 0.1;

  // Headline
  const headlineProg = spring({
    frame: Math.max(0, frame - 3),
    fps,
    config: { damping: 12, stiffness: 150, mass: 0.8 },
  });

  const resolvedSrc = /^https?:\/\//.test(src)
    ? src
    : src.startsWith("/")
    ? src
    : staticFile(src);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 60px",
        boxSizing: "border-box",
        perspective: 1200,
      }}
    >
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
            letterSpacing: "-0.02em",
            opacity: headlineProg,
            transform: `translateY(${(1 - headlineProg) * 25}px)`,
          }}
        >
          {headline}
        </div>
      )}

      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1600,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: `
            0 20px 60px rgba(0,0,0,0.5),
            0 0 ${60 + glowPulse * 80}px ${COLORS.accentOrange}${Math.round(glowPulse * 255).toString(16).padStart(2, "0")}
          `,
          transform: `
            translateY(${slideY}px)
            translateZ(${-perspZ}px)
            rotateX(${rotX}deg)
            scale(${kbZoom})
          `,
          transformStyle: "preserve-3d",
          opacity: entranceProg,
        }}
      >
        <OffthreadVideo
          src={resolvedSrc}
          muted={muted}
          startFrom={startFrom ? Math.round(startFrom * fps) : undefined}
          endAt={endAt ? Math.round(endAt * fps) : undefined}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            backgroundColor: "#1e1e1e",
          }}
        />
      </div>
    </div>
  );
};
