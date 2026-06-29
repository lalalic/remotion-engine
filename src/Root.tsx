import { Composition, getInputProps } from "remotion";
import { RemotionEngine } from "./lite.entry";
import { builtinComponents } from "./components";
import { resolveTheme } from "./themes";
import { getDurationInSeconds } from "./utils";
import { root as rootSchema } from "./schema";
import sample from "./sample.json" with { type: "json" };

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
      {/* Stream-tree composition (handles all rendering including scene nodes) */}
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
    </>
  );
};
