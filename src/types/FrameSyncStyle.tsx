import * as React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Wraps children in a <div> that syncs CSS animations to the current Remotion frame.
 *
 * CSS @keyframes animations are wall-clock-based and don't respond to
 * Remotion's frame-based seeking. This component freezes the animation
 * at the correct time by setting:
 *   animation-play-state: paused
 *   animation-delay: -${currentTime}s
 *
 * If the style has no `animation` property, it applies the style directly
 * with no overhead.
 */
export function FrameSyncStyle({
  style,
  children,
}: {
  style: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasAnimation = "animation" in style;

  const mergedStyle = React.useMemo<React.CSSProperties>(() => {
    if (!hasAnimation) return style as React.CSSProperties;

    const currentTime = frame / fps;
    return {
      ...style,
      animationPlayState: "paused",
      animationDelay: `-${currentTime}s`,
    } as React.CSSProperties;
  }, [style, hasAnimation, frame, fps]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        ...mergedStyle,
      }}
    >
      {children}
    </div>
  );
}
