import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { Caption as CaptionT, CaptionStyle } from "./types";

interface CaptionProps {
    captions: CaptionT[];
    style: CaptionStyle;
    position: "top" | "bottom" | "center";
    palette: { bg: string; fg: string; muted: string; accent: string };
    fps: number;
    sceneDuration: number;
}

/**
 * Caption renderer. Picks current caption based on frame time,
 * applies style-specific look. Karaoke = per-word accent reveal.
 */
export const Caption: React.FC<CaptionProps> = ({
    captions,
    style,
    position,
    palette,
    fps,
    sceneDuration,
}) => {
    const frame = useCurrentFrame();
    const t = frame / fps;

    // Pick the caption whose `t` is the latest <= current t
    const current = [...captions].reverse().find((c) => c.t <= t) ?? captions[0];
    if (!current) return null;

    const baseStyle: React.CSSProperties = {
        position: "absolute",
        left: 0,
        right: 0,
        textAlign: "center",
        padding: "0 80px",
        fontFamily: "Inter, system-ui, sans-serif",
        pointerEvents: "none",
    };

    const positionStyle: React.CSSProperties =
        position === "top" ? { top: 60 } :
        position === "bottom" ? { bottom: 80 } :
        { top: "50%", transform: "translateY(-50%)" };

    if (style === "minimal-top") {
        return (
            <div
                style={{
                    ...baseStyle,
                    ...positionStyle,
                    fontSize: 22,
                    fontWeight: 500,
                    color: palette.muted,
                    letterSpacing: 0.5,
                    maxWidth: 900,
                    margin: "0 auto",
                    lineHeight: 1.35,
                }}
            >
                {current.text}
            </div>
        );
    }

    if (style === "karaoke") {
        const words = current.text.split(/\s+/);
        // Reveal one word every (sceneDuration / words.length) seconds
        const perWord = Math.max(0.15, sceneDuration / Math.max(1, words.length));
        const revealedCount = Math.min(words.length, Math.floor((t - current.t) / perWord) + 1);
        return (
            <div
                style={{
                    ...baseStyle,
                    ...positionStyle,
                    fontSize: 28,
                    fontWeight: 800,
                    maxWidth: 900,
                    margin: "0 auto",
                    lineHeight: 1.3,
                }}
            >
                {words.map((w, i) => (
                    <span
                        key={i}
                        style={{
                            color: i < revealedCount ? palette.accent : palette.muted,
                            transition: "color 100ms",
                            marginRight: 12,
                        }}
                    >
                        {w}
                    </span>
                ))}
            </div>
        );
    }

    // bold-bottom (default)
    return (
        <div
            style={{
                ...baseStyle,
                ...positionStyle,
                fontSize: 28,
                fontWeight: 700,
                color: palette.fg,
                textShadow: "0 4px 20px rgba(0,0,0,0.8)",
                maxWidth: 900,
                margin: "0 auto",
                lineHeight: 1.3,
            }}
        >
            {current.text}
        </div>
    );
};
