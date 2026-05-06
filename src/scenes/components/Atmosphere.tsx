import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../design";

/**
 * GlowOrb — Animated background orb for atmosphere.
 */
export const GlowOrb: React.FC<{
  x: number;
  y: number;
  size?: number;
  color?: string;
  speed?: number;
}> = ({ x, y, size = 400, color = COLORS.accentBlue, speed = 0.002 }) => {
  const frame = useCurrentFrame();
  const xOff = Math.sin(frame * speed) * 30;
  const yOff = Math.cos(frame * speed * 0.7) * 20;

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
        transform: `translate(-50%, -50%) translate(${xOff}px, ${yOff}px)`,
        filter: "blur(60px)",
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * GridBackground — Subtle animated grid pattern.
 */
export const GridBackground: React.FC<{ opacity?: number }> = ({
  opacity = 0.03,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity,
      backgroundImage: `
        linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
      `,
      backgroundSize: "60px 60px",
    }}
  />
);

/**
 * Vignette — Edge darkening for cinematic feel.
 */
export const Vignette: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background:
        "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)",
      pointerEvents: "none",
    }}
  />
);

/**
 * GradientText — Text with gradient fill.
 */
export const GradientText: React.FC<{
  children: React.ReactNode;
  from?: string;
  to?: string;
  style?: React.CSSProperties;
}> = ({
  children,
  from = COLORS.accentBlue,
  to = COLORS.accentCyan,
  style,
}) => (
  <span
    style={{
      background: `linear-gradient(135deg, ${from}, ${to})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      ...style,
    }}
  >
    {children}
  </span>
);

/**
 * ParticleField — Floating particles for ambiance.
 */
export const ParticleField: React.FC<{
  count?: number;
  color?: string;
}> = ({ count = 30, color = COLORS.accentBlue }) => {
  const frame = useCurrentFrame();

  const particles = React.useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (i * 73.31) % 100,
        y: (i * 41.17) % 100,
        size: 2 + (i % 4),
        speed: 0.2 + (i % 5) * 0.1,
        phase: (i * 2.14) % (Math.PI * 2),
      })),
    [count]
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {particles.map((p, i) => {
        const px = p.x + Math.sin(frame * p.speed * 0.01 + p.phase) * 3;
        const py = ((p.y + frame * p.speed * 0.05) % 110) - 5;
        const opacity = 0.15 + Math.sin(frame * 0.02 + p.phase) * 0.1;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${px}%`,
              top: `${py}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: color,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * ScanLine — Horizontal scan line effect (sci-fi).
 */
export const ScanLine: React.FC<{
  speed?: number;
  color?: string;
}> = ({ speed = 0.5, color = COLORS.accentCyan }) => {
  const frame = useCurrentFrame();
  const y = (frame * speed) % 110;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: `${y}%`,
        height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${color}40 20%, ${color}20 50%, ${color}40 80%, transparent 100%)`,
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * CounterAnimation — Animated counting number.
 */
export const CounterAnimation: React.FC<{
  from: number;
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  style?: React.CSSProperties;
}> = ({ from, to, duration = 30, suffix = "", prefix = "", style }) => {
  const frame = useCurrentFrame();

  const progress = Math.min(1, frame / duration);
  const eased = 1 - Math.pow(1 - progress, 3);
  const value = Math.round(from + (to - from) * eased);

  return (
    <span style={style}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
};
