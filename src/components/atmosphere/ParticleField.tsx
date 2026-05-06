import * as React from "react";
import { useCurrentFrame, useVideoConfig, random } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface ParticleFieldProps {
  count?: number;
  speed?: number;
  size?: [number, number]; // min, max
  color?: string;
  action?: Action;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export function ParticleField({
  count = 40,
  speed = 0.3,
  size = [2, 6],
  color,
}: ParticleFieldProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const particleColor = color ?? theme.colors.primary;

  // Generate stable particles from seed
  const particles = React.useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: random(`px${i}`) * 100,
      y: random(`py${i}`) * 100,
      vx: (random(`vx${i}`) - 0.5) * speed * 2,
      vy: (random(`vy${i}`) - 0.5) * speed * 2,
      size: size[0] + random(`s${i}`) * (size[1] - size[0]),
      opacity: 0.2 + random(`o${i}`) * 0.6,
    }));
  }, [count, speed, size[0], size[1]]);

  const t = frame / fps;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {particles.map((p, i) => {
        const x = ((p.x + p.vx * t * 10) % 110 + 110) % 110 - 5;
        const y = ((p.y + p.vy * t * 10) % 110 + 110) % 110 - 5;
        const pulseOpacity = p.opacity * (0.7 + 0.3 * Math.sin(t * 2 + i));

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: particleColor,
              opacity: pulseOpacity,
              filter: `blur(${p.size > 4 ? 1 : 0}px)`,
              boxShadow: `0 0 ${p.size * 2}px ${particleColor}44`,
            }}
          />
        );
      })}
    </div>
  );
}
