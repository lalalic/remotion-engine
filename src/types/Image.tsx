import * as React from "react";
import { Sequence, Img, useVideoConfig, useCurrentFrame } from "remotion";
import { cssJS } from "../utils/index";
import type { Image } from "../schema/index";
import { FrameSyncStyle } from "./FrameSyncStyle";

export function ImageLeaf({ stream }: { stream: Image }) {
  const { fps } = useVideoConfig();
  if (!stream.src) return null;

  return (
    <>
      {stream.actions.map((a) => {
        const start = a.start ?? 0;
        const end = a.end ?? start + 1;
        return (
          <Sequence
            key={a.id}
            durationInFrames={Math.max(1, Math.floor(fps * (end - start)))}
            from={Math.floor(fps * start)}
            layout="none"
          >
            <FrameSyncStyle style={cssJS(a.style)}>
              <Img
                src={stream.src!}
                className={stream.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: stream.fit,
                }}
                onDragStart={(e) => {
                  e.stopPropagation();
                  return false;
                }}
              />
            </FrameSyncStyle>
          </Sequence>
        );
      })}
    </>
  );
}
