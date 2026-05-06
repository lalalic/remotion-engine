import * as React from "react";
import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { cssJS } from "../utils/index";
import type { Subtitle, SubtitleCue } from "../schema/index";

/**
 * Lite subtitle: renders one cue at a time via an absolute-positioned div.
 * Caption animation is just classNames driven by `cue.className`/`stream.name`.
 * The host can theme via root.stylesheet.
 */
export function SubtitleLeaf({ stream }: { stream: Subtitle }) {
  const { fps } = useVideoConfig();
  const currentInSecond = useCurrentFrame() / fps;
  const start = stream.actions[0]?.start ?? 0;
  const end = stream.actions[0]?.end ?? start + 1;

  const cue: (SubtitleCue & { className?: string }) | undefined = React.useMemo(() => {
    if (stream.cues?.length) {
      return stream.cues.find(
        (c) => c.startFrom + start <= currentInSecond && c.endAt + start > currentInSecond,
      );
    }
    if (stream.src) {
      return {
        text: stream.src,
        startFrom: 0,
        endAt: end - start,
        className: stream.actions[0]?.effectId,
      };
    }
    return undefined;
  }, [currentInSecond, stream, start, end]);

  if (!cue) return null;

  const css = stream.style ? (cssJS(stream.style) as React.CSSProperties) : {};

  // Word-level karaoke rendering: if cue has explicit `words` (per-word timing)
  // OR the className includes "karaoke" (auto-derive from text + cue duration),
  // render each word as a span and apply `.word-active` to the currently spoken
  // word. Time is relative to cue start.
  const cueLocalT = currentInSecond - start - cue.startFrom;
  const wantsKaraoke = (cue.className ?? "").includes("karaoke") || (cue.words?.length ?? 0) > 0;
  let wordEls: React.ReactNode | null = null;
  if (wantsKaraoke) {
    const explicit = cue.words ?? [];
    const tokens = explicit.length
      ? explicit
      : (() => {
          const parts = cue.text.split(/\s+/).filter(Boolean);
          const dur = Math.max(0.001, cue.endAt - cue.startFrom);
          const each = dur / Math.max(1, parts.length);
          return parts.map((t, i) => ({ text: t, start: i * each, end: (i + 1) * each }));
        })();
    wordEls = tokens.map((w, i) => {
      const active = cueLocalT >= w.start && cueLocalT < w.end;
      return (
        <span key={i} className={active ? "word word-active" : "word"}>
          {w.text}
          {i < tokens.length - 1 ? " " : ""}
        </span>
      );
    });
  }

  return (
    <Sequence
      layout="none"
      durationInFrames={Math.max(1, Math.floor((cue.endAt - cue.startFrom) * fps))}
      from={Math.floor(start * fps) + Math.floor(cue.startFrom * fps)}
    >
      <div className={`caption ${cue.className ?? ""} ${stream.name ?? ""}`}>
        {wordEls ? (
          <span style={{ fontSize: stream.fontSize, fontStyle: stream.fontStyle, ...css }}>
            {wordEls}
          </span>
        ) : (
          <span
            style={{ fontSize: stream.fontSize, fontStyle: stream.fontStyle, ...css }}
            dangerouslySetInnerHTML={{ __html: cue.text }}
          />
        )}
      </div>
    </Sequence>
  );
}
