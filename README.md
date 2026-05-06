# @neox/remotion-engine

Render-only Remotion engine. Extracted from `qili-ai/www/src/views/studio/remotion/`, with the AI/prompt layer removed.

Two distribution targets:

| Bundle | Entry | Stream types | Target |
| --- | --- | --- | --- |
| **lite** | `src/lite.entry.tsx` | `root`, `folder`, `video`, `audio`, `image`, `subtitle`, `component` (host-registered only) | Intento iOS WKWebView |
| **full** | `src/full.entry.tsx` | lite + `gif`, `lottie`, `rive`, `map`, `slides`, `doc`, `rhythm`, `effect`, JSX-parsed components | Desktop Marketing/Demo skills |

The engine is **render-only**:

- No `prompts.*` fields on streams. AI generation happens host-side; the host pushes pure media URLs / cues / props.
- No `compose/` providers. The host provides a `Container` component + a `components` registry via React context.
- No `eval/`, `chatflow/`, `PromptDebugger/`. Stream tree is a pure data structure validated by Zod.
- Mutations are immer JSON Patches pushed from the host (`apply_patches`).

## Layout

```
src/
  schema/        Zod schemas for streams (root/folder/video/audio/image/subtitle/component)
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
