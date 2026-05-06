// Scene-based rendering pipeline for repo-marketing videos.
// Uses video.json schema with scenes[] array, each dispatched to a
// rich component or classic layout by Scene.tsx.

export { Main } from "./Main";
export { Cover } from "./Cover";
export { Scene } from "./Scene";
export { Caption } from "./Caption";
export type { VideoJson, Scene as SceneT, Aspect, ComponentName, CaptionStyle, BgmIntensity, Transition } from "./types";
export { ASPECT_DIMS, BGM_VOLUME } from "./types";
export { COLORS, FONTS } from "./design";

// Re-export all rich components + atmosphere utilities
export {
  BigStatement,
  PromptTyping,
  ResultFlash,
  StepTimeline,
  ComparisonSplit,
  AgentGraph,
  ScreenCapture,
  VideoClip,
  TransitionWrapper,
  GlowOrb,
  GridBackground,
  Vignette,
  GradientText,
  ParticleField,
  ScanLine,
  CounterAnimation,
} from "./components";
