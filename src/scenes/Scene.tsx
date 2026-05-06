import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, useCurrentFrame, interpolate, Easing, staticFile } from "remotion";
import type { Scene as SceneT, Aspect } from "./types";
import { Caption } from "./Caption";
import {
    BigStatement,
    PromptTyping,
    ResultFlash,
    StepTimeline,
    ComparisonSplit,
    AgentGraph,
    ScreenCapture,
    VideoClip,
} from "./components";
import { GlowOrb, Vignette, ParticleField } from "./components/Atmosphere";

const resolveAsset = (rel: string): string => {
    if (/^https?:\/\//.test(rel)) return rel;
    if (rel.startsWith("/")) return rel;
    return staticFile(rel);
};

const isVideoAsset = (rel: string): boolean => /\.(mp4|webm|mov)$/i.test(rel);

// Rich components keyed by ComponentName — renders the full scene content
// instead of the default headline+subhead treatment.
const RICH_COMPONENTS: Record<string, React.FC<any>> = {
    BigStatement,
    PromptTyping,
    ResultFlash,
    StepTimeline,
    ComparisonSplit,
    AgentGraph,
    ScreenCapture,
    VideoClip,
};

interface SceneProps {
    scene: SceneT;
    aspect: Aspect;
    fps: number;
    isCover?: boolean;
}

/**
 * Single dispatcher component for all scene intents. Visual treatment
 * is driven by `scene.component`. Layout adapts to aspect via flex.
 *
 * Rich components (BigStatement, PromptTyping, etc.) get full scene
 * control. Classic components follow the 3-zone structure:
 *   [BACKGROUND] [HEADLINE + SUBHEAD] [CAPTION]
 * with per-component coloring/typography.
 */
export const Scene: React.FC<SceneProps> = ({ scene, aspect, fps, isCover }) => {
    const frame = useCurrentFrame();

    // Check if this scene uses a rich component
    const RichComponent = RICH_COMPONENTS[scene.component];
    if (RichComponent && !isCover) {
        const palette = PALETTE[scene.component] ?? DEFAULT_PALETTE;
        return (
            <AbsoluteFill style={{ backgroundColor: palette.bg }}>
                {/* Cinematic atmosphere — glow orbs + vignette + particles */}
                <GlowOrb x={20} y={30} size={600} color={palette.accent} speed={0.003} />
                <GlowOrb x={80} y={70} size={500} color="#a855f7" speed={0.002} />
                <ParticleField count={20} color={palette.accent} />
                <Vignette />
                {/* Background image/video (if specified) */}
                {scene.props.background && (
                    <AbsoluteFill style={{ opacity: 0.35 }}>
                        {isVideoAsset(scene.props.background) ? (
                            <OffthreadVideo
                                src={resolveAsset(scene.props.background)}
                                muted
                                style={{ width: "100%", height: "100%", objectFit: "cover", backgroundColor: palette.bg }}
                            />
                        ) : (
                            <Img
                                src={resolveAsset(scene.props.background)}
                                style={{ width: "100%", height: "100%", objectFit: "cover", backgroundColor: palette.bg }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                        )}
                    </AbsoluteFill>
                )}

                {/* Rich component gets the full scene.props */}
                <RichComponent {...scene.props} />

                {/* Captions */}
                {scene.captions && scene.captions.length > 0 && scene.captionStyle !== "none" && (
                    <Caption
                        captions={scene.captions}
                        style={scene.captionStyle ?? "bold-bottom"}
                        position={scene.captionStyle === "minimal-top" ? "top" : "bottom"}
                        palette={palette}
                        fps={fps}
                        sceneDuration={scene.duration}
                    />
                )}
            </AbsoluteFill>
        );
    }

    // Classic scene rendering (Hook, Problem, Solution, etc.)
    const intro = isCover
        ? 1
        : interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });

    const isPortrait = aspect === "9x16";
    const isSquare = aspect === "1x1";

    const palette = PALETTE[scene.component] ?? DEFAULT_PALETTE;

    // Feature shot mode: real screenshot is the star. Background renders at
    // full opacity, headline shrinks and pins to a bottom strip. Opt in via
    // props.featureShot: true.
    const featureShot = (scene.props as { featureShot?: boolean }).featureShot === true;

    const fontSizeHeadline = featureShot
        ? (isPortrait ? 56 : isSquare ? 52 : 64)
        : (isPortrait ? 96 : isSquare ? 88 : 120);
    const fontSizeSubhead  = featureShot
        ? (isPortrait ? 30 : isSquare ? 28 : 34)
        : (isPortrait ? 40 : isSquare ? 38 : 48);

    const captionPosition: "top" | "bottom" | "center" =
        scene.captionStyle === "minimal-top" ? "top" :
        scene.captionStyle === "none" ? "center" : "bottom";

    return (
        <AbsoluteFill style={{ backgroundColor: palette.bg }}>
            {/* Background image / video / generated visual */}
            {scene.props.background && (
                <AbsoluteFill style={{ opacity: featureShot ? 0.95 : 0.35 }}>
                    {isVideoAsset(scene.props.background) ? (
                        <OffthreadVideo
                            src={resolveAsset(scene.props.background)}
                            muted
                            style={{ width: "100%", height: "100%", objectFit: featureShot ? "contain" : "cover", backgroundColor: palette.bg }}
                        />
                    ) : (
                        <Img
                            src={resolveAsset(scene.props.background)}
                            style={{ width: "100%", height: "100%", objectFit: featureShot ? "contain" : "cover", backgroundColor: palette.bg }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                    )}
                </AbsoluteFill>
            )}

            {/* Generated background placeholder (procedural pattern) */}
            {!scene.props.background && scene.props.generated && (
                <AbsoluteFill
                    style={{
                        background: `linear-gradient(135deg, ${palette.accent}22, transparent 60%)`,
                    }}
                />
            )}

            {/* Headline + subhead block */}
            <AbsoluteFill
                style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: featureShot ? "flex-end" : "center",
                    alignItems: "center",
                    padding: isPortrait ? 80 : 120,
                    textAlign: "center",
                    opacity: intro,
                    transform: `translateY(${(1 - intro) * 20}px)`,
                }}
            >
                <div
                    style={{
                        fontSize: fontSizeHeadline,
                        fontWeight: 800,
                        color: palette.fg,
                        lineHeight: 1.05,
                        letterSpacing: featureShot ? -0.5 : -2,
                        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                        maxWidth: "90%",
                        ...(featureShot ? {
                            background: "rgba(0,0,0,0.55)",
                            padding: "16px 28px",
                            borderRadius: 16,
                            backdropFilter: "blur(8px)",
                            marginBottom: isPortrait ? 220 : 140,
                        } : {}),
                    }}
                >
                    {scene.props.headline}
                </div>
                {scene.props.subhead && (
                    <div
                        style={{
                            marginTop: 28,
                            fontSize: fontSizeSubhead,
                            fontWeight: 500,
                            color: palette.muted,
                            fontFamily: "Inter, system-ui, sans-serif",
                            maxWidth: "75%",
                        }}
                    >
                        {scene.props.subhead}
                    </div>
                )}
            </AbsoluteFill>

            {/* Intent badge overlay (Demo scenes): pill at top-center fades in 0–0.3s, out 1.0–1.4s */}
            {!isCover && (scene.props as { intentBadge?: string }).intentBadge && (() => {
                const badgeIn  = interpolate(frame, [0, 9],  [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });
                const badgeOut = interpolate(frame, [30, 42], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.ease) });
                const badgeOpacity = Math.min(badgeIn, badgeOut);
                if (badgeOpacity <= 0.01) return null;
                return (
                    <AbsoluteFill style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", paddingTop: isPortrait ? 80 : 60, opacity: badgeOpacity }}>
                        <div style={{
                            background: "rgba(0,0,0,0.78)",
                            color: "#ffffff",
                            fontSize: isPortrait ? 32 : 28,
                            fontWeight: 600,
                            padding: "14px 28px",
                            borderRadius: 999,
                            border: `2px solid ${palette.accent}`,
                            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
                            letterSpacing: 0.2,
                            backdropFilter: "blur(6px)",
                            maxWidth: "86%",
                            textAlign: "center",
                        }}>
                            🎯 {(scene.props as { intentBadge?: string }).intentBadge}
                        </div>
                    </AbsoluteFill>
                );
            })()}

            {/* Captions (skip on cover; auto-suppress when featureShot has a bottom-pinned headline plate) */}
            {!isCover && scene.captions && scene.captions.length > 0 && scene.captionStyle !== "none" && !featureShot && (
                <Caption
                    captions={scene.captions}
                    style={scene.captionStyle ?? "bold-bottom"}
                    position={captionPosition}
                    palette={palette}
                    fps={fps}
                    sceneDuration={scene.duration}
                />
            )}
        </AbsoluteFill>
    );
};

// Palette per intent. Cinematic — warm highlights, deep blacks, high energy.
const DEFAULT_PALETTE = { bg: "#050505", fg: "#fafafa", muted: "#a1a1aa", accent: "#f97316" };
const PALETTE: Record<string, { bg: string; fg: string; muted: string; accent: string }> = {
    // Classic intents
    Hook:        { bg: "#050505", fg: "#fafafa", muted: "#a1a1aa", accent: "#f97316" },
    Problem:     { bg: "#0a0505", fg: "#fde8e8", muted: "#d4a0a0", accent: "#ef4444" },
    Solution:    { bg: "#050a0a", fg: "#e8fdfa", muted: "#88ccbb", accent: "#10b981" },
    Feature:     { bg: "#05050a", fg: "#e8e8fd", muted: "#a0a0d4", accent: "#a855f7" },
    Demo:        { bg: "#030303", fg: "#fafafa", muted: "#71717a", accent: "#10b981" },
    Testimonial: { bg: "#0a0a05", fg: "#fdf8e8", muted: "#ccbb88", accent: "#f59e0b" },
    CTA:         { bg: "#050505", fg: "#fafafa", muted: "#d4d4d8", accent: "#f97316" },
    Outro:       { bg: "#050505", fg: "#71717a", muted: "#3f3f46", accent: "#52525b" },
    // Rich cinematic components
    BigStatement:    { bg: "#050505", fg: "#fafafa", muted: "#a1a1aa", accent: "#f97316" },
    PromptTyping:    { bg: "#050505", fg: "#fafafa", muted: "#52525b", accent: "#06b6d4" },
    ResultFlash:     { bg: "#050505", fg: "#fafafa", muted: "#a1a1aa", accent: "#f97316" },
    StepTimeline:    { bg: "#050505", fg: "#fafafa", muted: "#52525b", accent: "#06b6d4" },
    ComparisonSplit: { bg: "#050505", fg: "#fafafa", muted: "#52525b", accent: "#10b981" },
    AgentGraph:      { bg: "#050505", fg: "#fafafa", muted: "#a1a1aa", accent: "#a855f7" },
    ScreenCapture:   { bg: "#050505", fg: "#fafafa", muted: "#a1a1aa", accent: "#3b82f6" },
    VideoClip:       { bg: "#030303", fg: "#fafafa", muted: "#a1a1aa", accent: "#10b981" },
};
