import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, random } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface GlitchRevealProps {
  text: string;
  intensity?: number; // 0–1
  action?: Action;
}

export function GlitchReveal({
  text,
  intensity = 0.7,
}: GlitchRevealProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  // Phase 1: glitch scramble (0–40% of duration)
  // Phase 2: resolve to real text (40–60%)
  // Phase 3: stable (60%+)
  const glitchChars = "█▓▒░▀▄▌▐┃━╋╋╳";

  const revealProg = spring({
    frame: frame - fps * 0.3,
    fps,
    config: { damping: 15, stiffness: 120, mass: 1 },
  });

  const glitchActive = frame < fps * 0.8;

  const chars = text.split("").map((char, i) => {
    const charRevealFrame = fps * 0.2 + i * 1.5;
    const revealed = frame >= charRevealFrame;
    
    if (revealed && revealProg > 0.5) return char;
    if (!glitchActive && revealProg > 0.8) return char;

    // Random glitch char, changing every few frames
    const seed = `${i}-${Math.floor(frame / 2)}`;
    const randIdx = Math.floor(Math.abs(random(seed)) * glitchChars.length);
    return char === " " ? " " : glitchChars[randIdx % glitchChars.length];
  });

  // RGB split offsets
  const splitAmount = glitchActive ? intensity * 3 * (1 - revealProg) : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5%",
      }}
    >
      <div style={{ position: "relative" }}>
        {/* Red channel offset */}
        {splitAmount > 0 && (
          <div
            style={{
              position: "absolute",
              fontFamily: theme.fonts.heading,
              fontSize: "4em",
              fontWeight: 800,
              color: "rgba(255,0,0,0.5)",
              transform: `translate(${splitAmount}px, ${-splitAmount * 0.5}px)`,
              mixBlendMode: "screen",
              whiteSpace: "pre",
            }}
          >
            {chars?.join("")}
          </div>
        )}

        {/* Blue channel offset */}
        {splitAmount > 0 && (
          <div
            style={{
              position: "absolute",
              fontFamily: theme.fonts.heading,
              fontSize: "4em",
              fontWeight: 800,
              color: "rgba(0,100,255,0.5)",
              transform: `translate(${-splitAmount}px, ${splitAmount * 0.5}px)`,
              mixBlendMode: "screen",
              whiteSpace: "pre",
            }}
          >
            {chars?.join("")}
          </div>
        )}

        {/* Main text */}
        <div
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: "4em",
            fontWeight: 800,
            color: theme.colors.text,
            position: "relative",
            whiteSpace: "pre",
          }}
        >
          {chars?.join("")}
        </div>
      </div>
    </div>
  );
}
