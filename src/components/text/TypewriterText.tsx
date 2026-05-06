import * as React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface TypewriterTextProps {
  text: string;
  cursor?: boolean;
  cursorChar?: string;
  speed?: number; // chars per second
  action?: Action;
}

export function TypewriterText({
  text,
  cursor = true,
  cursorChar = "▌",
  speed = 20,
}: TypewriterTextProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const charsToShow = Math.floor((frame / fps) * speed);
  const displayText = text.slice(0, Math.min(charsToShow, text.length));
  const done = charsToShow >= text.length;

  // Cursor blink: visible for first 0.5s of each 1s cycle after typing done
  const cursorOpacity = done
    ? ((frame / fps) % 1 < 0.5 ? 1 : 0)
    : 1;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8%",
      }}
    >
      <div
        style={{
          fontFamily: theme.fonts.mono,
          fontSize: "2.5em",
          color: theme.colors.text,
          lineHeight: 1.4,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {displayText}
        {cursor && (
          <span
            style={{
              color: theme.colors.primary,
              opacity: cursorOpacity,
            }}
          >
            {cursorChar}
          </span>
        )}
      </div>
    </div>
  );
}
