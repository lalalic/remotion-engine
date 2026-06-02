import * as React from "react";
import { Sequence, useVideoConfig } from "remotion";
import { ComposeContext } from "../context/index";
import { useDynamicComponent } from "./DynamicLoader";
import type { Component } from "../schema/index";

/**
 * Component leaf: renders a host-registered component by name,
 * or a remote component loaded from `src` URL.
 */
export function ComponentLeaf({ stream }: { stream: Component }) {
  const { fps } = useVideoConfig();
  const { components, onError } = React.useContext(ComposeContext);

  // Remote component (loaded from URL)
  const RemoteComp = useDynamicComponent(
    stream.src,
    onError ? (err, ctx) => onError(err, { id: stream.id, type: stream.type }) : undefined,
  );

  // Registry component (by name)
  const RegistryComp = components[stream.componentName];

  // Prefer remote if src is set, else fall back to registry
  const Comp = stream.src ? RemoteComp : RegistryComp;

  if (!Comp) {
    if (!stream.src) {
      onError?.(new Error(`unknown component: ${stream.componentName}`), {
        id: stream.id,
        type: stream.type,
      });
    }
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
