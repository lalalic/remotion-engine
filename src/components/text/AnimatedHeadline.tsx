import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface AnimatedHeadlineProps {
  text: string;
  subtext?: string;
  split?: "word" | "char" | "line";
  gradient?: boolean;
  glow?: boolean;
  align?: "center" | "left" | "right";
  action?: Action;
}

export function AnimatedHeadline({
  text,
  subtext,
  split = "word",
  gradient = false,
  glow = true,
  align = "center",
}: AnimatedHeadlineProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const parts = React.useMemo(() => {
    if (split === "char") return text.split("");
    if (split === "line") return text.split("\n");
    return text.split(/\s+/);
  }, [text, split]);

  const separator = split === "char" ? "" : " ";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        justifyContent: "center",
        padding: "5%",
      }}
    >
      {/* Glow orb */}
      {glow && (
        <div
          style={{
            position: "absolute",
            width: "40%",
            height: "40%",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${theme.colors.primary}33, transparent 70%)`,
            filter: "blur(60px)",
            opacity: interpolate(frame, [0, fps * 0.5], [0, 0.6], {
              extrapolateRight: "clamp",
            }),
          }}
        />
      )}

      {/* Main text */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
          gap: split === "char" ? 0 : "0 0.3em",
          position: "relative",
          zIndex: 1,
        }}
      >
        {parts.map((part, i) => {
          const delay = i * theme.timing.stagger;
          const prog = spring({
            frame: frame - delay,
            fps,
            config: {
              damping: theme.timing.spring.damping,
              stiffness: theme.timing.spring.stiffness,
              mass: theme.timing.spring.mass,
            },
          });

          // Alternate direction per word
          const directions = [
            { x: 0, y: 30 },
            { x: -20, y: 0 },
            { x: 20, y: 0 },
            { x: 0, y: -30 },
          ];
          const dir = directions[i % directions.length]!;

          const textStyle: React.CSSProperties = gradient
            ? {
                background: `linear-gradient(135deg, ${theme.colors.gradient[0]}, ${theme.colors.gradient[1]})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }
            : { color: theme.colors.text };

          return (
            <span
              key={i}
              style={{
                fontFamily: theme.fonts.heading,
                fontSize: split === "char" ? "5em" : "4em",
                fontWeight: 800,
                lineHeight: 1.1,
                display: "inline-block",
                transform: `translate(${dir.x * (1 - prog)}px, ${dir.y * (1 - prog)}px) scale(${0.8 + 0.2 * prog})`,
                opacity: prog,
                filter: `blur(${(1 - prog) * 8}px)`,
                ...textStyle,
              }}
            >
              {part}
              {i < parts.length - 1 ? separator : ""}
            </span>
          );
        })}
      </div>

      {/* Subtext */}
      {subtext && (
        <div
          style={{
            fontFamily: theme.fonts.body,
            fontSize: "1.5em",
            color: theme.colors.textMuted,
            marginTop: "0.5em",
            opacity: interpolate(frame, [fps * 0.8, fps * 1.2], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            filter: `blur(${interpolate(frame, [fps * 0.8, fps * 1.2], [6, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}px)`,
            transform: `translateY(${interpolate(frame, [fps * 0.8, fps * 1.2], [15, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}px)`,
            textAlign: align,
            position: "relative",
            zIndex: 1,
          }}
        >
          {subtext}
        </div>
      )}

      {/* Impact flash on first word landing */}
      {(() => {
        const flashProg = spring({
          frame: frame - theme.timing.stagger,
          fps,
          config: { damping: 20, stiffness: 300, mass: 0.5 },
        });
        return (
          <div
            style={{
              position: "absolute",
              width: "20%",
              height: "4px",
              background: `linear-gradient(90deg, transparent, ${theme.colors.primary}, transparent)`,
              opacity: flashProg * (1 - flashProg) * 4,
              bottom: "35%",
              left: "40%",
              zIndex: 1,
            }}
          />
        );
      })()}
    </div>
  );
}
