# Pi Package Implementation: AI Video Editing Agent with MLX Models & Remotion Render Engine

**Project**: FireRed-OpenStoryline Pi Package  
**Status**: Design Document  
**Last Updated**: 2026-06-25  
**Render Engine**: `lalalic/remotion-engine` (Remotion 4.x stream-tree kernel)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Skill System](#skill-system)
5. [Subagent Coordination](#subagent-coordination)
6. [Prompt Template System](#prompt-template-system)
7. [MLX Integration](#mlx-integration)
8. [Remotion-Engine Integration](#remotion-engine-integration)
9. [Implementation Roadmap](#implementation-roadmap)

---

## 🎯 Overview

### Objective
Implement a **Pi package** that adapts FireRed-OpenStoryline's skill-based video editing workflow using:
- **@nicobailon/pi-subagents** for parallel & sequential task orchestration
- **MLX-VLM** & **MLX-Audio** for local vision-language & audio processing (replacing cloud VLM/TTS)
- **Whisper** for local speech-to-text (replacing cloud STT)
- **lalalic/remotion-engine** as the render-only timeline kernel (replacing MoviePy)
- **Task-driven prompt templates** (referencing FireRed's prompt structure)

### Key Innovations

| Aspect | FireRed | Pi Package |
|--------|---------|-----------|
| **LLM Framework** | LangChain agents | Pi framework with subagents |
| **Vision Model** | Cloud VLM (API) | MLX-VLM (local, quantized) |
| **Audio I/O** | Cloud TTS/STT | MLX-Audio + Whisper (local) |
| **Render Engine** | MoviePy + FFmpeg | Remotion Engine (React-based stream trees) |
| **Task Routing** | NodeManager + Skills | Pi Subagents + Skill definitions |
| **Prompts** | Markdown task prompts | Template engine with Skill metadata |
| **Execution** | Sequential tools | Chain & Parallel subagent execution |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PI PACKAGE: VIDEO EDITING AGENT                      │
└─────────────────────────────────────────────────────────────────────────┘

                           ┌──────────────────┐
                           │  User Input      │
                           │  (natural lang)  │
                           └────────┬─────────┘
                                    │
                    ┌───────────────▼────────────────┐
                    │  MAIN ORCHESTRATOR (Pi Agent)  │
                    │  • Parse intent                │
                    │  • Route to Skill workflow     │
                    │  • Manage session state        │
                    └───────────────┬────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
   │  Skill Manager  │     │  Prompt Engine  │     │  Timeline       │
   │                 │     │                 │     │  Builder        │
   │ • Load Skills   │     │ • Template vars │     │                 │
   │ • Validate flow │     │ • Inject hints  │     │ • Compose Tree  │
   │ • Track deps    │     │ • Generate text │     │ • Clips + Audio │
   └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │  SUBAGENT EXECUTOR            │
                    │  (@nicobailon/pi-subagents)   │
                    │                               │
                    │  • Chain: Sequential tasks    │
                    │  • Parallel: Independent ops  │
                    │  • Fork/Join: Conditional     │
                    └───────────────┬───────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
   ┌─────────────────┐     ┌──────────────────┐    ┌──────────────────┐
   │  MLX Subagents  │     │ Workflow Stage   │    │ Timeline Render  │
   │                 │     │ Subagents        │    │ Subagent         │
   │ • VLM (vision)  │     │                  │    │ (@neox/remotion- │
   │ • Audio (TTS)   │     │ • Load media     │    │  engine)         │
   │ • Whisper (STT) │     │ • Understand     │    │                  │
   └─────────────────┘     │ • Filter/Group   │    │ • Build JSON     │
                           │ • Generate text  │    │   stream tree    │
                           │ • Generate voice │    │ • Render to MP4  │
                           │ • Select music   │    │ • Multi-aspect   │
                           └──────────────────┘    └──────────────────┘

```

---

## 🔧 Core Components

### 1. **Skill System** (Extends FireRed)

```typescript
// skill.ts
interface SkillDefinition {
  // Metadata (from SKILL.md frontmatter)
  name: string;
  description: string;
  type: "WORKFLOW" | "CAPABILITY" | "META";
  version: string;
  tags: string[];
  author?: string;

  // Workflow structure
  stages: WorkflowStage[];
  dependencies?: Record<string, string[]>; // stage_id -> prerequisite_ids
  
  // Prompt configuration
  promptTemplate: {
    role: string;
    task: string;
    constraints?: string;
    examples?: Record<string, unknown>;
  };

  // Subagent configuration
  subagentConfig?: {
    parallel?: boolean;
    timeout?: number;
    retryPolicy?: RetryPolicy;
  };

  // Capability hints
  capabilities: {
    requiresVLM?: boolean;
    requiresAudio?: boolean;
    requiresGPU?: boolean;
    localOnly?: boolean;
  };

  // Timeline render output specification
  renderOutput?: {
    formats: ("mp4" | "webm" | "mov" | "json")[];
    aspectRatios?: ("16x9" | "9x16" | "1x1" | "4x3")[];
    fps?: number;
    bitrate?: string;
  };
}

interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  
  // Operation mode
  operation: {
    type: "parallel" | "sequential" | "conditional";
    tasks: TaskDefinition[];
  };

  // Can be skipped?
  optional: boolean;
  
  // Dependency graph
  requires?: string[]; // stage_ids
  
  // Output handling
  outputSchema?: Record<string, unknown>;
  outputToTimeline?: boolean;  // Should output flow to remotion-engine?
}

interface TaskDefinition {
  id: string;
  name: string;
  
  // Execution via subagent
  subagentType: "llm" | "mlx_vlm" | "mlx_audio" | "whisper" | "timeline_render";
  
  // Prompt template with substitutions
  promptKey: string; // tasks/{skillname}/{lang}/{promptKey}.md
  
  // Parameter mapping
  inputMapping: Record<string, string>; // param -> path in context
  outputMapping: Record<string, string>; // result field -> storage key
}
```

### 2. **Prompt Template Engine**

Structure mirroring FireRed's `/prompts` directory:

```
prompts/
├── system/
│   ├── instruction.md          # Main system prompt
│   └── skill_router.md         # Skill selection logic
│
├── skills/
│   ├── default_editing_workflow/
│   │   ├── SKILL.md            # Skill metadata + workflow definition
│   │   ├── description.md      # Human-readable description
│   │   └── stages.json         # WorkflowStage definitions
│   │
│   ├── speech_rough_cut/
│   │   ├── SKILL.md
│   │   └── stages.json
│   │
│   └── ai_transition_editing/
│       ├── SKILL.md
│       └── stages.json
│
├── tasks/
│   ├── understand_clips/
│   │   ├── en/
│   │   │   ├── system.md           # VLM system prompt
│   │   │   └── detail.md           # Detailed instructions
│   │   └── zh/
│   │       ├── system.md
│   │       └── detail.md
│   │
│   ├── generate_script/
│   │   ├── en/system.md
│   │   ├── zh/system.md
│   │   └── examples.json           # Few-shot examples
│   │
│   ├── generate_voiceover/
│   │   ├── en/system.md
│   │   └── audio_config.json
│   │
│   ├── generate_ai_transition/
│   │   ├── en/system.md
│   │   └── transition_strategies.json
│   │
│   ├── filter_clips/
│   │   ├── en/system.md
│   │   └── selection_criteria.json
│   │
│   ├── group_clips/
│   │   ├── en/system.md
│   │   └── grouping_rules.json
│   │
│   ├── select_bgm/
│   │   ├── en/system.md
│   │   └── music_library.json
│   │
│   ├── speech_rough_cut/
│   │   ├── en/system.md
│   │   └── asr_config.json
│   │
│   └── build_timeline/
│       ├── en/system.md
│       └── remotion_schema.json    # Remotion Engine stream tree config
│
└── templates/
    ├── task_prompt_template.hbs   # Handlebars template
    └── variables.schema.json       # Variable definitions
```

### 3. **Subagent Types**

```typescript
// subagents.ts
type SubagentType = 
  | "llm"                    // Main LLM for orchestration
  | "mlx_vlm"                // Vision-language model
  | "mlx_audio"              // Audio synthesis (TTS)
  | "whisper"                // Speech-to-text
  | "timeline_render"        // Remotion Engine render
  | "node_exec";             // Node.js execution for complex logic

interface SubagentInstance {
  type: SubagentType;
  model?: string;            // Model name/path
  config: Record<string, unknown>;
  capabilities: string[];
}

// Subagent pool
class SubagentPool {
  private agents: Map<SubagentType, SubagentInstance[]>;
  
  async getAgent(type: SubagentType): Promise<SubagentInstance>;
  async releaseAgent(type: SubagentType, agent: SubagentInstance): Promise<void>;
  async initialize(): Promise<void>;
  async shutdown(): Promise<void>;
}
```

---

## 🎨 Skill System

### **Skill Definition Structure** (extends FireRed)

Each skill is a reusable workflow unit combining:
1. **Metadata** (name, description, type, version)
2. **Workflow stages** (what steps to execute)
3. **Prompt templates** (how to instruct each step)
4. **Subagent routing** (which service handles each task)
5. **Render specifications** (aspect ratios, formats for final output)

### **Example: `default_editing_workflow_skill`**

```yaml
# .storyline/skills/default_editing_workflow_skill/SKILL.md
---
name: default_editing_workflow_skill
type: WORKFLOW
description: Universal vlog editing workflow for daily/travel videos
version: 1.0.0
tags: [vlog, editing, general]
renderOutput:
  formats: [mp4, webm]
  aspectRatios: [16x9, 9x16, 1x1]
  fps: 30
  bitrate: "5000k"
---

# Workflow Definition (JSON)
# File: stages.json
{
  "stages": [
    {
      "id": "media_init",
      "name": "Media Initialization",
      "operation": {
        "type": "sequential",
        "tasks": [
          {
            "id": "search_media",
            "name": "Search & Download Media",
            "subagentType": "node_exec",
            "optional": true,
            "promptKey": "search_media/system"
          },
          {
            "id": "load_media",
            "name": "Load Media Metadata",
            "subagentType": "node_exec",
            "promptKey": "load_media/system",
            "optional": false
          }
        ]
      }
    },
    
    {
      "id": "understanding",
      "name": "Media Understanding & Analysis",
      "operation": {
        "type": "sequential",
        "tasks": [
          {
            "id": "split_shots",
            "name": "Shot Segmentation",
            "subagentType": "node_exec",
            "optional": true,
            "promptKey": "split_shots/system"
          },
          {
            "id": "understand_clips",
            "name": "Content Understanding",
            "subagentType": "mlx_vlm",
            "optional": true,
            "promptKey": "understand_clips/en/system_detail",
            "requires": ["split_shots"],
            "inputMapping": {
              "clips": "split_shots.output.clips"
            },
            "outputMapping": {
              "captions": "context.clip_captions"
            }
          }
        ]
      }
    },

    {
      "id": "clip_selection",
      "name": "Intelligent Clip Selection",
      "operation": {
        "type": "sequential",
        "tasks": [
          {
            "id": "filter_clips",
            "name": "Clip Filtering",
            "subagentType": "llm",
            "optional": true,
            "promptKey": "filter_clips/en/system"
          },
          {
            "id": "group_clips",
            "name": "Narrative Grouping",
            "subagentType": "llm",
            "optional": false,
            "promptKey": "group_clips/en/system",
            "requires": ["understand_clips"]
          }
        ]
      }
    },

    {
      "id": "content_generation",
      "name": "Creative Content Generation",
      "operation": {
        "type": "sequential",
        "tasks": [
          {
            "id": "generate_script",
            "name": "Script Generation",
            "subagentType": "llm",
            "optional": true,
            "promptKey": "generate_script/en/system"
          },
          {
            "id": "generate_voiceover",
            "name": "Voiceover Generation",
            "subagentType": "mlx_audio",
            "optional": true,
            "promptKey": "generate_voiceover/en/system"
          },
          {
            "id": "select_bgm",
            "name": "Background Music Selection",
            "subagentType": "llm",
            "optional": true,
            "promptKey": "select_bgm/en/system"
          }
        ]
      },
      "parallel": false
    },

    {
      "id": "finalization",
      "name": "Timeline & Rendering",
      "operation": {
        "type": "sequential",
        "tasks": [
          {
            "id": "build_timeline",
            "name": "Build Remotion Stream Tree",
            "subagentType": "node_exec",
            "optional": false,
            "promptKey": "build_timeline/en/system",
            "outputToTimeline": true
          },
          {
            "id": "render_video",
            "name": "Render Video (Remotion Engine)",
            "subagentType": "timeline_render",
            "optional": false,
            "promptKey": "render_video/en/config"
          }
        ]
      }
    }
  ]
}
```

---

## 🔀 Subagent Coordination

### **Chain Execution** (Sequential)

```typescript
// For tasks with dependencies
import { chain } from "@nicobailon/pi-subagents";

const mediaToScript = chain([
  {
    id: "understand_clips",
    agent: mlxVLMSubagent,
    prompt: await loadPrompt("understand_clips/en/system_detail"),
    input: { clips: mediaContext.clips }
  },
  {
    id: "group_clips",
    agent: llmSubagent,
    prompt: await loadPrompt("group_clips/en/system"),
    input: { 
      captions: prev.understand_clips.output,
      userRequest: context.userRequest
    }
  },
  {
    id: "generate_script",
    agent: llmSubagent,
    prompt: await loadPrompt("generate_script/en/system"),
    input: {
      groupInfo: prev.group_clips.output,
      style: context.style
    }
  }
]);

const result = await mediaToScript.execute();
```

### **Parallel Execution** (Independent Tasks)

```typescript
// For independent operations (e.g., music selection + element recommendations)
import { parallel } from "@nicobailon/pi-subagents";

const contentEnhancement = parallel([
  {
    id: "select_bgm",
    agent: llmSubagent,
    prompt: await loadPrompt("select_bgm/en/system"),
    input: { groupInfo, mood: context.mood }
  },
  {
    id: "elementrec_transition",
    agent: llmSubagent,
    prompt: await loadPrompt("elementrec_transition/en/system"),
    input: { groupInfo, style: context.style }
  }
]);

const [bgm, transitions] = await contentEnhancement.execute();
```

### **Conditional Branching**

```typescript
// Example: Skip voiceover if user requests "silent mode"
import { conditional } from "@nicobailon/pi-subagents";

const voiceoverStep = conditional(
  context.includeVoiceover === true,
  {
    id: "generate_voiceover",
    agent: mlxAudioSubagent,
    prompt: await loadPrompt("generate_voiceover/en/system"),
    input: { script: contentGen.script, voice: context.voicePreference }
  },
  {
    id: "skip_voiceover",
    agent: llmSubagent,
    prompt: "Return empty voiceover marker",
    input: {}
  }
);
```

---

## 📝 Prompt Template System

### **Template Syntax** (Handlebars-based)

```handlebars
{{!-- prompts/tasks/generate_script/en/system.md --}}

# Role Setup

You are a seasoned short-form video and vlog copywriting strategist...

# Goal

Your task is to use the user-provided **[user_request]** and **[group_infos]** 
to write a voiceover script for each group.

# Input Data

1. **[user_request]**: {{userRequest}}
2. **[overall]**: {{overall}}
3. **[style]**: {{style}}
4. **[group_infos]**: 
{{#each groupInfos}}
  - Group {{@index}}: {{this.summary}}
    Script budget: {{this.scriptCharsBudget}} chars
{{/each}}

# Style Configuration

{{#if style.equals "Lyrical & Poetic"}}
Follow the lyrical approach: use metaphors, sensory details, imagery...
{{else if style.equals "Humorous & Witty"}}
Follow the humorous approach: use exaggeration, wit, unexpected twists...
{{else}}
Follow the daily mumbling approach: genuine inner monologue, everyday tone...
{{/if}}

# Creation Principles

1. **Tone & Perspective**
   - Use first-person "I" throughout
   - Match language style to {{style}}
   - {{#if strictLanguage}}No canned phrases{{/if}}

...

# Output Format

```json
{
  "group_scripts": [
    {{#each groupInfos}}
    {
      "group_id": "{{this.id}}",
      "raw_text": "... string within {{this.scriptCharsBudget}} chars ..."
    }{{#unless @last}},{{/unless}}
    {{/each}}
  ],
  "title": "3-15 word title"
}
```
```

---

## 🎯 MLX Integration

### **1. MLX-VLM Subagent** (Replace Cloud VLM)

```typescript
// mlx_vlm_subagent.ts
import { MLXVisionLanguageModel } from "mlx-vlm";

class MLXVLMSubagent {
  private model: MLXVisionLanguageModel;
  private config: MLXVLMConfig;

  constructor(config: MLXVLMConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.model = await MLXVisionLanguageModel.load(
      this.config.modelPath,
      {
        quantization: this.config.quantization || "4-bit",
        device: this.config.device || "auto",
      }
    );
  }

  async execute(input: {
    images: string[];
    prompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    response: string;
    tokensUsed: number;
    processingTime: number;
  }> {
    const startTime = Date.now();

    const response = await this.model.generate(
      input.prompt,
      {
        images: input.images,
        temperature: input.temperature || 0.7,
        maxTokens: input.maxTokens || 512,
      }
    );

    return {
      response: response.text,
      tokensUsed: response.tokensUsed,
      processingTime: Date.now() - startTime,
    };
  }

  async understandClip(
    clipPath: string,
    systemPrompt: string
  ): Promise<{ caption: string; aesScore: number }> {
    const response = await this.execute({
      images: [clipPath],
      prompt: systemPrompt,
      maxTokens: 256,
    });

    const parsed = JSON.parse(response.response);
    return {
      caption: parsed.caption,
      aesScore: parseFloat(parsed.aes_score),
    };
  }
}

interface MLXVLMConfig {
  modelPath: string;
  quantization?: "4-bit" | "8-bit";
  device?: "auto" | "cpu" | "gpu";
  maxConcurrency?: number;
}
```

### **2. MLX-Audio Subagent** (Replace Cloud TTS)

```typescript
// mlx_audio_subagent.ts
import { MLXAudioSynthesizer } from "mlx-audio";

class MLXAudioSubagent {
  private tts: MLXAudioSynthesizer;
  private config: MLXAudioConfig;

  constructor(config: MLXAudioConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.tts = await MLXAudioSynthesizer.load(
      this.config.modelPath,
      {
        device: this.config.device || "auto",
        quantization: this.config.quantization || "4-bit",
      }
    );
  }

  async synthesize(input: {
    text: string;
    voice?: string;
    language?: string;
    speed?: number;
    pitch?: number;
  }): Promise<{
    audioPath: string;
    duration: number;
    waveform: Float32Array;
  }> {
    const audio = await this.tts.synthesize(input.text, {
      voice: input.voice || this.config.defaultVoice,
      language: input.language || "en",
      speed: input.speed || 1.0,
      pitch: input.pitch || 1.0,
    });

    const audioPath = await this.saveAudio(audio);

    return {
      audioPath,
      duration: audio.duration,
      waveform: audio.waveform,
    };
  }

  async generateVoiceover(
    scripts: { groupId: string; text: string }[],
    voice: string
  ): Promise<VoiceoverOutput> {
    const voiceovers: VoiceoverSegment[] = [];

    const results = await Promise.all(
      scripts.map(script =>
        this.synthesize({
          text: script.text,
          voice,
        })
      )
    );

    for (let i = 0; i < scripts.length; i++) {
      voiceovers.push({
        groupId: scripts[i].groupId,
        audioPath: results[i].audioPath,
        duration: results[i].duration,
      });
    }

    return { segments: voiceovers };
  }

  private async saveAudio(audio: AudioData): Promise<string> {
    const path = `${this.config.cacheDir}/${generateUUID()}.wav`;
    await fs.writeFile(path, audio.buffer);
    return path;
  }
}

interface MLXAudioConfig {
  modelPath: string;
  defaultVoice: string;
  quantization?: "4-bit" | "8-bit";
  device?: "auto" | "cpu" | "gpu";
  cacheDir: string;
}
```

### **3. Whisper Subagent** (Replace Cloud STT)

```typescript
// whisper_subagent.ts
import * as Whisper from "@xenova/transformers/dist/transformers.min";

class WhisperSubagent {
  private processor: any;
  private model: any;
  private config: WhisperConfig;

  constructor(config: WhisperConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const { AutoProcessor, AutoModelForSpeechSeq2Seq } = Whisper;

    this.processor = await AutoProcessor.from_pretrained(
      this.config.modelSize
    );

    this.model = await AutoModelForSpeechSeq2Seq.from_pretrained(
      this.config.modelSize
    );
  }

  async transcribe(input: {
    audioPath: string;
    language?: string;
    returnTimestamps?: boolean;
  }): Promise<{
    text: string;
    segments: TranscriptionSegment[];
    language: string;
  }> {
    const audio = await this.loadAudio(input.audioPath);
    const inputs = await this.processor(audio);
    const outputs = await this.model.generate(**inputs);
    const decoded = await this.processor.batch_decode(outputs, {
      skip_special_tokens: true,
    });

    const text = decoded[0];
    const segments = await this.extractSegments(
      audio,
      outputs,
      input.returnTimestamps
    );

    return { text, segments, language: input.language || "auto" };
  }

  async speechRoughCut(input: {
    videoPath: string;
    systemPrompt: string;
  }): Promise<SpeechRoughCutOutput> {
    const audioPath = await this.extractAudio(input.videoPath);
    const transcription = await this.transcribe({
      audioPath,
      returnTimestamps: true,
    });

    return {
      segments: transcription.segments,
      transcript: transcription.text,
    };
  }

  private async loadAudio(path: string): Promise<Float32Array> {
    // Load WAV/MP3 and convert to PCM float32
  }

  private async extractAudio(videoPath: string): Promise<string> {
    // Use ffmpeg to extract audio stream
  }

  private async extractSegments(
    audio: Float32Array,
    outputs: any,
    returnTimestamps: boolean
  ): Promise<TranscriptionSegment[]> {
    // Parse Whisper output into timestamped segments
  }
}

interface WhisperConfig {
  modelSize: "tiny" | "base" | "small" | "medium" | "large";
  device?: "auto" | "cpu" | "gpu";
}

interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}
```

---

## 🎬 Remotion-Engine Integration

### **1. Overview of @neox/remotion-engine**

The **remotion-engine** is a render-only Remotion kernel that:
- **No AI generation**: Stream tree is pure data structure (no `prompts.*` fields)
- **No composition layer**: Host provides `Container` component + components registry
- **Zod-validated**: Strict schema validation for stream trees
- **Immer patches**: Mutations via JSON Patches from host
- **Stream types**: `root`, `folder`, `video`, `audio`, `image`, `subtitle`, `component`
- **Multi-aspect rendering**: Single source → 16x9, 9x16, 1x1 outputs

### **2. Timeline Builder Subagent**

```typescript
// timeline_render_subagent.ts
import { RemotionEngine } from "@neox/remotion-engine";
import type { Root, Stream } from "@neox/remotion-engine";

class TimelineRenderSubagent {
  private remotion: typeof RemotionEngine;
  private config: RenderConfig;

  constructor(config: RenderConfig) {
    this.config = config;
  }

  async buildTimeline(input: {
    clips: ClipInfo[];
    voiceovers: VoiceoverSegment[];
    bgm: AudioAsset;
    transitions?: TransitionEffect[];
    textElements?: TextElement[];
    theme?: string;
  }): Promise<Root> {
    // Build Remotion stream tree from editing components

    const streamTree: Root = {
      id: "root",
      type: "root",
      width: this.config.width,
      height: this.config.height,
      fps: this.config.fps,
      isSeries: true,
      transition: input.transitions?.[0]?.type || "fade",
      transitionTime: 0.4,
      stylesheet: this.buildStylesheet(input.theme),
      children: await this.buildChildren(input),
    };

    return streamTree;
  }

  private async buildChildren(input: {
    clips: ClipInfo[];
    voiceovers: VoiceoverSegment[];
    bgm: AudioAsset;
    textElements?: TextElement[];
  }): Promise<Stream[]> {
    const children: Stream[] = [];
    let currentTime = 0;

    for (const clip of input.clips) {
      const folder: any = {
        id: clip.id,
        type: "folder",
        isSeries: false,
        children: [],
      };

      // Add video layer
      folder.children.push({
        id: `${clip.id}-video`,
        type: "video",
        src: clip.path,
        fit: "cover",
        actions: [{ id: "a1", start: currentTime, end: currentTime + clip.duration }],
      });

      // Add text overlay if present
      const relevantText = input.textElements?.filter(
        (t) => t.groupId === clip.groupId
      );
      
      if (relevantText && relevantText.length > 0) {
        for (const text of relevantText) {
          folder.children.push({
            id: `${clip.id}-text-${text.id}`,
            type: "subtitle",
            src: text.content,
            fontSize: text.fontSize || 48,
            color: text.color || "#FFFFFF",
            actions: [
              { id: `a-${text.id}`, start: currentTime, end: currentTime + clip.duration }
            ],
          });
        }
      }

      children.push(folder);
      currentTime += clip.duration;
    }

    // Add background music as separate stream
    if (input.bgm) {
      children.push({
        id: "bgm",
        type: "audio",
        src: input.bgm.path,
        actions: [{ id: "bgm-a1", start: 0, end: currentTime }],
      });
    }

    // Add voiceover tracks
    for (const vo of input.voiceovers) {
      children.push({
        id: `voiceover-${vo.groupId}`,
        type: "audio",
        src: vo.audioPath,
        actions: [
          { id: `vo-a-${vo.groupId}`, start: vo.startTime || 0, end: (vo.startTime || 0) + vo.duration }
        ],
      });
    }

    return children;
  }

  private buildStylesheet(theme?: string): string {
    // Generate CSS stylesheet for Remotion rendering
    const baseStyle = `.root { background: #000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }`;
    
    if (theme === "dark") {
      return baseStyle + ` .subtitle { color: #fff; }`;
    } else if (theme === "light") {
      return baseStyle + ` .subtitle { color: #000; background: rgba(255,255,255,0.8); }`;
    }
    
    return baseStyle;
  }

  async render(
    streamTree: Root,
    outputPath: string,
    aspectRatios?: ("16x9" | "9x16" | "1x1")[]
  ): Promise<RenderResult> {
    // Render video using remotion-engine CLI

    const formats = aspectRatios || ["16x9"];
    const results: RenderResult[] = [];

    for (const aspect of formats) {
      const { width, height } = this.getAspectDimensions(aspect);
      
      const renderedPath = await this.renderWithRemotionCLI(
        streamTree,
        outputPath,
        width,
        height,
        this.config.fps,
        this.config.bitrate
      );

      results.push({
        aspect,
        width,
        height,
        path: renderedPath,
        duration: this.calculateDuration(streamTree),
      });
    }

    return {
      success: true,
      outputs: results,
      streamTree,
    };
  }

  private async renderWithRemotionCLI(
    streamTree: Root,
    outputPath: string,
    width: number,
    height: number,
    fps: number,
    bitrate: string
  ): Promise<string> {
    // Invoke: remotion render src/remotion.config.ts Root output.mp4 --props=./stream-tree.json
    
    const propsFile = `${this.config.cacheDir}/${generateUUID()}-props.json`;
    await fs.writeJSON(propsFile, { root: streamTree }, { spaces: 2 });

    const finalPath = outputPath.replace(
      /\.mp4$/,
      `-${width}x${height}.mp4`
    );

    await execa("remotion", [
      "render",
      "src/remotion.config.ts",
      "Root",
      finalPath,
      `--props=${propsFile}`,
      `--width=${width}`,
      `--height=${height}`,
      `--fps=${fps}`,
      `--every-nth-frame=1`,
      `--overwrite`,
    ]);

    return finalPath;
  }

  private getAspectDimensions(aspect: string): { width: number; height: number } {
    const dims: Record<string, { width: number; height: number }> = {
      "16x9": { width: 1920, height: 1080 },
      "9x16": { width: 1080, height: 1920 },
      "1x1": { width: 1080, height: 1080 },
    };
    return dims[aspect] || dims["16x9"];
  }

  private calculateDuration(streamTree: Root): number {
    // Calculate total duration from stream tree
    let maxTime = 0;
    const walk = (node: any) => {
      if (node.children) {
        for (const child of node.children) {
          if (child.actions) {
            for (const action of child.actions) {
              maxTime = Math.max(maxTime, action.end);
            }
          }
          walk(child);
        }
      }
    };
    walk(streamTree);
    return maxTime / (streamTree.fps || 30);
  }
}

interface RenderConfig {
  width: number;
  height: number;
  fps: number;
  bitrate: string;
  cacheDir: string;
}

interface RenderResult {
  success: boolean;
  outputs: Array<{
    aspect: "16x9" | "9x16" | "1x1";
    width: number;
    height: number;
    path: string;
    duration: number;
  }>;
  streamTree: Root;
}
```

### **3. Integration with Workflow**

```typescript
// Build timeline stage in skill workflow
const buildTimelineTask = {
  id: "build_timeline",
  name: "Build Remotion Stream Tree",
  subagentType: "timeline_render",
  execute: async (context: ExecutionContext) => {
    const timelineBuilder = new TimelineRenderSubagent({
      width: 1080,
      height: 1920,
      fps: 30,
      bitrate: "5000k",
      cacheDir: context.cacheDir,
    });

    // Collect outputs from previous stages
    const clips = context.getStageOutput("filter_clips")?.clips || [];
    const voiceovers = context.getStageOutput("generate_voiceover")?.segments || [];
    const bgm = context.getStageOutput("select_bgm")?.selectedMusic;
    const textElements = context.getStageOutput("elementrec_text")?.elements || [];

    // Build stream tree
    const streamTree = await timelineBuilder.buildTimeline({
      clips,
      voiceovers,
      bgm,
      textElements,
      theme: context.theme,
    });

    // Store for rendering stage
    return {
      streamTree,
      duration: timelineBuilder.calculateDuration(streamTree),
    };
  },
};

// Render stage
const renderVideoTask = {
  id: "render_video",
  name: "Render Video (Remotion Engine)",
  subagentType: "timeline_render",
  execute: async (context: ExecutionContext) => {
    const timelineBuilder = new TimelineRenderSubagent({
      width: 1080,
      height: 1920,
      fps: 30,
      bitrate: "5000k",
      cacheDir: context.cacheDir,
    });

    const { streamTree } = context.getStageOutput("build_timeline");

    // Render with aspect ratio options
    const result = await timelineBuilder.render(
      streamTree,
      `${context.outputDir}/video.mp4`,
      ["16x9", "9x16"]  // Multi-aspect output
    );

    return {
      success: result.success,
      outputs: result.outputs,
      streamTree: result.streamTree,
    };
  },
};
```

### **4. Remotion-Engine Stream Tree Example**

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
  "stylesheet": ".subtitle { font-family: Arial; color: #fff; font-size: 48px; }",
  "children": [
    {
      "id": "scene-1",
      "type": "folder",
      "isSeries": false,
      "children": [
        {
          "id": "bg-1",
          "type": "image",
          "src": "/media/thumbnail.jpg",
          "fit": "cover",
          "actions": [{ "id": "a1", "start": 0, "end": 3 }]
        },
        {
          "id": "title-1",
          "type": "subtitle",
          "src": "Welcome to my vlog",
          "fontSize": 72,
          "color": "#FFFFFF",
          "actions": [{ "id": "a2", "start": 0, "end": 3 }]
        }
      ]
    },
    {
      "id": "voiceover-1",
      "type": "audio",
      "src": "/audio/voiceover-1.wav",
      "actions": [{ "id": "vo1", "start": 0, "end": 3 }]
    },
    {
      "id": "bgm",
      "type": "audio",
      "src": "/audio/background-music.mp3",
      "actions": [{ "id": "bgm-a", "start": 0, "end": 60 }]
    }
  ]
}
```

---

## 🔄 Implementation Roadmap

### **Phase 1: Foundation** (Weeks 1-2)

- [ ] Design skill system & workflow stages
- [ ] Implement SkillDefinition TypeScript interface
- [ ] Create prompt template engine with Handlebars
- [ ] Set up pi-subagents basic orchestration

**Deliverables:**
- `src/skills/skill.ts`
- `src/prompt/promptEngine.ts`
- `src/orchestrator/orchestrator.ts`

### **Phase 2: MLX Integration** (Weeks 3-4)

- [ ] Implement MLXVLMSubagent (vision understanding)
- [ ] Implement MLXAudioSubagent (text-to-speech)
- [ ] Implement WhisperSubagent (speech-to-text)
- [ ] Test local inference pipeline

**Deliverables:**
- `src/subagents/mlx_vlm_subagent.ts`
- `src/subagents/mlx_audio_subagent.ts`
- `src/subagents/whisper_subagent.ts`

### **Phase 3: Remotion-Engine Integration** (Weeks 5-6)

- [ ] Create TimelineRenderSubagent
- [ ] Build stream tree builder from editing outputs
- [ ] Integrate with remotion CLI
- [ ] Multi-aspect rendering support

**Deliverables:**
- `src/subagents/timeline_render_subagent.ts`
- `src/timeline/builder.ts`
- Remotion config for Pi package

### **Phase 4: Skill Implementations** (Weeks 7-8)

- [ ] Adapt `default_editing_workflow_skill` to Pi format
- [ ] Adapt `speech_rough_cut_skill`
- [ ] Adapt `ai_transition_editing_skill`
- [ ] Create capability skills

**Deliverables:**
- `.storyline/skills/*/SKILL.md` + `stages.json`
- Prompt templates in `prompts/tasks/`

### **Phase 5: Integration & Testing** (Weeks 9-10)

- [ ] End-to-end workflow testing
- [ ] Performance optimization
- [ ] Error recovery & fallback strategies
- [ ] Documentation & examples

**Deliverables:**
- `README.md` with setup instructions
- Integration tests
- Performance benchmarks
- Example projects

---

## 📂 Project Structure

```
pi-video-editing-agent/
├── src/
│   ├── index.ts
│   ├── orchestrator/
│   │   ├── orchestrator.ts          # Main Pi agent
│   │   ├── skillManager.ts          # Skill loading & validation
│   │   └── executionContext.ts      # Session state
│   │
│   ├── skills/
│   │   ├── skill.ts                 # SkillDefinition interface
│   │   ├── skillRegistry.ts         # Global skill catalog
│   │   └── loader.ts                # YAML/JSON loader
│   │
│   ├── prompt/
│   │   ├── promptEngine.ts          # Template rendering
│   │   ├── variableValidator.ts     # Schema validation
│   │   └── loader.ts                # Load from prompts/
│   │
│   ├── subagents/
│   │   ├── types.ts                 # Subagent interfaces
│   │   ├── pool.ts                  # Subagent pooling
│   │   ├── llm_subagent.ts          # LLM wrapper
│   │   ├── mlx_vlm_subagent.ts      # Vision model
│   │   ├── mlx_audio_subagent.ts    # TTS model
│   │   ├── whisper_subagent.ts      # STT model
│   │   └── timeline_render_subagent.ts  # Remotion-engine render
│   │
│   ├── executor/
│   │   ├── chainExecutor.ts         # Sequential @pi-subagents/chain
│   │   ├── parallelExecutor.ts      # Parallel @pi-subagents/parallel
│   │   └── conditionalExecutor.ts   # Conditional branching
│   │
│   ├── timeline/
│   │   ├── builder.ts               # Stream tree construction
│   │   ├── converter.ts             # Adapt editing outputs to Remotion
│   │   └── remotion.config.ts       # Remotion root config
│   │
│   ├── storage/
│   │   ├── sessionStore.ts          # Session persistence
│   │   ├── assetManager.ts          # Media file management
│   │   └── artifactStore.ts         # Intermediate outputs
│   │
│   └── config/
│       ├── config.ts                # Config schema
│       └── defaults.ts              # Default values
│
├── prompts/                         # Copied from FireRed
│   ├── system/
│   ├── skills/
│   ├── tasks/
│   └── templates/
│
├── .storyline/                      # Local models & skills
│   ├── models/                      # Quantized MLX models
│   ├── skills/                      # Skill definitions
│   └── cache/                       # Generated artifacts
│
├── examples/
│   ├── basic_vlog.ts               # Basic workflow
│   ├── speech_rough_cut.ts         # Speech editing
│   ├── multi_aspect_render.ts      # Multi-aspect Remotion render
│   └── parallel_tasks.ts           # Parallel execution
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── package.json
├── tsconfig.json
├── README.md
└── PI_PACKAGE_DESIGN.md            # This file
```

---

## 🚀 Getting Started

### **Installation**

```bash
npm install @nicobailon/pi-subagents mlx-vlm mlx-audio @xenova/transformers @neox/remotion-engine remotion
npm install --save-dev typescript @types/node
```

### **Configuration**

```typescript
// .env
MLX_DEVICE=auto
WHISPER_MODEL_SIZE=base
VOICEOVER_VOICE=en_US_1
VLOG_OUTPUT_DIR=./outputs
REMOTION_CACHE_DIR=./.remotion-cache
```

### **Basic Example**

```typescript
import { Orchestrator } from "./src/orchestrator";
import { SkillRegistry } from "./src/skills/skillRegistry";

async function main() {
  // Initialize orchestrator
  const orchestrator = new Orchestrator({
    modelDir: "./.storyline/models",
    promptDir: "./prompts",
    cacheDir: "./.storyline/cache",
  });

  await orchestrator.initialize();

  // Load skill
  const registry = new SkillRegistry("./storyline/skills");
  const skill = await registry.loadSkill("default_editing_workflow_skill");

  // Execute workflow
  const result = await orchestrator.executeSkill(skill, {
    mediaFiles: ["./videos/travel.mp4"],
    userRequest: "Create a travel vlog with daily mumbling style",
    style: "Daily Mumbling",
    includeVoiceover: true,
    voice: "en_US_1",
    aspectRatios: ["16x9", "9x16"],  // Multi-aspect render
  });

  console.log("✅ Vlog generated:", result.outputs);
  result.outputs.forEach(output => {
    console.log(`  - ${output.aspect}: ${output.path}`);
  });
}

main().catch(console.error);
```

---

## 🔗 References to FireRed & Remotion Architecture

| FireRed Component | Pi Equivalent | Remotion-Engine Role |
|-------------------|---------------|-------------------|
| `NodeManager` | `SkillManager` | Stream tree dependency tracking |
| `LangChain Agent` | `Orchestrator` + `@pi-subagents` | Multi-turn orchestration |
| `MCP Tools` | `Subagent` types | Capability modules (MLX, Whisper) |
| `/prompts/tasks/` | `PromptTemplateEngine` | Handlebars rendering |
| `Skills (SKILL.md)` | `SkillDefinition` interface | Reusable workflow definitions |
| `ClientContext` | `ExecutionContext` | Session-scoped state |
| `ArtifactStore` | `AssetManager` | Intermediate outputs |
| `MoviePy rendering` | **@neox/remotion-engine** | **React-based stream trees → MP4** |
| `plan_timeline` | `TimelineRenderSubagent` | Build Remotion JSON stream tree |
| `render_video` | `remotion render CLI` | Invoke Remotion Engine headless |

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| **VLM inference** (per clip) | < 2s (on GPU) |
| **TTS generation** (per 100 words) | < 5s (on GPU) |
| **STT transcription** (per minute) | < 10s (base model) |
| **Timeline building** (100 clips) | < 5s |
| **Remotion render** (5-min video, 1080p) | < 10 mins (GPU accelerated) |
| **Full workflow** (5-min video) | < 30 mins (end-to-end) |
| **Memory footprint** | < 16GB (quantized models + cache) |

---

## 🤝 Contributing

This design bridges FireRed's sophisticated skill system with modern subagent orchestration and Remotion's declarative rendering. Contributions should:

1. Maintain compatibility with FireRed's prompt & skill structure
2. Follow Pi framework conventions for subagent definitions
3. Ensure Remotion stream tree Zod validation
4. Include tests for new subagent types
5. Document prompt templates with variable schemas
6. Maintain multi-aspect rendering support

---

## 📄 License

Aligned with FireRed-OpenStoryline's Apache 2.0 license and lalalic/remotion-engine's terms.

