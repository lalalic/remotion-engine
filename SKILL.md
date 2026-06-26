---
name: remotion-engine
description: >-
  Render-only Remotion engine. CLI takes a stream tree JSON (or template+data),
  renders to MP4, or previews with labeling/chat.
---

## Quickstart

```bash
git clone <repo>
cd remotion-engine
npm install

# Render sample → out/preview.mp4
npm run render

# Preview
npm run preview -- sample.json

# Preview with labels (interactive scene labeling)
npm run preview -- sample.json --label

# Preview with chat (agent-assisted editing)
npm run preview -- sample.json --chat
```

## Stream Tree JSON — The Input

Everything starts from a **stream tree JSON** — a nested tree of typed nodes. Each leaf has `actions[]` defining when it appears on the timeline.

Minimal example (`sample.json`):

```json
{
  "id": "root",
  "type": "root",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "isSeries": true,
  "transition": "fade",
  "transitionTime": 0.4,
  "children": [
    {
      "id": "scene-1",
      "type": "folder",
      "children": [
        { "id": "bg", "type": "image", "src": "https://...", "fit": "cover",
          "actions": [{ "start": 0, "end": 3 }] },
        { "id": "title", "type": "subtitle", "src": "Hello",
          "actions": [{ "start": 0, "end": 3 }] }
      ]
    }
  ]
}
```

**10 stream types**: `root`, `folder`, `video`, `audio`, `image`, `subtitle`, `component`, `effect`, `rhythm`, `map`.

**Composition logic**:
- **Series** (`isSeries: true`) — children play one after another, with optional transition (`fade`, `slide`, `wipe`, `flip`, `clockWipe`)
- **Parallel** (`isSeries: false` / unset) — children play simultaneously, max duration wins
- **Background** (`isBackground: true`) — child loops for parent's full duration, excluded from duration calc

**Actions** control timing per leaf:
```json
"actions": [{ "start": 0, "end": 6, "volume": 0.8 }]
```
Fields: `start`, `end` (seconds), `startFrom`/`endAt` (trim source), `loop`, `effectId`, `style` (inline CSS), `volume`.

---

## CLI Usage

```
node src/render/cli.mjs <command> [options]
```

Can also use npm scripts:
```
npm run render [-- <args>]
npm run preview [-- <args>]
npm run templates
```

### Commands

| Command | Description |
|---------|-------------|
| `render <file.json>` | Render a stream tree JSON to MP4 |
| `render --template <id> --data <data.json>` | Resolve a template with data, then render |
| `templates` | List all available templates |
| `preview <file.json>` | Open Remotion Studio for visual debugging |
| `preview <file.json> --label` | Custom player: interactive scene labeling |
| `preview <file.json> --chat` | Custom player: chat panel for agent interaction |

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--aspect` | `16x9` / `9x16` / `1x1` / `all` | `16x9` | Output aspect ratio |
| `--output` | path | `out/video-{aspect}.mp4` | Output file |
| `--template` | string | — | Template ID (see `npm run templates`) |
| `--data` | path | — | JSON data file for template slots |
| `--verbose` | boolean | `false` | Show every progress frame (default: compact, every 50th) |
| `--force-new` | boolean | `false` | Force new Studio instance |
| `--label` | boolean | `false` | Player mode: scene labeling |
| `--chat` | boolean | `false` | Player mode: chat panel |
| `--port` | number | `3001` | Player server port |

---

## Preview Modes (prefer --label / --chat over studio)

### remotion studio (raw preview)

```bash
npm run preview -- my-video.json
```

Opens Remotion Studio at `localhost:3000`. Hot-reloads on JSON changes. Good for visual debugging of stream trees.

### --label: Interactive Scene Labeling

```bash
npm run preview -- scenes.json --label
npm run preview -- scenes.json --label --port 3001
```

Custom player with:

- **Scene-by-scene playback** — plays each scene's media file directly (image or video), not a single rendered MP4
- **Label input** — type a label, press Enter; it snapshots the current timestamp + scene metadata
- **Thumbnail bar** — click any scene thumbnail to jump to it
- **Auto-save** — labels persist to `labels.json` next to the source JSON

Each saved label records:

```json
{
  "time": 3.5,
  "sceneIndex": 1,
  "sceneName": "demo-scene",
  "src": "vlog/photo_1_9x16.jpg",
  "mediaType": "image",
  "label": "good lighting, keep this shot"
}
```

### --chat: Agent Notification Panel

```bash
npm run preview -- my-video.json --chat
npm run preview -- my-video.json --chat --port 3001
```

Custom player with a **360px chat sidebar**. The agent is a **separate process** — it edits the stream tree JSON file directly, then uses the chat to tell the user to reload.

**Workflow**:

```
User's browser              Player Server           Agent (separate process)
    │                            │                        │
    │── types feedback ───────► POST /api/chat/send ────► │ (agent receives via SSE)
    │                            │                        │
    │                            │                        ├── edits sample-subtitle.json
    │                            │                        │   (change timing, props, etc.)
    │                            │                        │
    │◄── SSE "Reload to see ─────┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄◄──── POST /api/chat/send
    │     new timing"            │                        │    {"text":"done, reload"}
    │                            │                        │
    │── reload browser ───────► serves updated JSON ──►  │
```

**Key insight**: the agent edits the file, the player just reloads. Chat is purely for notifications — the agent tells you "done, reload" and you refresh the page to see the updated stream tree.

Wire up from another terminal:

```bash
# Agent notifies user after editing the JSON
curl -X POST http://localhost:3001/api/chat/send \
  -H 'Content-Type: application/json' \
  -d '{"text":"Agent: adjusted scene 2 subtitle color to orange, reload to see"}'
```

### Player API Endpoints

| Endpoint | Method | What it returns/accepts |
|----------|--------|------------------------|
| `/api/video-data` | GET | Raw video.json |
| `/api/scenes` | GET | Scene array: `[{name, start, end, duration, src, mediaType}]` |
| `/api/video-info` | GET | Scene info + mode flags |
| `/api/labels` | GET | Saved labels array |
| `/api/labels` | POST | Save labels `{labels, scenes}` |
| `/api/chat/events` | GET | SSE stream for agent messages |
| `/api/chat/send` | POST | Broadcast a message `{text, time}` to all SSE clients |

---

## Rendering

### From a stream tree JSON

```bash
# Default 16:9 portrait (1080×1920)
npm run render -- my-video.json

# Specific aspect
npm run render -- my-video.json --aspect 9x16

# All aspects at once
npm run render -- my-video.json --aspect all

# Custom output path (single aspect only)
npm run render -- my-video.json --aspect 16x9 --output out/final.mp4
```

### From a template

```bash
# data.json provides values for template slots
npm run render -- --template product-hero --data data.json

# Combine with aspect flags
npm run render -- --template product-hero --data data.json --aspect all
```

### List templates

```bash
npm run templates
```

### Pipeline (automated)

1. **Parse** — Zod-validate stream tree / resolve template slots
2. **Theme** — Apply theme preset (`cinematic`, `minimal`, `neon`, or `corporate`)
3. **Duration** — Walk tree: series sums children (minus transition overlap), parallel takes max
4. **Render** — Remotion `renderMedia()` per aspect ratio
5. **Output** — MP4s to `out/` directory

Progress is compact by default (one line per 50 frames). Use `--verbose` for per-frame output.

---

## Templates (15 pre-built)

Templates are stream trees with `${slot.name}` placeholders. Pass data to fill them.

### Categories

| Category | Templates |
|----------|-----------|
| Marketing | `product-hero`, `feature-showcase`, `before-after`, `social-clip`, `cinematic-intro` |
| Demo | `demo-walkthrough` |
| Social | `announcement`, `glow-up`, `quote-card`, `roast-list`, `stat-reveal`, `top5-countdown`, `year-recap`, `beat-drop` |
| Presentation | `journey-map` |

### Example: product-hero slots

```bash
cat data.json
{
  "headline": "Ship faster",
  "subline": "One tool, zero friction",
  "screenshot": "https://example.com/shot.png",
  "cta": "Get started"
}

npm run render -- --template product-hero --data data.json --aspect all
```

Each template declares its slots with name, type (text/image/video/number/color/boolean), defaults, and required flags. Missing required slots produce validation errors.

### Template source files

```
src/templates/marketing/product-hero.json
src/templates/social/announcement.json
...
```

---

## Themes (4 presets)

Set via the `theme` field at root level.

| Preset | Vibe | Background |
|--------|------|------------|
| `cinematic` | Dark, warm, orange/pink accents | `#050505` |
| `minimal` | Clean white, black/blue | `#ffffff` |
| `neon` | Electric green/cyan on dark | `#0a0a0a` |
| `corporate` | Professional navy/gold | `#0f172a` |

```json
{ "id": "root", "theme": "neon", "children": [...] }
```

Can also pass an inline JSON string or a partial theme object. Default is `cinematic`.

---

## Built-in Components (13)

Referenced by `componentName` in a `component` type node.

| componentName | Description |
|--------------|-------------|
| `AnimatedHeadline` | Word-by-word kinetic typography with blur+scale stagger |
| `TypewriterText` | Typing simulation |
| `GlitchReveal` | Glitch-in text effect |
| `DeviceMockup` | Browser/phone frame around a screenshot |
| `CursorFlyover` | Animated cursor over screenshot with annotations |
| `ComparisonSlider` | Before/after image comparison |
| `StatCounter` | Animated number counter |
| `ProgressBar` | Animated progress bar |
| `GradientBackground` | Animated gradient background (linear, radial, conic) |
| `ParticleField` | Particle system background |
| `LightLeak` | Cinematic light leak overlay |
| `SplitScreen` | Side-by-side layout |
| `SpotlightReveal` | Circular light reveal |

Usage:

```json
{
  "id": "headline", "type": "component",
  "componentName": "AnimatedHeadline",
  "props": { "text": "Hello World", "gradient": true },
  "actions": [{ "start": 0, "end": 6 }]
}
```

---

## Editing Knowledge

### Styling Captions (HTML + CSS)

Subtitles support three text input methods and rich CSS styling.

**1. Inline text** — set `src` to plain text (no VTT markers):

```json
{
  "id": "my-caption",
  "type": "subtitle",
  "src": "Hello World",
  "style": "color: #ff6b35; font-size: 64px; font-weight: 900; letter-spacing: 2px; text-shadow: 0 0 20px rgba(255,107,53,0.5);",
  "fontSize": 72,
  "actions": [{ "start": 0, "end": 3 }]
}
```

Supports `dangerouslySetInnerHTML` — you can use inline HTML in `src`:

```json
{
  "id": "html-caption",
  "type": "subtitle",
  "src": "Built with <span style=\"color:#00ff88\">&lt;3</span>",
  "actions": [{ "start": 0, "end": 3 }]
}
```

**2. VTT file or inline VTT** — multi-cue subtitles with timestamps:

```json
{
  "id": "vtt-caption",
  "type": "subtitle",
  "src": "captions.vtt",
  "fontSize": 48,
  "fontStyle": "italic",
  "actions": [{ "start": 0, "end": 10 }]
}
```

Or embed VTT cues directly:

```json
{
  "id": "inline-vtt",
  "type": "subtitle",
  "src": "WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nFirst caption\n\n00:00:05.000 --> 00:00:08.000\nSecond caption",
  "actions": [{ "start": 0, "end": 10 }]
}
```

**3. Explicit cues array** — structured JSON cues (most reliable):

```json
{
  "id": "cued",
  "type": "subtitle",
  "cues": [
    { "startFrom": 0, "endAt": 2, "text": "Opening", "className": "intro" },
    { "startFrom": 2.5, "endAt": 5, "text": "Feature demo", "className": "feature" }
  ],
  "actions": [{ "start": 0, "end": 6 }]
}
```

**Style cascade** (highest to lowest priority):

1. `style` field on the stream node (inline CSS, converted to camelCase)
2. `fontSize` / `fontStyle` fields
3. `className` on cues (`.caption-overlay .caption.${className}`)
4. Global `stylesheet` on root node (CSS selectors use `.type` and `.name`)

Global stylesheet on root:

```json
{
  "id": "root",
  "stylesheet": ".subtitle { font-family: 'PingFang SC', sans-serif; }
                 .subtitle.my-caption { color: #ff6b35; }
                 .caption { background: rgba(0,0,0,0.5); padding: 8px 16px; border-radius: 8px; }
                 .word-active { color: #00ff88; }",
  "children": [...]
}
```

**Karaoke / word-highlight** — set `className` on the cue to `"karaoke"` or provide `words[]`:

```json
{
  "cues": [{
    "startFrom": 0, "endAt": 3,
    "text": "Build smarter",
    "className": "karaoke",
    "words": [
      { "text": "Build", "start": 0, "end": 1 },
      { "text": "smarter", "start": 1, "end": 3 }
    ]
  }]
}
```

Without explicit `words[]`, the engine auto-derives equal-duration word tokens. Active word gets class `.word-active` for CSS highlighting.

**Default positioning**: bottom-center, 8% from bottom, 5% horizontal padding. Override via `style: "position: absolute; top: 10%; left: 10%;"`.

---

### Custom Overlay Components (React / SVG + CSS)

You can create custom React components and reference them from the stream tree. This works for HTML overlays, SVG graphics, animated logos, data visualizations — anything renderable as React.

**1. Create a component file** in `src/components/`:

```tsx
// src/components/my/Badge.tsx
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { interpolate } from "remotion";

interface BadgeProps {
  text: string;
  color?: string;
  /** Provided automatically by the engine */
  action: { start: number; end: number };
  theme: any;
}

export const Badge: React.FC<BadgeProps> = ({ text, color, action, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - action.start * fps;
  const duration = (action.end - action.start) * fps;

  const opacity = interpolate(local, [0, 15, duration - 15, duration], [0, 1, 1, 0]);
  const scale = interpolate(local, [0, 15], [0.5, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity, transform: `scale(${scale})`,
    }}>
      <svg width="300" height="120" viewBox="0 0 300 120">
        <rect rx="60" ry="60" x="0" y="0" width="300" height="120"
          fill={color || theme.colors.primary}
          filter="url(#glow)" />
        <text x="150" y="68" textAnchor="middle"
          fill="white" fontSize="36" fontWeight="bold"
          fontFamily={theme.fonts.heading}>
          {text}
        </text>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
};
```

**2. Register it** in `src/components/index.ts`:

```tsx
import { Badge } from "./my/Badge";

export const builtinComponents: Record<string, React.ComponentType<any>> = {
  // ...existing components...
  Badge,
};
```

**3. Reference it** in your stream tree:

```json
{
  "id": "badge-1",
  "type": "component",
  "componentName": "Badge",
  "props": {
    "text": "NEW",
    "color": "#ff6b35"
  },
  "actions": [{ "start": 1, "end": 4 }]
}
```

**Component contract** (props the engine injects):

```tsx
interface InjectedProps {
  action: { start: number; end: number };
  theme: Theme;                    // resolved theme object
  frame: number;                   // current global frame (useCurrentFrame)
  fps: number;                     // from useVideoConfig
}
```

Your component props merge with these. Use `action.start/end` to compute local frame timing, and `theme.colors/fonts` for consistent styling.

**Where to put custom components**:
- For project-specific components: `src/components/my/` (add to `index.ts`)
- For one-off experiments: inline SVG/HTML in an `effect` wrapper (see next section)

---

### Dynamic Loading (Animations, Emoji, Remote Components)

Three mechanisms for dynamic visual content without bundling code.

#### A. Built-in Keyframe Animations (effect stream)

Wrap any node with an `effect` stream to apply an animation:

```json
{
  "id": "animated-scene",
  "type": "effect",
  "animation": "bounceIn",
  "animationTimingFunction": "ease-out",
  "animationIterationCount": 1,
  "children": [
    { "id": "content", "type": "image", "src": "photo.jpg",
      "actions": [{ "start": 0, "end": 3 }] }
  ],
  "actions": [{ "start": 0, "end": 3 }]
}
```

All built-in animation names:

| Fades | Slides | Zooms | Attention | Bounce Entrances | Rotations |
|-------|--------|-------|-----------|-----------------|------------|
| `fadeIn` | `slideInDown` | `zoomIn` | `pulse` | `bounceIn` | `rotateIn` |
| `fadeOut` | `slideInUp` | `zoomOut` | `flash` |  | `rotateOut` |
| `fadeInDown` | `slideInLeft` |  | `bounce` |  |  |
| `fadeInUp` | `slideInRight` |  | `heartBeat` |  |  |
| `fadeInLeft` |  |  | `rubberBand` |  |  |
| `fadeInRight` |  |  | `shakeX` |  |  |
| (8 fades total) |  |  |  |  |  |

Each animation interpolates CSS properties (`opacity`, `transform`) frame-by-frame using Remotion's `interpolate()`.

**Custom keyframes** — define inline instead of using a named animation:

```json
{
  "id": "custom-anim",
  "type": "effect",
  "animation": "custom",
  "customKeyframes": {
    "0":  { "opacity": "0", "transform": "scale3d(0,0,0) rotate(0deg)" },
    "50": { "opacity": "0.5", "transform": "scale3d(1.2,1.2,1.2) rotate(180deg)" },
    "100": { "opacity": "1", "transform": "scale3d(1,1,1) rotate(360deg)" }
  },
  "children": [{ "id": "star", "type": "component", "componentName": "EmojiOverlay",
    "props": { "emoji": "🌟", "size": 120 },
    "actions": [{ "start": 0, "end": 2 }] }],
  "actions": [{ "start": 0, "end": 2 }]
}
```

Keyframe percentages (`"0"`–`"100"`) map to the action's duration. Any CSS property with numeric values works.

#### B. Emoji / Text Overlays (via component stream)

Use the component system with a simple inline-registered component for emoji or decorative text:

```json
{
  "id": "emoji-1",
  "type": "component",
  "componentName": "AnimatedHeadline",
  "props": {
    "text": "🚀 Launch Day",
    "glow": true,
    "gradient": true
  },
  "actions": [{ "start": 0.5, "end": 4 }]
}
```

For raw emoji without text animation, create a lightweight component (see Custom Overlay Components above) or use a subtitle with HTML:

```json
{
  "id": "emoji-overlay",
  "type": "subtitle",
  "src": "<span style='font-size:120px'>🎉</span>",
  "style": "position: absolute; top: 20%; left: 50%; transform: translate(-50%, -50%); text-align: center;",
  "actions": [{ "start": 0, "end": 2 }]
}
```

#### C. Route Visualization (map stream type)

There is a built-in `map` stream type for drawing animated routes between waypoints. It renders on an HTML Canvas — no API key needed.

```json
{
  "id": "route-1",
  "type": "map",
  "waypoints": [
    {"lat": 37.7749, "lng": -122.4194, "label": "SF"},
    {"lat": 34.0522, "lng": -118.2437, "label": "LA"},
    {"lat": 36.1699, "lng": -115.1398, "label": "LV"}
  ],
  "routeColor": "#4285F4",
  "routeWeight": 4,
  "markerSrc": null,
  "zoom": 12,
  "actions": [{ "start": 0, "end": 5 }]
}
```

Features:
- **Animated marker** travels along the path in sync with the current frame
- **Waypoint markers** with color coding (green=start, yellow=mid, red=end) and labels
- **Route line** with configurable color and weight
- **Grid background** for map feel
- **No external deps** — pure Canvas 2D rendering

Fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `waypoints[]` | array | required | `{lat, lng, label?, media?}` |
| `waypoints[].lat` | number | — | Latitude |
| `waypoints[].lng` | number | — | Longitude |
| `waypoints[].label` | string | — | Display label above marker |
| `waypoints[].media` | string | — | Image/video src for custom marker (not yet implemented) |
| `routeColor` | string | `#4285F4` | Route line color |
| `routeWeight` | number | 4 | Route line width |
| `markerSrc` | string | null | Custom marker image |
| `zoom` | number | 12 | Map zoom level (affects bounds padding) |

This is a **native stream type** (`type: "map"`), not a component in the registry. It renders a full-canvas overlay. For full Google Maps integration (DirectionsService, satellite tiles), create a custom component instead.

#### D. Remote Components (load from URL)

The `component` stream type's `src` field lets you load a React component from a remote URL at render time:

```json
{
  "id": "remote-badge",
  "type": "component",
  "componentName": "RemoteBadge",
  "src": "https://cdn.example.com/components/badge.js",
  "props": { "text": "LIVE", "color": "#ff0000" },
  "actions": [{ "start": 0, "end": 3 }]
}
```

**Remote component convention** — the module file must use `window.__React` and `window.__Remotion`:

```js
// badge.js — remote component loaded by the engine
const React = window.__React;
const { useCurrentFrame, interpolate } = window.__Remotion;

function Badge(props) {
  const frame = useCurrentFrame();
  return React.createElement("div", {
    style: {
      background: props.color || "#ff6b35",
      padding: "12px 24px",
      borderRadius: "8px",
      color: "white",
      fontWeight: "bold",
      fontSize: "48px",
    }
  }, props.text);
}

// Must use CommonJS default export
module.exports = { default: Badge };
```

The engine supports both ES module (via blob URL + dynamic `import()`) and CJS fallback (via `new Function` eval). Components are cached after first load.

**Preloading** — call before rendering to warm the cache:

```tsx
import { preloadComponents } from "./types/DynamicLoader";
await preloadComponents(["https://cdn.example.com/components/badge.js"]);
```

---

## Recipes

### Label video scenes from media files

```bash
# 1. Create scenes.json (root → scenes folder → one child per scene)
# 2. Preview and label
node src/render/cli.mjs preview scenes.json --label
# 3. Labels auto-save to labels.json — use to pick best scenes
```

### Agent-assisted editing

```bash
# Terminal 1: Player with notification panel
node src/render/cli.mjs preview draft.json --chat --port 3001

# Terminal 2: Agent reads user feedback from SSE, edits the JSON file,
# then POSTs a notification back telling user to reload
curl -X POST http://localhost:3001/api/chat/send \
  -H 'Content-Type: application/json' \
  -d '{"text":"done — reload to see"}'
```

### Multi-aspect social renders

```bash
# YouTube (16:9) + TikTok (9:16) + Instagram (1:1)
npm run render -- my-video.json --aspect all
```

### Use a template

```bash
npm run render -- --template product-hero --data my-data.json --aspect all
```

---

## Testing

```bash
npm run typecheck        # TypeScript type checking
npm test                 # Vitest unit tests
npm run render           # Smoke test: renders sample.json → out/preview.mp4
```

## Detailed Reference

| Topic | File |
|-------|------|
| Full architecture design | `DESIGN.md` |
| CLI source (all commands) | `src/render/cli.mjs` |
| Player server (label/chat modes) | `src/player/server.mjs` |
| Stream tree schema (all 10 types) | `src/schema/index.ts` |
| Subtitle renderer (caption styling) | `src/types/Subtitle.tsx` |
| Effect/Animation engine | `src/types/Effect.tsx`, `src/types/keyframes.ts` |
| Dynamic component loader | `src/types/DynamicLoader.tsx` |
| Theme system | `src/themes/` |
| Template system | `src/templates/` |
| Built-in components | `src/components/` |
| Folder renderer (series/parallel) | `src/types/Folder.tsx` |
| Rendering pipeline | `src/render/pipeline.ts` |
