// Text
export { AnimatedHeadline } from "./text/AnimatedHeadline";
export { TypewriterText } from "./text/TypewriterText";
export { GlitchReveal } from "./text/GlitchReveal";

// Media
export { DeviceMockup } from "./media/DeviceMockup";
export { CursorFlyover } from "./media/CursorFlyover";
export { ComparisonSlider } from "./media/ComparisonSlider";

// Data
export { StatCounter } from "./data/StatCounter";
export { ProgressBar } from "./data/ProgressBar";

// Atmosphere
export { GradientBackground } from "./atmosphere/GradientBackground";
export { ParticleField } from "./atmosphere/ParticleField";
export { LightLeak } from "./atmosphere/LightLeak";

// Layout
export { SplitScreen } from "./layout/SplitScreen";
export { SpotlightReveal } from "./layout/SpotlightReveal";

import type React from "react";
import { AnimatedHeadline } from "./text/AnimatedHeadline";
import { TypewriterText } from "./text/TypewriterText";
import { GlitchReveal } from "./text/GlitchReveal";
import { DeviceMockup } from "./media/DeviceMockup";
import { CursorFlyover } from "./media/CursorFlyover";
import { ComparisonSlider } from "./media/ComparisonSlider";
import { StatCounter } from "./data/StatCounter";
import { ProgressBar } from "./data/ProgressBar";
import { GradientBackground } from "./atmosphere/GradientBackground";
import { ParticleField } from "./atmosphere/ParticleField";
import { LightLeak } from "./atmosphere/LightLeak";
import { SplitScreen } from "./layout/SplitScreen";
import { SpotlightReveal } from "./layout/SpotlightReveal";

/**
 * All built-in components keyed by name.
 * Pass to RemotionEngine via `compose.components`.
 */
export const builtinComponents: Record<string, React.ComponentType<any>> = {
  AnimatedHeadline,
  TypewriterText,
  GlitchReveal,
  DeviceMockup,
  CursorFlyover,
  ComparisonSlider,
  StatCounter,
  ProgressBar,
  GradientBackground,
  ParticleField,
  LightLeak,
  SplitScreen,
  SpotlightReveal,
};
