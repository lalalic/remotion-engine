import type { Theme } from "./schema";

export const cinematic: Theme = {
  name: "cinematic",
  colors: {
    background: "#050505",
    surface: "#161618",
    primary: "#f97316",
    secondary: "#ec4899",
    text: "#fafafa",
    textMuted: "#a1a1aa",
    gradient: ["#f97316", "#ec4899"],
  },
  fonts: {
    heading: "'SF Pro Display', 'Inter', sans-serif",
    body: "'SF Pro Text', 'Inter', sans-serif",
    mono: "'SF Mono', 'JetBrains Mono', monospace",
  },
  timing: {
    spring: { damping: 12, stiffness: 180, mass: 0.8 },
    stagger: 4,
    transitionDuration: 0.5,
  },
  effects: {
    particles: true,
    gradientBg: true,
    motionBlur: false,
    grain: 0.03,
  },
};

export const minimal: Theme = {
  name: "minimal",
  colors: {
    background: "#ffffff",
    surface: "#f4f4f5",
    primary: "#18181b",
    secondary: "#3b82f6",
    text: "#18181b",
    textMuted: "#71717a",
    gradient: ["#18181b", "#3b82f6"],
  },
  fonts: {
    heading: "'Inter', 'Helvetica Neue', sans-serif",
    body: "'Inter', 'Helvetica Neue', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  timing: {
    spring: { damping: 15, stiffness: 200, mass: 0.6 },
    stagger: 3,
    transitionDuration: 0.4,
  },
  effects: {
    particles: false,
    gradientBg: false,
    motionBlur: false,
    grain: 0,
  },
};

export const neon: Theme = {
  name: "neon",
  colors: {
    background: "#0a0a0a",
    surface: "#1a1a2e",
    primary: "#00ff88",
    secondary: "#00d4ff",
    text: "#e0e0e0",
    textMuted: "#888888",
    gradient: ["#00ff88", "#00d4ff"],
  },
  fonts: {
    heading: "'Space Grotesk', 'Inter', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'Fira Code', 'JetBrains Mono', monospace",
  },
  timing: {
    spring: { damping: 10, stiffness: 220, mass: 0.7 },
    stagger: 3,
    transitionDuration: 0.3,
  },
  effects: {
    particles: true,
    gradientBg: true,
    motionBlur: true,
    grain: 0.02,
  },
};

export const corporate: Theme = {
  name: "corporate",
  colors: {
    background: "#0f172a",
    surface: "#1e293b",
    primary: "#3b82f6",
    secondary: "#f59e0b",
    text: "#f8fafc",
    textMuted: "#94a3b8",
    gradient: ["#3b82f6", "#8b5cf6"],
  },
  fonts: {
    heading: "'Plus Jakarta Sans', 'Inter', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'SF Mono', 'Fira Code', monospace",
  },
  timing: {
    spring: { damping: 14, stiffness: 160, mass: 0.9 },
    stagger: 5,
    transitionDuration: 0.6,
  },
  effects: {
    particles: false,
    gradientBg: true,
    motionBlur: false,
    grain: 0,
  },
};

export const themePresets: Record<string, Theme> = {
  cinematic,
  minimal,
  neon,
  corporate,
};
