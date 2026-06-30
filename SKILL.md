---
name: remotion-engine
description: >-
  Compose and render videos from JSON stream trees. CLI renders stream tree JSON
  to MP4. Run via `npx lalalic/remotion-engine` — no install, no code.
---

## Overview

Three authoring levels:
1. **Label** — browse media folder, label best clips, export labels.json
2. **Storyboard** — `scene` nodes with high-level structure
3. **Assemble** — full stream tree with all types, render to MP4

---

## 1. Stream Tree Rules

Everything is a **stream tree**: nested JSON nodes typed by `type`.

```json
{ "id":"root", "type":"root", "width":1080, "height":1920, "fps":30,
  "isSeries":true, "transition":"fade", "children":[...] }
```

### Composition

| Concept | Rule |
|---------|------|
| **Series** (`isSeries:true`) | Sequential children. Optional `transition` (fade/slide/wipe/flip/clockWipe) + `transitionTime` (default 0.5s). |
| **Parallel** (`isSeries:false`) | Simultaneous children. durationInSeconds = max child duration. |
| **Background** (`isBackground:true`) | Loops for parent duration, excluded from duration calc. |
| **Actions** | Every leaf: `actions[{start,end, volume?, loop?, effectId?, style?}]` — seconds relative to parent. |

### Types

| Type | Scenario | Key Fields |
|------|----------|------------|
| `root` | Canvas container | `width`, `height`, `fps`, `isSeries`, `transition`, `stylesheet` |
| `folder` | Group children | `isSeries`, `transition`, `children[]` |
| `scene` | **Storyboard node** — UI renders as collapsible card, engine treats as folder | `name`, `description`, `children[]` |
| `image` | Still image | `src` (URL/staticFile), `fit` (contain/cover/fill) |
| `video` | Video clip | `src`, `volume`, `playbackRate` |
| `audio` | Soundtrack/SFX. `isBackground:true` loops. `foreground:true` ducks parent | `src`, `volume` |
| `subtitle` | Text overlay. 3 input modes: inline text (supports HTML), VTT string/file, or explicit `cues[]` | `src` or `cues[]`, `fontSize`, `fontStyle`, `style`, `actions[]` |
| `component` | Registered React component | `componentName` (registry key), `props` (JSON), `src` (remote URL) |
| `effect` | CSS keyframe wrapper. 25+ built-in animations + custom keyframes | `animation` (name or `"custom"`), `customKeyframes`, `animationTimingFunction` |
| `rhythm` | Beat-synced audio with timed children | `src`, `volume`, `spots[]` |
| `map` | Canvas route visualization, no API key | `waypoints[{lat,lng,label}]`, `routeColor`, `routeWeight` |
| `include` | Embed external video JSON | `src` (path/URL/data URI), `volume` |

### Built-in Components (20)

`{ type:"component", componentName:"...", props:{...} }`

**Text**: `AnimatedHeadline`, `TypewriterText`, `GlitchReveal`, `TextCard`, `CalloutBox`, `EndTag`
**Media**: `DeviceMockup` (browser/phone frame), `CursorFlyover`, `ComparisonSlider`
**Data**: `StatCounter`, `ProgressBar`, `BarChart`, `LineChart`, `PieChart`, `ComparisonCard`
**Atmosphere**: `GradientBackground`, `ParticleField`, `LightLeak`
**Layout**: `SplitScreen`, `SpotlightReveal`

### Dynamic Content

3 ways without rebuilding:
1. **Effect wrapper** — `effect` node with 25+ built-in animations (fadeIn, bounceIn, pulse, etc.) or custom keyframes
2. **Remote component** — `{ type:"component", src:"https://...", componentName:"X" }` — fetched at render time
3. **Custom component** — add `.tsx` to `src/components/`, register in `builtinComponents`. See [docs/dynamic-components.md](docs/dynamic-components.md)

### Subtitle Styling

3 input modes: inline text (HTML supported), VTT file/string, or `cues[]` array.
Karaoke: `className:"karaoke"` or explicit `words[{text,start,end}]`.
Style cascade: `style` field → `fontSize/fontStyle` → cue className → root `stylesheet`.

---

## 2. Video Design Best Practice

### Label → labels.json to get user initial input

The label player works with a simple stream tree JSON.
It creates one node per media file (image/video) as children and lets you label them.

```json
# labels.json
{
    "id": "root", "type": "root", "width": 1080, "height": 1920, "fps": 30, "isSeries": true,
    "children": [ #list media ordered by created time
      {id, type:"image", src, actions:[{start:0,end:5}], description:"label text"},
      {id, type:"video", src, actions:[{start:0,end: <video duration> }], description:"label text"},
      ...
    ]
  }
```

### Storyboard → storyboard.json to get agent high-level video plan

`scene` nodes are organizational containers. It's a perfect tool for organizing your video structure. The agent generates a storyboard, then fills each scene with concrete media/component children and subtitle as script anywhere. 
This is a sample agent storyboard format.

```json
# storyboard.json
{
  "id": "root", "type": "root","width": 1080, "height": 1920, "fps": 30, "isSeries": true,
  "children": [ # scenes
    { "type": "scene", "name": "Intro",
      "description": "Opener with animated headline and ambient BGM", # summary, style guide, agent prompt
      "children": [
        {type:"subtitle", src:"Welcome to our product"},# use subtitle for story script during storyboard phase
        {type:"folder"} # use folder to group multiple media/components for this scene or single media/component
      ]
    },
    { "type": "scene","name": "Feature",
      "description": "Product screenshot with stat counter",
      "children": [
        { "type": "scene","name": "Feature1", children:[...]}
        ...
      ]
    },
    {"type": "scene", "name": "Outro",
      "description": "Call to action",
      "children": [...]
    }
  ]
}
```

### Assemble → video.json (production) to get final renderable video JSON

Replace `scene` containers with flat stream tree (or keep scenes as organization).
Add effects, transitions, rhythm, maps, tts, subtitle, components. This is the final renderable JSON.

```bash
npx lalalic/remotion-engine preview video.json --edit   # live agent loop
npx lalalic/remotion-engine render video.json --aspect all  # MP4 output
```
```

---

## 3. CLI

```bash
npx lalalic/remotion-engine <command> [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `render <file.json>` | Render stream tree to MP4 |
| `render --template <id> --data <data.json>` | Resolve template with data, render |
| `preview <file.json>` | Open Remotion Studio |
| `preview <file.json> --label` | Interactive labeling player |
| `preview <file.json> --edit` | Live editing loop (auto-reload on file change) |
| `templates` | List all templates |

### Options

| Flag | Values | Default |
|------|--------|---------|
| `--aspect` | `16x9` / `9x16` / `1x1` / `all` | `16x9` |
| `--output` | path | `out/video-{aspect}.mp4` |
| `--port` | number | `3001` |
| `--verbose` | flag | `false` (compact progress) |

### Edit Mode for Agents

```bash
# Start player in background
npx lalalic/remotion-engine preview draft.json --edit --port 3001 &

# Player auto-opens browser. Agent edits JSON → player auto-reloads.
# User clicks ✕ → server exits → agent regains control.
# Browser feedback input writes to feedback.txt.
```

---

## Reference

| Topic | File |
|-------|------|
| Dynamic components (remote, custom, effects) | [docs/dynamic-components.md](docs/dynamic-components.md) |
| Template system (slots, categories, resolution) | [docs/templates.md](docs/templates.md) |
| Theme system (presets, customization) | [docs/themes.md](docs/themes.md) |
| Player servers (label + edit mode) | [docs/edit-mode.md](docs/edit-mode.md) |
| Full architecture | `DESIGN.md` |
