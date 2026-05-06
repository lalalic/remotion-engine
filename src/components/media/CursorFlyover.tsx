import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface CursorFlyoverProps {
  src: string;
  steps: Array<{
    region: { x: number; y: number; zoom: number };
    cursor?: { x: number; y: number };
    annotation?: string;
    duration: number;
  }>;
  action?: Action;
}

function CursorSVG({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 3L19 12L12 12L8 19L5 3Z"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CursorFlyover({ src, steps }: CursorFlyoverProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  // Compute cumulative timings
  const timings = React.useMemo(() => {
    let acc = 0;
    return steps.map((s) => {
      const start = acc;
      acc += s.duration;
      return { start, end: acc };
    });
  }, [steps]);

  // Find current step
  const currentTime = frame / fps;
  let stepIdx = 0;
  for (let i = 0; i < timings.length; i++) {
    if (currentTime >= timings[i]!.start && currentTime < timings[i]!.end) {
      stepIdx = i;
      break;
    }
    if (i === timings.length - 1) stepIdx = i;
  }

  const step = steps[stepIdx]!;
  const timing = timings[stepIdx]!;
  const stepFrame = frame - timing.start * fps;

  // Smooth transition between steps
  const prevStep = stepIdx > 0 ? steps[stepIdx - 1] : step;
  const transitionFrames = fps * 0.3;
  const t = Math.min(1, stepFrame / transitionFrames);
  const ease = t * t * (3 - 2 * t); // smoothstep

  const regionX = interpolate(ease, [0, 1], [prevStep!.region.x, step.region.x]);
  const regionY = interpolate(ease, [0, 1], [prevStep!.region.y, step.region.y]);
  const zoom = interpolate(ease, [0, 1], [prevStep!.region.zoom, step.region.zoom]);

  // Cursor position
  const cursorX = step.cursor ? interpolate(ease, [0, 1], [
    prevStep!.cursor?.x ?? step.cursor.x,
    step.cursor.x,
  ]) : 50;
  const cursorY = step.cursor ? interpolate(ease, [0, 1], [
    prevStep!.cursor?.y ?? step.cursor.y,
    step.cursor.y,
  ]) : 50;

  // Click ripple
  const clickProg = spring({
    frame: stepFrame - transitionFrames,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: 12,
      }}
    >
      {/* Screenshot with pan/zoom */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${zoom}) translate(${-regionX}%, ${-regionY}%)`,
          transformOrigin: "center center",
          transition: "none",
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* Cursor */}
      {step.cursor && (
        <div
          style={{
            position: "absolute",
            left: `${cursorX}%`,
            top: `${cursorY}%`,
            transform: "translate(-2px, -2px)",
            zIndex: 10,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
          }}
        >
          <CursorSVG color={theme.colors.primary} />

          {/* Click ripple */}
          {clickProg > 0 && clickProg < 0.95 && (
            <div
              style={{
                position: "absolute",
                left: 12,
                top: 12,
                width: 40 * clickProg,
                height: 40 * clickProg,
                borderRadius: "50%",
                border: `2px solid ${theme.colors.primary}`,
                opacity: 1 - clickProg,
                transform: "translate(-50%, -50%)",
              }}
            />
          )}
        </div>
      )}

      {/* Annotation */}
      {step.annotation && (
        <div
          style={{
            position: "absolute",
            bottom: "8%",
            left: "50%",
            transform: `translateX(-50%) translateY(${interpolate(
              stepFrame,
              [0, transitionFrames],
              [20, 0],
              { extrapolateRight: "clamp" },
            )}px)`,
            opacity: interpolate(stepFrame, [0, transitionFrames * 0.5], [0, 1], {
              extrapolateRight: "clamp",
            }),
            background: `${theme.colors.surface}ee`,
            padding: "12px 24px",
            borderRadius: 8,
            fontFamily: theme.fonts.body,
            fontSize: "1.2em",
            color: theme.colors.text,
            whiteSpace: "nowrap",
            zIndex: 5,
          }}
        >
          {step.annotation}
        </div>
      )}
    </div>
  );
}
