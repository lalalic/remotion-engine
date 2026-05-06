import React from "react";
import { AbsoluteFill } from "remotion";
import type { VideoJson, Aspect } from "./types";
import { Scene } from "./Scene";

interface CoverProps extends VideoJson {
    _aspect?: Aspect;
}

/**
 * Cover composition: renders the FIRST scene (Hook) as a static still.
 * Used by `npx remotion still` to produce cover-{16x9,9x16}.png.
 */
export const Cover: React.FC<CoverProps> = (props) => {
    const aspect: Aspect = props._aspect ?? "16x9";
    const firstScene = props.scenes[0];
    if (!firstScene) {
        return <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }} />;
    }
    // Force component to "Hook" for cover, regardless of scene 1 intent,
    // so the cover always reads as a punchy headline.
    const coverScene = { ...firstScene, component: "Hook" as const };
    return (
        <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
            <Scene scene={coverScene} aspect={aspect} fps={props.meta.fps} isCover />
        </AbsoluteFill>
    );
};
