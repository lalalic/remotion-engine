import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { COLORS, FONTS } from "../design";

interface Step {
  label: string;
  icon: string;
  tool?: string;
}

/**
 * StepTimeline — Cinematic horizontal pipeline with glowing nodes.
 * Each step ignites in sequence with energy pulse along connectors.
 */
export const StepTimeline: React.FC<{
  headline: string;
  steps?: Step[];
  stepDuration?: number;
}> = ({ headline, steps = [], stepDuration = 25 }) => {
  const frame = useCurrentFrame();

  const containerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const activeStep = Math.floor(frame / stepDuration);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
        opacity: containerOpacity,
      }}
    >
      {headline && (
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: 44,
            fontWeight: 800,
            background: `linear-gradient(135deg, ${COLORS.textPrimary}, ${COLORS.accentOrange})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
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
          alignItems: "center",
          gap: 0,
        }}
      >
        {steps.map((step, i) => {
          const isActive = i <= activeStep;
          const isCurrent = i === activeStep;
          const stepF = frame - i * stepDuration;

          const nodeOpacity = interpolate(stepF, [-5, 10], [0.2, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          const nodeScale = isCurrent
            ? interpolate(stepF, [0, 8, 18], [0.7, 1.15, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              })
            : isActive
              ? 1
              : 0.85;

          const glow = isCurrent
            ? interpolate(stepF, [0, 12], [0, 1], { extrapolateRight: "clamp" })
            : 0;

          // Energy pulse traveling along connector
          const connectorProgress = isActive
            ? 1
            : i === activeStep + 1
              ? interpolate(stepF + stepDuration, [0, stepDuration * 0.6], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : 0;

          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <div style={{ position: "relative", width: 60, height: 4 }}>
                  {/* Base connector */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 2,
                      background: COLORS.bgSubtle,
                      opacity: 0.4,
                    }}
                  />
                  {/* Active glow connector */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%",
                      width: `${connectorProgress * 100}%`,
                      borderRadius: 2,
                      background: `linear-gradient(90deg, ${COLORS.accentOrange}, ${COLORS.accentPink})`,
                      boxShadow: connectorProgress > 0 ? `0 0 12px ${COLORS.accentOrange}80` : "none",
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  opacity: nodeOpacity,
                  transform: `scale(${nodeScale})`,
                }}
              >
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 18,
                    background: isActive
                      ? `linear-gradient(135deg, ${COLORS.accentOrange}, ${COLORS.accentPink})`
                      : COLORS.bgSubtle,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 30,
                    boxShadow: isCurrent
                      ? `0 0 ${24 + glow * 40}px ${COLORS.accentOrange}${Math.round((0.3 + glow * 0.5) * 255).toString(16).padStart(2, "0")}`
                      : "none",
                    border: `1px solid ${isActive ? `${COLORS.accentOrange}50` : COLORS.glassBorder}`,
                  }}
                >
                  {step.icon}
                </div>
                <div
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? COLORS.textPrimary : COLORS.textMuted,
                    textAlign: "center",
                    maxWidth: 100,
                    letterSpacing: "0.01em",
                  }}
                >
                  {step.label}
                </div>
                {step.tool && isCurrent && (
                  <div
                    style={{
                      fontFamily: FONTS.mono,
                      fontSize: 11,
                      color: COLORS.accentCyan,
                      background: `${COLORS.accentCyan}12`,
                      padding: "3px 10px",
                      borderRadius: 6,
                      opacity: interpolate(stepF, [5, 15], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }),
                    }}
                  >
                    {step.tool}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
