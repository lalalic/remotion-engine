import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import type { Transition } from "../types";

/**
 * TransitionWrapper — Wraps scene content with entrance/exit transitions.
 * Provides zoom-through, wipe, slide, and fade effects.
 * Also adds a subtle "camera breathing" throughout the scene.
 */
export const TransitionWrapper: React.FC<{
  children: React.ReactNode;
  transitionIn?: Transition;
  transitionOut?: Transition;
  durationFrames: number;
  /** Override transition duration in frames (default 12 for in, 8 for out) */
  transInFrames?: number;
  transOutFrames?: number;
}> = ({
  children,
  transitionIn = "cut",
  transitionOut = "cut",
  durationFrames,
  transInFrames = 12,
  transOutFrames = 8,
}) => {
  const frame = useCurrentFrame();

  // === Entrance ===
  let inOpacity = 1;
  let inScale = 1;
  let inX = 0;
  let inY = 0;
  let inRotate = 0;

  switch (transitionIn) {
    case "fade":
      inOpacity = interpolate(frame, [0, transInFrames], [0, 1], {
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      break;
    case "zoom":
      inOpacity = interpolate(frame, [0, transInFrames * 0.4], [0, 1], {
        extrapolateRight: "clamp",
      });
      inScale = interpolate(frame, [0, transInFrames], [1.3, 1], {
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      break;
    case "slide-left":
      inOpacity = interpolate(frame, [0, transInFrames * 0.5], [0, 1], {
        extrapolateRight: "clamp",
      });
      inX = interpolate(frame, [0, transInFrames], [120, 0], {
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      break;
    case "slide-up":
      inOpacity = interpolate(frame, [0, transInFrames * 0.5], [0, 1], {
        extrapolateRight: "clamp",
      });
      inY = interpolate(frame, [0, transInFrames], [80, 0], {
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      break;
    case "cut":
    default:
      // Instant — but add a tiny 2-frame flash for energy
      inOpacity = frame < 1 ? 0.8 : 1;
      break;
  }

  // === Exit ===
  const exitStart = durationFrames - transOutFrames;
  let outOpacity = 1;
  let outScale = 1;

  if (frame >= exitStart) {
    switch (transitionOut) {
      case "fade":
        outOpacity = interpolate(
          frame,
          [exitStart, durationFrames],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        break;
      case "zoom":
        outOpacity = interpolate(
          frame,
          [exitStart + transOutFrames * 0.5, durationFrames],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        outScale = interpolate(
          frame,
          [exitStart, durationFrames],
          [1, 0.85],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.cubic),
          }
        );
        break;
      case "slide-left":
        outOpacity = interpolate(
          frame,
          [exitStart, durationFrames],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        break;
      case "cut":
      default:
        break;
    }
  }

  // === Camera breathing — subtle continuous motion ===
  const breatheScale = 1 + Math.sin(frame * 0.008) * 0.004;
  const breatheX = Math.sin(frame * 0.005) * 2;
  const breatheY = Math.cos(frame * 0.007) * 1.5;
  const breatheRotate = Math.sin(frame * 0.003) * 0.15;

  const totalScale = inScale * outScale * breatheScale;
  const totalX = inX + breatheX;
  const totalY = inY + breatheY;
  const totalRotate = inRotate + breatheRotate;
  const totalOpacity = inOpacity * outOpacity;

  return (
    <AbsoluteFill
      style={{
        opacity: totalOpacity,
        transform: `translate(${totalX}px, ${totalY}px) scale(${totalScale}) rotate(${totalRotate}deg)`,
        willChange: "transform, opacity",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
