// Text
export { AnimatedHeadline } from "./text/AnimatedHeadline";
export { TypewriterText } from "./text/TypewriterText";
export { GlitchReveal } from "./text/GlitchReveal";
export { TextCard } from "./text/TextCard";
export { CalloutBox } from "./text/CalloutBox";
export { EndTag } from "./text/EndTag";

// Media
export { DeviceMockup } from "./media/DeviceMockup";
export { CursorFlyover } from "./media/CursorFlyover";
export { ComparisonSlider } from "./media/ComparisonSlider";

// Data
export { StatCounter } from "./data/StatCounter";
export { ProgressBar } from "./data/ProgressBar";
export { BarChart } from "./data/BarChart";
export { LineChart } from "./data/LineChart";
export { PieChart } from "./data/PieChart";
export { ComparisonCard } from "./data/ComparisonCard";

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
import { TextCard } from "./text/TextCard";
import { CalloutBox } from "./text/CalloutBox";
import { EndTag } from "./text/EndTag";
import { DeviceMockup } from "./media/DeviceMockup";
import { CursorFlyover } from "./media/CursorFlyover";
import { ComparisonSlider } from "./media/ComparisonSlider";
import { StatCounter } from "./data/StatCounter";
import { ProgressBar } from "./data/ProgressBar";
import { BarChart } from "./data/BarChart";
import { LineChart } from "./data/LineChart";
import { PieChart } from "./data/PieChart";
import { ComparisonCard } from "./data/ComparisonCard";
import { GradientBackground } from "./atmosphere/GradientBackground";
import { ParticleField } from "./atmosphere/ParticleField";
import { LightLeak } from "./atmosphere/LightLeak";
import { SplitScreen } from "./layout/SplitScreen";
import { SpotlightReveal } from "./layout/SpotlightReveal";

// Rich scene components (cinematic marketing video components)
import { BigStatement } from "./scenes/BigStatement";
import { PromptTyping } from "./scenes/PromptTyping";
import { ResultFlash } from "./scenes/ResultFlash";
import { StepTimeline } from "./scenes/StepTimeline";
import { ComparisonSplit } from "./scenes/ComparisonSplit";
import { AgentGraph } from "./scenes/AgentGraph";
import { ScreenCapture } from "./scenes/ScreenCapture";
import { VideoClip } from "./scenes/VideoClip";
import { TransitionWrapper } from "./scenes/TransitionWrapper";
// Atmosphere utilities from scenes
import { GlowOrb, GridBackground, Vignette, GradientText, ScanLine, CounterAnimation } from "./scenes/Atmosphere";

export { BigStatement, PromptTyping, ResultFlash, StepTimeline, ComparisonSplit, AgentGraph, ScreenCapture, VideoClip, TransitionWrapper };
export { GlowOrb, GridBackground, Vignette, GradientText, ScanLine, CounterAnimation };

/**
 * All built-in components keyed by name.
 * Pass to RemotionEngine via `compose.components`.
 */
export const builtinComponents: Record<string, React.ComponentType<any>> = {
  AnimatedHeadline,
  TypewriterText,
  GlitchReveal,
  TextCard,
  CalloutBox,
  EndTag,
  DeviceMockup,
  CursorFlyover,
  ComparisonSlider,
  StatCounter,
  ProgressBar,
  BarChart,
  LineChart,
  PieChart,
  ComparisonCard,
  GradientBackground,
  ParticleField,
  LightLeak,
  SplitScreen,
  SpotlightReveal,
  // Rich scene components
  BigStatement,
  PromptTyping,
  ResultFlash,
  StepTimeline,
  ComparisonSplit,
  AgentGraph,
  ScreenCapture,
  VideoClip,
  TransitionWrapper,
  // Atmosphere utilities
  GlowOrb,
  GridBackground,
  Vignette,
  GradientText,
  ScanLine,
  CounterAnimation,
};
