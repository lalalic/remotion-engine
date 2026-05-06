import { z } from "zod";

export const springConfig = z.object({
  damping: z.number().default(12),
  stiffness: z.number().default(180),
  mass: z.number().default(0.8),
});

export const themeSchema = z.object({
  name: z.string(),
  colors: z.object({
    background: z.string().default("#050505"),
    surface: z.string().default("#161618"),
    primary: z.string().default("#f97316"),
    secondary: z.string().default("#ec4899"),
    text: z.string().default("#fafafa"),
    textMuted: z.string().default("#a1a1aa"),
    gradient: z.tuple([z.string(), z.string()]).default(["#f97316", "#ec4899"]),
  }),
  fonts: z.object({
    heading: z.string().default("'SF Pro Display', 'Inter', sans-serif"),
    body: z.string().default("'SF Pro Text', 'Inter', sans-serif"),
    mono: z.string().default("'SF Mono', 'JetBrains Mono', monospace"),
  }),
  timing: z.object({
    spring: springConfig.default({}),
    stagger: z.number().default(4),
    transitionDuration: z.number().default(0.5),
  }),
  effects: z.object({
    particles: z.boolean().default(false),
    gradientBg: z.boolean().default(true),
    motionBlur: z.boolean().default(false),
    grain: z.number().min(0).max(1).default(0),
  }),
});

export type Theme = z.infer<typeof themeSchema>;
export type SpringConfig = z.infer<typeof springConfig>;
