import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import type { VideoJson, Aspect, Scene as SceneT } from "./types";
import { BGM_VOLUME } from "./types";
import { Scene } from "./Scene";
import { TransitionWrapper } from "./components/TransitionWrapper";

interface MainProps extends VideoJson {
    _aspect?: Aspect;
}

/**
 * Asset path resolution.
 *
 * The render script invokes Remotion with `--public-dir=<repo>/.market`,
 * so all relative asset paths in video.json are resolved against the
 * repo's `.market/` directory via `staticFile()`. Examples:
 *   "videos/01-foo/out/vo-scene-1.wav"  → <repo>/.market/videos/01-foo/out/vo-scene-1.wav
 *   "assets/bgm.mp3"                    → <repo>/.market/assets/bgm.mp3
 *
 * Absolute http(s) URLs and absolute file paths pass through unchanged.
 */
const resolveAsset = (rel: string | null | undefined): string | undefined => {
    if (!rel) return undefined;
    if (/^https?:\/\//.test(rel)) return rel;
    if (rel.startsWith("/")) return rel;
    return staticFile(rel);
};

export const Main: React.FC<MainProps> = (props) => {
    const aspect: Aspect = props._aspect ?? "16x9";
    const fps = props.meta.fps;

    return (
        <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
            {/* Background music */}
            {props.bgm && (
                <Audio
                    src={resolveAsset(props.bgm.src)!}
                    volume={props.bgm.baseVolume}
                />
            )}

            {/* Per-scene content + voiceover */}
            {props.scenes.map((scene) => {
                const startFrame = Math.round(scene.start * fps);
                const durFrames = Math.round(scene.duration * fps);
                const sceneVolume =
                    BGM_VOLUME[scene.bgmIntensity ?? "low"];
                return (
                    <Sequence
                        key={scene.id}
                        from={startFrame}
                        durationInFrames={durFrames}
                        name={`${scene.id}:${scene.component}`}
                    >
                        <TransitionWrapper
                            transitionIn={scene.transitionIn}
                            transitionOut={scene.transitionOut}
                            durationFrames={durFrames}
                        >
                            <Scene scene={scene} aspect={aspect} fps={fps} />
                        </TransitionWrapper>
                        {scene.voiceover?.audio && (
                            <Audio
                                src={resolveAsset(scene.voiceover.audio)!}
                                volume={1}
                            />
                        )}
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};
