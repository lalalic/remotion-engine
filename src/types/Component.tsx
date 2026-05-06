import * as React from "react";
import { Sequence, useVideoConfig } from "remotion";
import { ComposeContext } from "../context/index";
import type { Component } from "../schema/index";

/**
 * Lite component leaf: renders a host-registered component by name.
 * Props come straight from the stream — no template literals, no JSX parsing.
 */
export function ComponentLeaf({ stream }: { stream: Component }) {
  const { fps } = useVideoConfig();
  const { components, onError } = React.useContext(ComposeContext);
  const Comp = components[stream.componentName];

  if (!Comp) {
    onError?.(new Error(`unknown component: ${stream.componentName}`), {
      id: stream.id,
      type: stream.type,
    });
    return null;
  }

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
            <Comp {...stream.props} action={a} />
          </Sequence>
        );
      })}
    </>
  );
}
