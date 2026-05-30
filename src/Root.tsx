import { Composition, getInputProps } from "remotion";
import { RemotionEngine } from "./lite.entry";
import { builtinComponents } from "./components";
import { resolveTheme } from "./themes";
import { getDurationInSeconds } from "./utils";
import { root as rootSchema } from "./schema";
import sample from "./sample.json" with { type: "json" };
import { Main } from "./scenes/Main";
import { Cover } from "./scenes/Cover";
import { ASPECT_DIMS, type VideoJson } from "./scenes/types";

// React components are NOT JSON-serializable, so the components registry
// cannot live inside `defaultProps`. Wrap RemotionEngine with a tiny
// component that injects `builtinComponents` at render time.
const RootComposition = (props: any) => (
  <RemotionEngine
    {...props}
    compose={{
      ...(props.compose ?? {}),
      components: { ...builtinComponents, ...(props.compose?.components ?? {}) },
    }}
  />
);

// Default props for scene-based compositions (studio preview)
const SCENE_DEFAULT_PROPS: VideoJson = {
  meta: { title: "Untitled", fps: 30, aspects: ["16x9", "9x16", "1x1"], duration: 5 },
  voiceover: { tts: "edge-tts", voice: "en-US-AriaNeural" },
  scenes: [{
    id: "scene-1", start: 0, duration: 5, component: "Hook",
    props: { headline: "Preview" },
    voiceover: { audio: "out/vo-scene-1.wav" },
    captions: [{ t: 0, text: "Preview caption" }],
  }],
};

const calcSceneDuration = (vj: VideoJson) =>
  Math.max(1, Math.ceil((vj.meta.duration ?? vj.scenes.reduce((s, sc) => s + sc.duration, 0)) * vj.meta.fps));

export const RemotionRoot: React.FC = () => {
  const props = getInputProps() as { root?: unknown };
  const data = (props.root ?? sample) as any;

  const parsed = rootSchema.parse(data);
  const fps = parsed.fps;
  const width = parsed.width;
  const height = parsed.height;
  const durationInSeconds = getDurationInSeconds(parsed as any, true) || 1;
  const durationInFrames = Math.max(1, Math.ceil(durationInSeconds * fps));

  const theme = resolveTheme((data as any).theme);

  return (
    <>
      {/* Stream-tree composition */}
      <Composition
        id="Root"
        component={RootComposition as any}
        durationInFrames={durationInFrames}
        fps={fps}
        width={width}
        height={height}
        defaultProps={{
          root: data,
          theme,
        } as any}
      />

      {/* Scene-based compositions (repo-marketing video.json) */}
      {(["16x9", "9x16", "1x1"] as const).map((aspect) => {
        const { width: w, height: h } = ASPECT_DIMS[aspect];
        return (
          <Composition
            key={`Main${aspect}`}
            id={`Main${aspect}`}
            component={Main as any}
            defaultProps={{ ...SCENE_DEFAULT_PROPS, _aspect: aspect } as any}
            durationInFrames={calcSceneDuration(SCENE_DEFAULT_PROPS)}
            fps={SCENE_DEFAULT_PROPS.meta.fps}
            width={w}
            height={h}
            calculateMetadata={({ props: p }) => {
              const vj = p as unknown as VideoJson;
              return { durationInFrames: calcSceneDuration(vj), fps: vj.meta.fps };
            }}
          />
        );
      })}
      {(["16x9", "9x16"] as const).map((aspect) => {
        const { width: w, height: h } = ASPECT_DIMS[aspect];
        return (
          <Composition
            key={`Cover${aspect}`}
            id={`Cover${aspect}`}
            component={Cover as any}
            defaultProps={{ ...SCENE_DEFAULT_PROPS, _aspect: aspect } as any}
            durationInFrames={1}
            fps={SCENE_DEFAULT_PROPS.meta.fps}
            width={w}
            height={h}
          />
        );
      })}
    </>
  );
};
