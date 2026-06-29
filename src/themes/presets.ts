import type { Theme } from "./schema";

// ── Original themes (updated with border + chart colors) ───────

export const cinematic: Theme = {
  name: "cinematic",
  colors: {
    background: "#050505",
    surface: "#161618",
    primary: "#f97316",
    secondary: "#ec4899",
    text: "#fafafa",
    textMuted: "#a1a1aa",
    border: "#27272a",
    gradient: ["#f97316", "#ec4899"],
    chart: ["#f97316", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"],
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
    border: "#e4e4e7",
    gradient: ["#18181b", "#3b82f6"],
    chart: ["#18181b", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
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
    border: "#1a1a2e",
    gradient: ["#00ff88", "#00d4ff"],
    chart: ["#00ff88", "#00d4ff", "#ff00ff", "#ffff00", "#ff6600", "#ff0066"],
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
    border: "#1e293b",
    gradient: ["#3b82f6", "#8b5cf6"],
    chart: ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"],
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

// ── OpenMontage themes ─────────────────────────────────────────

export const cleanProfessional: Theme = {
  name: "clean-professional",
  colors: {
    background: "#FFFFFF",
    surface: "#F9FAFB",
    primary: "#2563EB",
    secondary: "#F59E0B",
    text: "#1F2937",
    textMuted: "#6B7280",
    border: "#E5E7EB",
    gradient: ["#2563EB", "#F59E0B"],
    chart: ["#2563EB", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899", "#06B6D4"],
  },
  fonts: {
    heading: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  timing: {
    spring: { damping: 20, stiffness: 120, mass: 1 },
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

export const flatMotionGraphics: Theme = {
  name: "flat-motion-graphics",
  colors: {
    background: "#0F172A",
    surface: "#1E293B",
    primary: "#7C3AED",
    secondary: "#EC4899",
    text: "#F8FAFC",
    textMuted: "#94A3B8",
    border: "#334155",
    gradient: ["#7C3AED", "#EC4899"],
    chart: ["#7C3AED", "#EC4899", "#06B6D4", "#F59E0B", "#10B981", "#EF4444"],
  },
  fonts: {
    heading: "'Space Grotesk', 'Inter', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'Fira Code', monospace",
  },
  timing: {
    spring: { damping: 12, stiffness: 80, mass: 1 },
    stagger: 3,
    transitionDuration: 0.3,
  },
  effects: {
    particles: true,
    gradientBg: true,
    motionBlur: false,
    grain: 0.02,
  },
};

export const minimalistDiagram: Theme = {
  name: "minimalist-diagram",
  colors: {
    background: "#FAFAFA",
    surface: "#FFFFFF",
    primary: "#E94560",
    secondary: "#1A1A2E",
    text: "#1A1A2E",
    textMuted: "#6B7280",
    border: "#E5E7EB",
    gradient: ["#E94560", "#1A1A2E"],
    chart: ["#E94560", "#1A1A2E", "#0F3460", "#9CA3AF"],
  },
  fonts: {
    heading: "'IBM Plex Sans', sans-serif",
    body: "'IBM Plex Sans', sans-serif",
    mono: "'IBM Plex Mono', monospace",
  },
  timing: {
    spring: { damping: 25, stiffness: 150, mass: 1 },
    stagger: 4,
    transitionDuration: 0.5,
  },
  effects: {
    particles: false,
    gradientBg: false,
    motionBlur: false,
    grain: 0,
  },
};

export const animeGhibli: Theme = {
  name: "anime-ghibli",
  colors: {
    background: "#0A0A1A",
    surface: "#1A2332",
    primary: "#FFB347",
    secondary: "#2D5016",
    text: "#F0E6D3",
    textMuted: "#A8957E",
    border: "#2A3A4A",
    gradient: ["#FFB347", "#2D5016"],
    chart: ["#FFB347", "#2D5016", "#FF6B9D", "#A8E6CF", "#6B4C8A", "#E8927C"],
  },
  fonts: {
    heading: "'Noto Serif JP', 'Georgia', serif",
    body: "'Noto Sans', 'Inter', sans-serif",
    mono: "'Fira Code', monospace",
  },
  timing: {
    spring: { damping: 15, stiffness: 100, mass: 1 },
    stagger: 5,
    transitionDuration: 0.6,
  },
  effects: {
    particles: true,
    gradientBg: true,
    motionBlur: false,
    grain: 0.03,
  },
};

// ── Registry ───────────────────────────────────────────────────

export const themePresets: Record<string, Theme> = {
  cinematic,
  minimal,
  neon,
  corporate,
  "clean-professional": cleanProfessional,
  "flat-motion-graphics": flatMotionGraphics,
  "minimalist-diagram": minimalistDiagram,
  "anime-ghibli": animeGhibli,
};
