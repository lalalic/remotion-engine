import * as React from "react";
import { Sequence, OffthreadVideo, useVideoConfig } from "remotion";
import { ComposeContext, AudioContext } from "../context/index";
import { toPlaybackRate, cssJS } from "../utils/index";
import type { Video } from "../schema/index";

export function VideoLeaf({ stream }: { stream: Video }) {
  const { fps } = useVideoConfig();
  const audio = React.useContext(AudioContext);
  if (!stream.src) return null;

  return (
    <>
      {stream.actions.map((a) => {
        const start = a.start ?? 0;
        const end = a.end ?? start + 1;
        const startFrom = a.startFrom ?? 0;
        const endAt = a.endAt ?? stream.durationInSeconds ?? end - start;
        const volume = a.volume ?? stream.volume ?? 1;
        const playbackRate = a.loop ? 1 : toPlaybackRate((endAt - startFrom) / (end - start));
        return (
          <Sequence
            key={a.id}
            durationInFrames={Math.max(1, Math.floor(fps * (end - start)))}
            from={Math.floor(fps * start)}
            layout="none"
          >
            <OffthreadVideo
              src={stream.src!}
              className={stream.name}
              startFrom={Math.floor(startFrom * fps)}
              endAt={Math.floor(startFrom * fps) + Math.floor(((endAt - startFrom) * fps) / playbackRate)}
              muted={volume === 0 || !!audio?.foreground}
              volume={volume}
              playbackRate={playbackRate}
              style={{ width: "100%", height: "100%", ...cssJS(a.style) }}
            />
          </Sequence>
        );
      })}
    </>
  );
}
