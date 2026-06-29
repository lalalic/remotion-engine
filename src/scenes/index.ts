// Scenes module — legacy types preserved for backward compatibility.
// The scene pipeline has been replaced by the stream tree `scene` type.
// Rich scene components are now in src/components/scenes/ and registered
// in builtinComponents.

export type { VideoJson, Scene as SceneT, Aspect, ComponentName, CaptionStyle, BgmIntensity, Transition } from "./types";
export { ASPECT_DIMS, BGM_VOLUME } from "./types";
