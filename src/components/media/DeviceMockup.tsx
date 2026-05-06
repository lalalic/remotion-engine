import * as React from "react";
import { useCurrentFrame, useVideoConfig, spring, Img } from "remotion";
import { useTheme } from "../../themes";
import type { Action } from "../../schema";

export interface DeviceMockupProps {
  device: "browser" | "phone" | "tablet" | "laptop";
  src: string;
  title?: string;
  angle?: number; // 3D perspective angle (degrees, 0 = flat)
  shadow?: boolean;
  action?: Action;
}

function BrowserChrome({ title, theme }: { title?: string; theme: any }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        background: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.background}`,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
      }}
    >
      {/* Traffic lights */}
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
      </div>
      {/* URL bar */}
      <div
        style={{
          flex: 1,
          background: theme.colors.background,
          borderRadius: 6,
          padding: "5px 12px",
          fontSize: 13,
          color: theme.colors.textMuted,
          fontFamily: theme.fonts.body,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title || "localhost:3000"}
      </div>
    </div>
  );
}

function PhoneFrame({ children, theme }: { children: React.ReactNode; theme: any }) {
  return (
    <div
      style={{
        border: `3px solid ${theme.colors.surface}`,
        borderRadius: 36,
        padding: "12px 4px",
        background: theme.colors.surface,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "35%",
          height: 24,
          background: theme.colors.surface,
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
          zIndex: 2,
        }}
      />
      <div style={{ borderRadius: 24, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

export function DeviceMockup({
  device,
  src,
  title,
  angle = 0,
  shadow = true,
}: DeviceMockupProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100, mass: 1.2 },
  });

  const scale = 0.85 + 0.15 * entrance;
  const translateY = 40 * (1 - entrance);
  const opacity = entrance;
  const perspective = angle > 0 ? `perspective(1200px) rotateY(${angle * (1 - entrance * 0.5)}deg)` : "";

  const content = (
    <Img
      src={src}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  );

  const maxWidth = device === "phone" ? "35%" : device === "tablet" ? "55%" : "80%";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth,
          width: "100%",
          transform: `scale(${scale}) translateY(${translateY}px) ${perspective}`,
          opacity,
          filter: shadow ? `drop-shadow(0 25px 60px rgba(0,0,0,0.5))` : undefined,
        }}
      >
        {device === "phone" ? (
          <PhoneFrame theme={theme}>{content}</PhoneFrame>
        ) : (
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${theme.colors.surface}`,
            }}
          >
            {device === "browser" && <BrowserChrome title={title} theme={theme} />}
            {device === "laptop" && <BrowserChrome title={title} theme={theme} />}
            {content}
          </div>
        )}
      </div>
    </div>
  );
}
