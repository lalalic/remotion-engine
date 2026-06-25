# Pi Package Implementation: AI Video Editing Agent with MLX CLI & Remotion Render Engine

**Project**: FireRed-OpenStoryline Pi Package  
**Status**: Design Document  
**Last Updated**: 2026-06-25  
**Render Engine**: `lalalic/remotion-engine` (Remotion 4.x stream-tree kernel)  
**AI Models**: MLX CLI tools (`mlx-vlm`, `mlx-audio`, `whisper` CLI)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Skill System](#skill-system)
5. [Subagent Coordination](#subagent-coordination)
6. [Prompt Template System](#prompt-template-system)
7. **[MLX CLI Integration](#mlx-cli-integration)** ⭐ NEW
8. [Remotion-Engine Integration](#remotion-engine-integration)
9. [Implementation Roadmap](#implementation-roadmap)

---

## 🎯 Overview

### Objective
Implement a **Pi package** that adapts FireRed-OpenStoryline's skill-based video editing workflow using:
- **@nicobailon/pi-subagents** for parallel & sequential task orchestration
- **MLX CLI tools** (`mlx-vlm`, `mlx-audio`, `whisper`) for local AI inference (no Python SDKs)
- **Remotion CLI** for video rendering (replacing MoviePy)
- **Task-driven prompt templates** (referencing FireRed's prompt structure)

### Key Innovations

| Aspect | FireRed | Pi Package |
|--------|---------|-----------|
| **LLM Framework** | LangChain agents | Pi framework with subagents |
| **Vision Model** | Cloud VLM (API) | MLX CLI (`mlx-vlm serve` + REST API) |
| **Audio I/O** | Cloud TTS/STT | MLX CLI (`mlx-audio tts`) + Whisper CLI |
| **Render Engine** | MoviePy + FFmpeg | Remotion CLI (stream trees → MP4) |
| **Task Routing** | NodeManager + Skills | Pi Subagents + Skill definitions |
| **Prompts** | Markdown task prompts | Template engine with Skill metadata |
| **Execution** | Sequential tools | Chain & Parallel subagent execution |
| **AI Integration** | SDK/Library | **CLI via spawn/exec** |

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
   │  MLX CLI        │     │ Workflow Stage   │    │ Timeline Render  │
   │  Subagents      │     │ Subagents        │    │ Subagent         │
   │                 │     │                  │    │ (@neox/remotion- │
   │ • mlx-vlm serve │     │ • Load media     │    │  engine)         │
   │   (REST API)    │     │ • Understand     │    │                  │
   │ • mlx-audio tts │     │ • Filter/Group   │    │ • Build JSON     │
   │ • whisper STT   │     │ • Generate text  │    │   stream tree    │
   │ • spawn/exec    │     │ • Generate voice │    │ • Render to MP4  │
   │   CLI           │     │ • Select music   │    │ • Multi-aspect   │
   └─────────────────┘     └──────────────────┘    └──────────────────┘
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
  dependencies?: Record<string, string[]>;
  
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
  
  operation: {
    type: "parallel" | "sequential" | "conditional";
    tasks: TaskDefinition[];
  };

  optional: boolean;
  requires?: string[];
  outputSchema?: Record<string, unknown>;
  outputToTimeline?: boolean;
}

interface TaskDefinition {
  id: string;
  name: string;
  
  // Execution via subagent
  subagentType: "llm" | "mlx_vlm_cli" | "mlx_audio_cli" | "whisper_cli" | "timeline_render" | "node_exec";
  
  // Prompt template with substitutions
  promptKey: string;
  
  // Parameter mapping
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
}
```

### 2. **Prompt Template Engine**

Structure mirroring FireRed's `/prompts` directory:

```
prompts/
├── system/
│   ├── instruction.md
│   └── skill_router.md
│
├── skills/
│   ├── default_editing_workflow/
│   │   ├── SKILL.md
│   │   └── stages.json
│
├── tasks/
│   ├── understand_clips/
│   │   ├── en/system.md
│   │   └── zh/system.md
│   │
│   ├── generate_voiceover/
│   │   ├── en/config.json
│   │   └── zh/config.json
│   │
│   └── build_timeline/
│       ├── en/system.md
│       └── remotion_schema.json
│
└── templates/
    └── task_prompt_template.hbs
```

### 3. **Subagent Types**

```typescript
type SubagentType = 
  | "llm"                    // Main LLM for orchestration
  | "mlx_vlm_cli"            // MLX VLM via CLI + REST API
  | "mlx_audio_cli"          // MLX Audio TTS via CLI
  | "whisper_cli"            // Whisper STT via CLI
  | "timeline_render"        // Remotion Engine render
  | "node_exec";             // Node.js execution
```

---

## 🎨 Skill System

### **Example: `default_editing_workflow_skill`**

```yaml
# .storyline/skills/default_editing_workflow_skill/SKILL.md
---
name: default_editing_workflow_skill
type: WORKFLOW
description: Universal vlog editing workflow using MLX CLI & Remotion
version: 1.0.0
tags: [vlog, editing, general]
renderOutput:
  formats: [mp4, webm]
  aspectRatios: [16x9, 9x16, 1x1]
  fps: 30
  bitrate: "5000k"
---

# stages.json
{
  "stages": [
    {
      "id": "understanding",
      "name": "Media Understanding & Analysis",
      "operation": {
        "type": "sequential",
        "tasks": [
          {
            "id": "understand_clips",
            "name": "Content Understanding (MLX-VLM)",
            "subagentType": "mlx_vlm_cli",
            "promptKey": "understand_clips/en/system_detail",
            "optional": true
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
            "promptKey": "generate_script/en/system"
          },
          {
            "id": "generate_voiceover",
            "name": "Voiceover Generation (MLX-Audio)",
            "subagentType": "mlx_audio_cli",
            "promptKey": "generate_voiceover/en/config"
          }
        ]
      }
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
            "promptKey": "build_timeline/en/system"
          },
          {
            "id": "render_video",
            "name": "Render Video (Remotion Engine)",
            "subagentType": "timeline_render",
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
import { chain } from "@nicobailon/pi-subagents";

const mediaToScript = chain([
  {
    id: "understand_clips",
    agent: mlxVLMCLISubagent,
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
import { parallel } from "@nicobailon/pi-subagents";

const contentEnhancement = parallel([
  {
    id: "select_bgm",
    agent: llmSubagent,
    prompt: await loadPrompt("select_bgm/en/system"),
    input: { groupInfo, mood: context.mood }
  },
  {
    id: "generate_voiceover",
    agent: mlxAudioCLISubagent,
    prompt: await loadPrompt("generate_voiceover/en/config"),
    input: { scripts: scripts, voice: "en_US_1" }
  }
]);

const [bgm, voiceover] = await contentEnhancement.execute();
```

---

## 🎯 MLX CLI Integration

### **1. MLX-VLM Subagent (CLI-based)**

MLX-VLM provides command-line tools for vision-language model inference.

#### **CLI Usage**

```bash
# Start MLX-VLM server (REST API)
mlx-vlm serve --model phi-3-vision-128k-instruct --port 8000

# Or direct CLI for inference
mlx-vlm predict --model phi-3-vision-128k-instruct \
  --image ./clip-1.jpg \
  --prompt "Describe this video frame in 100 words..."
```

#### **Subagent Implementation** (Node.js wrapper)

```typescript
// src/subagents/mlx_vlm_cli_subagent.ts

import { spawn } from "child_process";
import axios from "axios";

class MLXVLMCLISubagent {
  private apiUrl: string;
  private modelName: string;
  private serverProcess: ChildProcess | null = null;
  private config: MLXVLMCLIConfig;

  constructor(config: MLXVLMCLIConfig) {
    this.apiUrl = config.apiUrl || "http://localhost:8000";
    this.modelName = config.modelName || "phi-3-vision-128k-instruct";
    this.config = config;
  }

  /**
   * Start MLX-VLM server
   */
  async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        "serve",
        "--model",
        this.modelName,
        "--port",
        this.config.port?.toString() || "8000",
      ];

      if (this.config.device) {
        args.push("--device", this.config.device);
      }
      if (this.config.quantization) {
        args.push("--quantization", this.config.quantization);
      }

      this.serverProcess = spawn("mlx-vlm", args);

      this.serverProcess.stdout?.on("data", (data) => {
        const output = data.toString();
        if (output.includes("Server running") || output.includes("listening")) {
          // Wait for server to fully initialize
          setTimeout(resolve, 1000);
        }
      });

      this.serverProcess.stderr?.on("data", (data) => {
        console.error(`MLX-VLM stderr: ${data}`);
      });

      this.serverProcess.on("error", (err) => {
        reject(new Error(`Failed to start MLX-VLM server: ${err.message}`));
      });

      // Safety timeout
      setTimeout(() => resolve(), 5000);
    });
  }

  /**
   * Call MLX-VLM via REST API (server must be running)
   */
  async execute(input: {
    images: string[];  // Local file paths
    prompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    response: string;
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Convert image to base64
      const imageData = await Promise.all(
        input.images.map(async (path) => {
          const buffer = await fs.readFile(path);
          return buffer.toString("base64");
        })
      );

      // Call MLX-VLM REST endpoint
      const response = await axios.post(
        `${this.apiUrl}/v1/chat/completions`,
        {
          model: this.modelName,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: input.prompt,
                },
                ...imageData.map((data) => ({
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${data}`,
                  },
                })),
              ],
            },
          ],
          temperature: input.temperature ?? 0.7,
          max_tokens: input.maxTokens ?? 512,
        },
        {
          timeout: 60000,
        }
      );

      return {
        response: response.data.choices[0].message.content,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`MLX-VLM API call failed: ${error.message}`);
    }
  }

  /**
   * Understand a single clip
   */
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

  /**
   * Shutdown server
   */
  async shutdown(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }
}

interface MLXVLMCLIConfig {
  modelName?: string;
  apiUrl?: string;
  port?: number;
  device?: "auto" | "cpu" | "gpu";
  quantization?: "4-bit" | "8-bit";
}
```

#### **Task Execution**

```typescript
// Task: understand_clips
const understandClipsTask = {
  id: "understand_clips",
  name: "Content Understanding",
  subagentType: "mlx_vlm_cli",
  execute: async (context: ExecutionContext) => {
    const vlmAgent = new MLXVLMCLISubagent({
      modelName: "phi-3-vision-128k-instruct",
      port: 8000,
      device: "auto",
    });

    // Start server if not already running
    await vlmAgent.startServer();

    const clips = context.getMediaClips();
    const systemPrompt = await context.loadPrompt("understand_clips/en/system_detail");

    const captions: Record<string, any> = {};

    for (const clip of clips) {
      const result = await vlmAgent.understandClip(clip.path, systemPrompt);
      captions[clip.id] = result;
    }

    await vlmAgent.shutdown();

    return {
      captions,
      clipCount: clips.length,
    };
  },
};
```

---

### **2. MLX-Audio Subagent (CLI-based)**

MLX-Audio provides CLI tools for text-to-speech synthesis.

#### **CLI Usage**

```bash
# Generate speech from text
mlx-audio tts \
  --model Kokoro-82M \
  --text "Welcome to my vlog" \
  --voice en_US_1 \
  --output voice-1.wav \
  --speed 1.0 \
  --pitch 1.0

# Batch TTS
mlx-audio tts \
  --model Kokoro-82M \
  --input-file scripts.json \
  --output-dir ./voiceovers/ \
  --voice en_US_1
```

#### **Subagent Implementation**

```typescript
// src/subagents/mlx_audio_cli_subagent.ts

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";

class MLXAudioCLISubagent {
  private modelName: string;
  private config: MLXAudioCLIConfig;

  constructor(config: MLXAudioCLIConfig) {
    this.modelName = config.modelName || "Kokoro-82M";
    this.config = config;
  }

  /**
   * Generate speech via MLX-Audio CLI
   */
  async synthesize(input: {
    text: string;
    voice?: string;
    speed?: number;
    pitch?: number;
    outputPath: string;
  }): Promise<{ audioPath: string; duration: number }> {
    return new Promise((resolve, reject) => {
      const args = [
        "tts",
        "--model",
        this.modelName,
        "--text",
        input.text,
        "--voice",
        input.voice || this.config.defaultVoice || "en_US_1",
        "--output",
        input.outputPath,
        "--speed",
        (input.speed || 1.0).toString(),
        "--pitch",
        (input.pitch || 1.0).toString(),
      ];

      if (this.config.device) {
        args.push("--device", this.config.device);
      }

      const process = spawn("mlx-audio", args);
      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", async (code) => {
        if (code === 0) {
          try {
            // Try to extract duration from output or use ffprobe
            const duration = await this.getAudioDuration(input.outputPath);
            resolve({
              audioPath: input.outputPath,
              duration,
            });
          } catch (err) {
            reject(new Error(`Failed to get audio duration: ${err.message}`));
          }
        } else {
          reject(new Error(`MLX-Audio TTS failed: ${stderr}`));
        }
      });

      process.on("error", (err) => {
        reject(new Error(`Failed to spawn mlx-audio: ${err.message}`));
      });
    });
  }

  /**
   * Batch TTS using input file
   */
  async synthesizeBatch(input: {
    inputFile: string;  // JSON file with [{id, text, voice, ...}, ...]
    outputDir: string;
    voice?: string;
    speed?: number;
    pitch?: number;
  }): Promise<Array<{ id: string; audioPath: string; duration: number }>> {
    return new Promise((resolve, reject) => {
      const args = [
        "tts",
        "--model",
        this.modelName,
        "--input-file",
        input.inputFile,
        "--output-dir",
        input.outputDir,
        "--voice",
        input.voice || this.config.defaultVoice || "en_US_1",
        "--speed",
        (input.speed || 1.0).toString(),
        "--pitch",
        (input.pitch || 1.0).toString(),
      ];

      if (this.config.device) {
        args.push("--device", this.config.device);
      }

      const process = spawn("mlx-audio", args);
      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", async (code) => {
        if (code === 0) {
          try {
            // Read input file to map IDs
            const inputData = JSON.parse(await fs.readFile(input.inputFile, "utf-8"));
            const results = [];

            for (const item of inputData) {
              const audioFile = `${input.outputDir}/${item.id || item.text.slice(0, 20)}.wav`;
              const duration = await this.getAudioDuration(audioFile);

              results.push({
                id: item.id || item.text.slice(0, 20),
                audioPath: audioFile,
                duration,
              });
            }

            resolve(results);
          } catch (err) {
            reject(new Error(`Failed to process batch output: ${err.message}`));
          }
        } else {
          reject(new Error(`MLX-Audio batch TTS failed: ${stderr}`));
        }
      });

      process.on("error", (err) => {
        reject(new Error(`Failed to spawn mlx-audio: ${err.message}`));
      });
    });
  }

  /**
   * Get audio duration using ffprobe
   */
  private async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const process = spawn("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1:nofile=1",
        audioPath,
      ]);

      let duration = "";

      process.stdout?.on("data", (data) => {
        duration += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve(parseFloat(duration.trim()));
        } else {
          reject(new Error("ffprobe failed"));
        }
      });

      process.on("error", (err) => {
        reject(err);
      });
    });
  }
}

interface MLXAudioCLIConfig {
  modelName?: string;
  defaultVoice?: string;
  device?: "auto" | "cpu" | "gpu";
}
```

#### **Task Execution**

```typescript
// Task: generate_voiceover
const generateVoiceoverTask = {
  id: "generate_voiceover",
  name: "Voiceover Generation",
  subagentType: "mlx_audio_cli",
  execute: async (context: ExecutionContext) => {
    const audioAgent = new MLXAudioCLISubagent({
      modelName: "Kokoro-82M",
      defaultVoice: context.voicePreference || "en_US_1",
      device: "auto",
    });

    const scripts = context.getStageOutput("generate_script");
    const outputDir = path.join(context.cacheDir, "voiceovers");

    // Prepare batch input file
    const batchInput = scripts.map((script, idx) => ({
      id: `vo-${script.groupId}`,
      text: script.raw_text,
      voice: context.voicePreference || "en_US_1",
    }));

    const inputFile = path.join(context.cacheDir, "tts-batch.json");
    await fs.writeFile(inputFile, JSON.stringify(batchInput, null, 2));

    // Run batch TTS
    const results = await audioAgent.synthesizeBatch({
      inputFile,
      outputDir,
      voice: context.voicePreference || "en_US_1",
    });

    return {
      segments: results.map((r) => ({
        groupId: r.id.replace("vo-", ""),
        audioPath: r.audioPath,
        duration: r.duration,
      })),
    };
  },
};
```

---

### **3. Whisper Subagent (CLI-based)**

Whisper provides command-line tools for speech-to-text transcription.

#### **CLI Usage**

```bash
# Transcribe audio file
whisper audio.wav \
  --model base \
  --language en \
  --output_format json \
  --output_dir ./transcripts/

# Transcribe with timestamps
whisper video.mp4 \
  --model base \
  --language auto \
  --verbose False \
  --output_format vtt
```

#### **Subagent Implementation**

```typescript
// src/subagents/whisper_cli_subagent.ts

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";

class WhisperCLISubagent {
  private modelSize: string;
  private config: WhisperCLIConfig;

  constructor(config: WhisperCLIConfig) {
    this.modelSize = config.modelSize || "base";
    this.config = config;
  }

  /**
   * Transcribe audio/video file via Whisper CLI
   */
  async transcribe(input: {
    mediaPath: string;
    language?: string;
    outputDir?: string;
    outputFormat?: "txt" | "json" | "vtt" | "srt";
    verbose?: boolean;
  }): Promise<{
    text: string;
    segments: TranscriptionSegment[];
    language: string;
    duration: number;
  }> {
    const outputDir = input.outputDir || "./.whisper-cache";

    return new Promise((resolve, reject) => {
      const args = [
        input.mediaPath,
        "--model",
        this.modelSize,
        "--language",
        input.language || "auto",
        "--output_format",
        input.outputFormat || "json",
        "--output_dir",
        outputDir,
        "--verbose",
        (input.verbose ?? false).toString(),
      ];

      if (this.config.device === "cuda") {
        args.push("--device", "cuda");
      }

      const process = spawn("whisper", args);
      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", async (code) => {
        if (code === 0) {
          try {
            // Read generated JSON output
            const mediaName = path.basename(input.mediaPath);
            const jsonPath = path.join(
              outputDir,
              `${path.parse(mediaName).name}.json`
            );

            const jsonData = JSON.parse(
              await fs.readFile(jsonPath, "utf-8")
            );

            resolve({
              text: jsonData.text,
              segments: jsonData.segments.map(
                (seg: any) => ({
                  id: seg.id,
                  start: seg.start,
                  end: seg.end,
                  text: seg.text,
                })
              ),
              language: jsonData.language,
              duration: jsonData.duration,
            });
          } catch (err) {
            reject(new Error(`Failed to parse Whisper output: ${err.message}`));
          }
        } else {
          reject(new Error(`Whisper transcription failed: ${stderr}`));
        }
      });

      process.on("error", (err) => {
        reject(new Error(`Failed to spawn whisper: ${err.message}`));
      });
    });
  }

  /**
   * Transcribe with timestamp extraction for rough cut
   */
  async speechRoughCut(input: {
    videoPath: string;
    systemPrompt: string;
  }): Promise<SpeechRoughCutOutput> {
    const transcription = await this.transcribe({
      mediaPath: input.videoPath,
      language: "auto",
      outputFormat: "json",
    });

    // Return segments for processing
    return {
      segments: transcription.segments,
      transcript: transcription.text,
      language: transcription.language,
      duration: transcription.duration,
    };
  }
}

interface WhisperCLIConfig {
  modelSize?: "tiny" | "base" | "small" | "medium" | "large";
  device?: "auto" | "cpu" | "cuda";
}

interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface SpeechRoughCutOutput {
  segments: TranscriptionSegment[];
  transcript: string;
  language: string;
  duration: number;
}
```

#### **Task Execution**

```typescript
// Task: speech_rough_cut
const speechRoughCutTask = {
  id: "speech_rough_cut",
  name: "Speech Rough Cut",
  subagentType: "whisper_cli",
  execute: async (context: ExecutionContext) => {
    const whisperAgent = new WhisperCLISubagent({
      modelSize: "base",
      device: "auto",
    });

    const videoPath = context.mediaPath;
    const systemPrompt = await context.loadPrompt("speech_rough_cut/en/system");

    const result = await whisperAgent.speechRoughCut({
      videoPath,
      systemPrompt,
    });

    return {
      segments: result.segments,
      transcript: result.transcript,
      language: result.language,
    };
  },
};
```

---

## 🎬 Remotion-Engine Integration

### **1. Timeline Builder Subagent**

```typescript
// src/subagents/timeline_render_subagent.ts

import { spawn } from "child_process";
import { promises as fs } from "fs";

class TimelineRenderSubagent {
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
        actions: [
          {
            id: "a1",
            start: currentTime,
            end: currentTime + clip.duration,
          },
        ],
      });

      // Add text overlays
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
              {
                id: `a-${text.id}`,
                start: currentTime,
                end: currentTime + clip.duration,
              },
            ],
          });
        }
      }

      children.push(folder);
      currentTime += clip.duration;
    }

    // Add audio tracks
    if (input.bgm) {
      children.push({
        id: "bgm",
        type: "audio",
        src: input.bgm.path,
        actions: [{ id: "bgm-a1", start: 0, end: currentTime }],
      });
    }

    for (const vo of input.voiceovers) {
      children.push({
        id: `voiceover-${vo.groupId}`,
        type: "audio",
        src: vo.audioPath,
        actions: [
          {
            id: `vo-a-${vo.groupId}`,
            start: vo.startTime || 0,
            end: (vo.startTime || 0) + vo.duration,
          },
        ],
      });
    }

    return children;
  }

  private buildStylesheet(theme?: string): string {
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
    const formats = aspectRatios || ["16x9"];
    const results: RenderResult[] = [];

    for (const aspect of formats) {
      const { width, height } = this.getAspectDimensions(aspect);

      const renderedPath = await this.renderWithRemotionCLI(
        streamTree,
        outputPath,
        width,
        height
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

  /**
   * Invoke remotion CLI for rendering
   */
  private async renderWithRemotionCLI(
    streamTree: Root,
    outputPath: string,
    width: number,
    height: number
  ): Promise<string> {
    const propsFile = `${this.config.cacheDir}/${generateUUID()}-props.json`;
    await fs.writeFile(
      propsFile,
      JSON.stringify({ root: streamTree }, null, 2)
    );

    const finalPath = outputPath.replace(
      /\.mp4$/,
      `-${width}x${height}.mp4`
    );

    return new Promise((resolve, reject) => {
      const args = [
        "render",
        "src/remotion.config.ts",
        "Root",
        finalPath,
        `--props=${propsFile}`,
        `--width=${width}`,
        `--height=${height}`,
        `--fps=${this.config.fps}`,
        "--overwrite",
      ];

      const process = spawn("remotion", args);
      let stderr = "";

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve(finalPath);
        } else {
          reject(new Error(`Remotion render failed: ${stderr}`));
        }
      });

      process.on("error", (err) => {
        reject(new Error(`Failed to spawn remotion: ${err.message}`));
      });
    });
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
  cacheDir: string;
}
```

---

## 📂 Project Structure

```
pi-video-editing-agent/
├── src/
│   ├── index.ts
│   ├── orchestrator/
│   │   ├── orchestrator.ts
│   │   ├── skillManager.ts
│   │   └── executionContext.ts
│   │
│   ├── skills/
│   │   ├── skill.ts
│   │   ├── skillRegistry.ts
│   │   └── loader.ts
│   │
│   ├── prompt/
│   │   ├── promptEngine.ts
│   │   ├── variableValidator.ts
│   │   └── loader.ts
│   │
│   ├── subagents/
│   │   ├── types.ts
│   │   ├── pool.ts
│   │   ├── llm_subagent.ts
│   │   ├── mlx_vlm_cli_subagent.ts    ⭐ CLI-based
│   │   ├── mlx_audio_cli_subagent.ts  ⭐ CLI-based
│   │   ├── whisper_cli_subagent.ts    ⭐ CLI-based
│   │   ├── timeline_render_subagent.ts
│   │   └── cliExecutor.ts              ⭐ Generic CLI executor
│   │
│   ├── executor/
│   │   ├── chainExecutor.ts
│   │   ├── parallelExecutor.ts
│   │   └── conditionalExecutor.ts
│   │
│   ├── timeline/
│   │   ├── builder.ts
│   │   └── remotion.config.ts
│   │
│   ├── storage/
│   │   ├── sessionStore.ts
│   │   ├── assetManager.ts
│   │   └── artifactStore.ts
│   │
│   └── config/
│       ├── config.ts
│       └── defaults.ts
│
├── prompts/
│   ├── system/
│   ├── skills/
│   ├── tasks/
│   └── templates/
│
├── .storyline/
│   ├── skills/
│   └── cache/
│
├── examples/
│   ├── basic_vlog.ts
│   ├── cli_integration_test.ts  ⭐ Test CLI subagents
│   └── multi_aspect_render.ts
│
├── bin/
│   ├── cli.ts                   # Entry point for CLI orchestration
│   └── start-services.sh        # Start MLX/Whisper services
│
├── package.json
├── tsconfig.json
└── PI_PACKAGE_DESIGN.md
```

---

## 🚀 Getting Started

### **1. Installation**

```bash
# Install Node.js dependencies
npm install @nicobailon/pi-subagents axios

# Install MLX CLI tools
pip install mlx-vlm mlx-audio openai-whisper

# Install Remotion CLI
npm install --save-dev remotion @remotion/cli

# Install ffmpeg (for audio duration detection)
# macOS: brew install ffmpeg
# Ubuntu: sudo apt-get install ffmpeg
```

### **2. Start Services**

```bash
#!/bin/bash
# start-services.sh

# Start MLX-VLM server (background)
mlx-vlm serve --model phi-3-vision-128k-instruct --port 8000 &

# Start MLX-Audio server (optional, if using as service)
mlx-audio server --port 8001 &

echo "Services started:"
echo "  MLX-VLM: http://localhost:8000"
echo "  MLX-Audio: http://localhost:8001"
```

### **3. Configuration**

```typescript
// .env
MLX_VLM_API_URL=http://localhost:8000
MLX_VLM_MODEL=phi-3-vision-128k-instruct
MLX_AUDIO_MODEL=Kokoro-82M
WHISPER_MODEL_SIZE=base
VOICEOVER_VOICE=en_US_1
VLOG_OUTPUT_DIR=./outputs
REMOTION_CACHE_DIR=./.remotion-cache
```

### **4. Basic Example**

```typescript
// examples/basic_vlog.ts

import { Orchestrator } from "../src/orchestrator";
import { SkillRegistry } from "../src/skills/skillRegistry";

async function main() {
  const orchestrator = new Orchestrator({
    modelDir: "./.storyline/models",
    promptDir: "./prompts",
    cacheDir: "./.storyline/cache",
    cliMode: true,  // Use CLI-based subagents
  });

  const registry = new SkillRegistry("./storyline/skills");
  const skill = await registry.loadSkill("default_editing_workflow_skill");

  const result = await orchestrator.executeSkill(skill, {
    mediaFiles: ["./videos/travel.mp4"],
    userRequest: "Create a travel vlog with daily mumbling style",
    style: "Daily Mumbling",
    includeVoiceover: true,
    voice: "en_US_1",
    aspectRatios: ["16x9", "9x16"],
  });

  console.log("✅ Vlog generated:");
  result.outputs.forEach((output) => {
    console.log(`  ${output.aspect}: ${output.path}`);
  });
}

main().catch(console.error);
```

### **5. CLI Integration Test**

```bash
# Test MLX-VLM
mlx-vlm serve --model phi-3-vision-128k-instruct --port 8000 &
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"phi-3-vision-128k-instruct","messages":[{"role":"user","content":"test"}]}'

# Test MLX-Audio
mlx-audio tts \
  --model Kokoro-82M \
  --text "Welcome to my vlog" \
  --output test-voice.wav

# Test Whisper
whisper test-audio.wav --model base --output_format json

# Test Remotion
remotion render src/remotion.config.ts Root output.mp4
```

---

## 📊 CLI Command Reference

| Tool | Command | Use Case |
|------|---------|----------|
| **mlx-vlm serve** | Start REST API server | Continuous VLM inference |
| **mlx-vlm predict** | Single inference | Quick image analysis |
| **mlx-audio tts** | Text-to-speech | Generate voiceovers |
| **whisper** | Transcribe audio/video | Extract speech & timestamps |
| **remotion render** | Render video | Build MP4 from stream tree |

---

## 🔄 Implementation Roadmap

### **Phase 1: Foundation** (Weeks 1-2)
- [ ] Skill system & orchestration
- [ ] CLI executor wrapper
- [ ] Prompt template engine

### **Phase 2: CLI Integration** (Weeks 3-4)
- [ ] MLX-VLM CLI subagent
- [ ] MLX-Audio CLI subagent
- [ ] Whisper CLI subagent

### **Phase 3: Remotion Integration** (Weeks 5-6)
- [ ] Timeline builder
- [ ] Stream tree composition
- [ ] Multi-aspect rendering

### **Phase 4: Skill Implementations** (Weeks 7-8)
- [ ] Adapt FireRed skills
- [ ] Test workflows

### **Phase 5: E2E Testing** (Weeks 9-10)
- [ ] End-to-end tests
- [ ] Performance optimization
- [ ] Documentation

---

## 📄 License

Apache 2.0 (aligned with FireRed-OpenStoryline)

