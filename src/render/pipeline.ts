/**
 * Rendering pipeline for the Remotion engine.
 * Handles template resolution, aspect ratio adaptation, and rendering.
 */

export const ASPECTS = {
  "16x9": { width: 1920, height: 1080 },
  "9x16": { width: 1080, height: 1920 },
  "1x1": { width: 1080, height: 1080 },
} as const;

export type AspectKey = keyof typeof ASPECTS;

/**
 * Adapt a stream tree's root dimensions for a given aspect ratio.
 */
export function adaptAspect(streamTree: Record<string, unknown>, aspect: AspectKey): Record<string, unknown> {
  const dims = ASPECTS[aspect];
  return {
    ...streamTree,
    width: dims.width,
    height: dims.height,
  };
}
