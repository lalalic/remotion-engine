import { z } from "zod";
import { uid } from "../utils/index";

/**
 * Lite stream schema.
 * Render-only — no prompts, no async transforms, no providers.
 *
 * A stream tree is rooted at `root`. Folders contain children.
 * Leaf streams (video/audio/image/subtitle/component) have actions[]
 * describing when they appear on the timeline.
 */

export const action = z.object({
  id: z.string().default(() => uid()),
  start: z.number().min(0).default(0).describe("seconds, relative to parent"),
  end: z.number().min(0).default(1).describe("seconds, relative to parent"),
  startFrom: z.number().optional().describe("trim seconds from source start"),
  endAt: z.number().optional().describe("trim seconds at source end"),
  loop: z.number().int().min(1).optional().describe(">1 = loop count"),
  effectId: z.string().optional(),
  style: z.string().optional().describe("inline css"),
  volume: z.number().min(0).max(1).optional(),
});
export type Action = z.infer<typeof action>;

const BaseShape = {
  id: z.string().default(() => uid()),
  name: z.string().optional(),
  title: z.string().optional(),
  src: z.string().optional(),
  style: z.string().optional().describe("inline css"),
  visible: z.boolean().default(true),
  isBackground: z.boolean().optional(),
  durationInSeconds: z.number().optional().describe("set by engine; do not edit by hand"),
};

export const base = z.object(BaseShape);

export const folder = base.extend({
  type: z.literal("folder").default("folder"),
  isSeries: z.boolean().optional(),
  transition: z.enum(["fade", "slide", "wipe", "flip", "clockWipe"]).optional(),
  transitionTime: z.number().min(0.1).max(5).default(0.5),
  shadow: z.number().min(0).optional(),
  children: z.array(z.lazy((): z.ZodTypeAny => stream)).default(() => []),
});
export type Folder = z.infer<typeof folder>;

export const root = folder.extend({
  id: z.literal("root").default("root"),
  type: z.literal("root").default("root"),
  width: z.number().int().positive().default(1080),
  height: z.number().int().positive().default(1920),
  fps: z.number().int().positive().default(30),
  description: z.string().optional(),
  metadata: z.string().optional(),
  stylesheet: z.string().optional().describe("global css; selectors use .type and .name"),
});
export type Root = z.infer<typeof root>;

export const video = base.extend({
  type: z.literal("video").default("video"),
  src: z.string().optional(),
  volume: z.number().min(0).max(1).default(1),
  playbackRate: z.number().optional(),
  width: z.number().default(1080),
  height: z.number().default(1920),
  actions: z.array(action).min(1).default(() => [action.parse({})]),
});
export type Video = z.infer<typeof video>;

export const audio = base.extend({
  type: z.literal("audio").default("audio"),
  src: z.string().optional(),
  volume: z.number().min(0).max(1).default(1),
  foreground: z.boolean().optional().describe("ducks parent video audio while playing"),
  actions: z.array(action).min(1).default(() => [action.parse({})]),
});
export type Audio = z.infer<typeof audio>;

export const image = base.extend({
  type: z.literal("image").default("image"),
  src: z.string().optional(),
  fit: z.enum(["contain", "cover", "fill"]).default("contain"),
  actions: z.array(action).min(1).default(() => [action.parse({})]),
});
export type Image = z.infer<typeof image>;

export const subtitleWord = z.object({
  text: z.string(),
  start: z.number().min(0),
  end: z.number().min(0),
});
export type SubtitleWord = z.infer<typeof subtitleWord>;

export const subtitleCue = z.object({
  startFrom: z.number().min(0),
  endAt: z.number().min(0),
  text: z.string(),
  className: z.string().optional(),
  words: z.array(subtitleWord).optional(),
});
export type SubtitleCue = z.infer<typeof subtitleCue>;

export const subtitle = base.extend({
  type: z.literal("subtitle").default("subtitle"),
  src: z.string().optional().describe("inline text or VTT url"),
  cues: z.array(subtitleCue).optional(),
  fontSize: z.union([z.number(), z.string()]).optional(),
  fontStyle: z.string().optional(),
  captionType: z.string().optional(),
  actions: z.array(action).min(1).default(() => [action.parse({})]),
});
export type Subtitle = z.infer<typeof subtitle>;

/**
 * Lite component: references a host-registered React component by `name`.
 * Props are JSON-serializable. No JSX parsing, no eval.
 *
 * Full bundle adds a `jsx` field with react-jsx-parser, kept opt-in.
 */
export const component = base.extend({
  type: z.literal("component").default("component"),
  componentName: z.string().describe("key in <ComposeProvider components={...}>"),
  props: z.record(z.string(), z.unknown()).default(() => ({})),
  actions: z.array(action).min(1).default(() => [action.parse({})]),
});
export type Component = z.infer<typeof component>;

export const stream = z.discriminatedUnion("type", [
  root,
  folder,
  video,
  audio,
  image,
  subtitle,
  component,
]);
export type Stream = z.infer<typeof stream>;

export const types = { root, folder, video, audio, image, subtitle, component } as const;
