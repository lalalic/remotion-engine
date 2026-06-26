# @neox/remotion-engine

Render-only Remotion engine. Stream-typed timeline kernel.

Two distribution targets:

| Bundle | Entry | Stream types | Target |
| --- | --- | --- | --- |
| **lite** | `src/lite.entry.tsx` | `root`, `folder`, `video`, `audio`, `image`, `subtitle`, `component` (host-registered only) | iOS WKWebView |
| **full** | `src/full.entry.tsx` | lite + `effect`, `rhythm`, `map`, built-in components, themes, templates | Desktop rendering |

The engine is **render-only**:

- No `prompts.*` fields on streams. Host pushes pure media URLs / cues / props.
- No `compose/` providers. Host provides a `Container` component + a `components` registry via React context.
- No `eval/`, `chatflow/`. Stream tree is a pure data structure validated by Zod.
- Mutations are immer JSON Patches pushed from the host.

## Layout

```
src/
  schema/        Zod schemas for streams
  types/         React renderers (one per stream type)
  context/       Compose + Audio React contexts
  utils/         Pure helpers (duration math, css<->js, vtt parser, hash, walkDown/Up)
  lite.entry.tsx Lite Remotion <Composition>
  full.entry.tsx Full Remotion <Composition>
  sample.json    Sample stream tree for headless render smoke test
  remotion.config.ts Remotion Root component
```

## Smoke test

```bash
cd remotion-engine
pnpm install
pnpm render          # renders sample.json -> out/preview.mp4
```
