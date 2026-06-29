/**
 * SceneLeaf — expands a high-level `scene` stream node into concrete leaves.
 *
 * A `scene` node is a storyboard abstraction: it declares *what* to show
 * (componentName + props) and *how long* (duration), but not the low-level
 * stream tree structure. SceneLeaf instantiates it at render time into:
 *
 *   folder(isSeries: false, actions: [{ 0 → duration }]) {
 *     component(name=componentName, props)
 *     audio(src=voiceover)           ← if voiceover is set
 *     subtitle(cues=captions)        ← if captions are set
 *   }
 *
 * This lets agents generate high-level storyboards without worrying about
 * stream tree mechanics. The parent folder's isSeries controls sequencing.
 */
import * as React from "react";
import { Sequence, useVideoConfig, useCurrentFrame, Audio } from "remotion";
import { ComposeContext, AudioContext } from "../context/index";
import { cssJS, toClassName } from "../utils/index";
import type { Scene as SceneStream } from "../schema/index";
import { ComponentLeaf } from "./Component";
import { uid } from "../utils/index";

/**
 * The SubtitleLeaf inline renderer for scene captions.
 * Renders a simple text overlay using the cue's text at the current frame.
 */
function SceneCaption({ cues, fps }: { cues: NonNullable<SceneStream["captions"]>; fps: number }) {
  const frame = useCurrentFrame();
  const t = frame / fps;
  const cue = [...cues].reverse().find((c) => c.startFrom <= t && c.endAt > t);
  if (!cue) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 0,
        right: 0,
        textAlign: "center",
        padding: "0 40px",
        color: "#fff",
        fontSize: 28,
        fontWeight: 600,
        fontFamily: "Inter, system-ui, sans-serif",
        textShadow: "0 2px 12px rgba(0,0,0,0.8)",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {cue.text}
    </div>
  );
}

export function SceneLeaf({ stream }: { stream: SceneStream }) {
  const { fps } = useVideoConfig();
  const { Container } = React.useContext(ComposeContext);
  const parentAudio = React.useContext(AudioContext);

  const durFrames = Math.max(1, Math.floor(fps * stream.duration));

  // Foreground audio context — ducks parent audio while this scene plays
  const audioCtx = React.useMemo(
    () => ({ id: stream.id, foreground: true, parent: parentAudio }),
    [stream.id, parentAudio],
  );

  return (
    <AudioContext.Provider value={audioCtx as any}>
      <Container
        id={stream.id}
        type="scene"
        style={cssJS(stream.style) as React.CSSProperties}
        className={`scene ${toClassName(stream.name ?? "")}`}
      >
        {/* Component leaf — the main visual content */}
        <ComponentLeaf
          stream={{
            id: `${stream.id}-comp`,
            type: "component" as const,
            componentName: stream.componentName,
            props: stream.props,
            visible: true,
            actions: [{ id: uid(), start: 0, end: stream.duration }],
          } as any}
        />

        {/* Voiceover audio */}
        {stream.voiceover && (
          <Sequence
            key={`${stream.id}-vo`}
            durationInFrames={durFrames}
            from={0}
            layout="none"
            showInTimeline={false}
          >
            <Audio
              src={stream.voiceover}
              volume={1}
            />
          </Sequence>
        )}

        {/* Caption overlay */}
        {stream.captions && stream.captions.length > 0 && (
          <SceneCaption cues={stream.captions} fps={fps} />
        )}
      </Container>
    </AudioContext.Provider>
  );
}
