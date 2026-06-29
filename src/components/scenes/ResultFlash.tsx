import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { COLORS, FONTS } from "./design";

/**
 * ResultFlash — Shows results appearing in a dramatic cascade.
 * Items fly in one by one with glow effects.
 *
 * Props (via scene.props):
 *   headline: string — section title (displayed above cards)
 *   items: Array<{icon, label, detail?}> — the result cards
 *   stagger?: number — frames between each item (default 12)
 */
export const ResultFlash: React.FC<{
  headline: string;
  items?: Array<{ icon: string; label: string; detail?: string }>;
  stagger?: number;
}> = ({ headline, items = [], stagger = 12 }) => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
      }}
    >
      {headline && (
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: 48,
            fontWeight: 800,
            background: `linear-gradient(135deg, ${COLORS.textPrimary}, ${COLORS.accentOrange})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            opacity: titleOpacity,
            textAlign: "center",
            letterSpacing: "-0.02em",
          }}
        >
          {headline}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 32,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 1400,
        }}
      >
        {items.map((item, i) => {
          const itemF = frame - 15 - i * stagger;
          if (itemF < 0) return null;

          const opacity = interpolate(itemF, [0, 15], [0, 1], {
            extrapolateRight: "clamp",
          });

          const scale = interpolate(itemF, [0, 15], [0.6, 1], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          const y = interpolate(itemF, [0, 15], [40, 0], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          const glow = interpolate(itemF, [0, 8, 30], [0, 1, 0.3], {
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `scale(${scale}) translateY(${y}px)`,
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.accentOrange}${Math.round((0.1 + glow * 0.4) * 255).toString(16).padStart(2, '0')}`,
                borderRadius: 20,
                padding: "28px 40px",
                minWidth: 280,
                textAlign: "center",
                boxShadow: `0 0 ${20 + glow * 40}px ${COLORS.accentOrange}${Math.round(glow * 0.35 * 255).toString(16).padStart(2, '0')}`,
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>{item.icon}</div>
              <div
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: 24,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                }}
              >
                {item.label}
              </div>
              {item.detail && (
                <div
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 16,
                    color: COLORS.textSecondary,
                    marginTop: 8,
                  }}
                >
                  {item.detail}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
