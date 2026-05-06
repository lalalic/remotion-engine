import * as React from "react";
import { Sequence, Img, useVideoConfig } from "remotion";
import { cssJS } from "../utils/index";
import type { Image } from "../schema/index";

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
            <Img
              src={stream.src!}
              className={stream.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: stream.fit,
                ...cssJS(a.style),
              }}
              onDragStart={(e) => {
                e.stopPropagation();
                return false;
              }}
            />
          </Sequence>
        );
      })}
    </>
  );
}
