// Shared types for video.json schema. Keep in sync with
// templates/05-video.schema.json.

export type Aspect = "16x9" | "9x16" | "1x1";

export type ComponentName =
    // Classic scene intents (text + optional background)
    | "Hook"
    | "Problem"
    | "Solution"
    | "Feature"
    | "Demo"
    | "Testimonial"
    | "CTA"
    | "Outro"
    // Rich cinematic components (Apple/Stripe style)
    | "BigStatement"
    | "PromptTyping"
    | "ResultFlash"
    | "StepTimeline"
    | "ComparisonSplit"
    | "AgentGraph"
    | "ScreenCapture"
    | "VideoClip";

export type CaptionStyle = "bold-bottom" | "minimal-top" | "karaoke" | "none";
export type BgmIntensity = "silent" | "low" | "mid" | "high";
export type Transition = "fade" | "cut" | "slide-left" | "slide-up" | "zoom";

export interface SceneProps {
    headline: string;
    subhead?: string;
    background?: string | null;
    generated?: string;
    [k: string]: unknown;
}

export interface Caption {
    t: number;
    text: string;
}

export interface Scene {
    id: string;
    start: number;
    duration: number;
    component: ComponentName;
    props: SceneProps;
    voiceover: { audio: string };
    captions: Caption[];
    captionStyle?: CaptionStyle;
    bgmIntensity?: BgmIntensity;
    transitionIn?: Transition;
    transitionOut?: Transition;
}

export interface VideoJson {
    meta: {
        title: string;
        fps: 24 | 30 | 60;
        aspects: Aspect[];
        duration: number | null;
    };
    voiceover: { tts: "edge-tts"; voice: string };
    bgm?: { src: string; baseVolume: number };
    scenes: Scene[];
    _unresolved_assets?: { scene_id: string; asset_hint: string }[];
}

export const ASPECT_DIMS: Record<Aspect, { width: number; height: number }> = {
    "16x9": { width: 1920, height: 1080 },
    "9x16": { width: 1080, height: 1920 },
    "1x1":  { width: 1080, height: 1080 },
};

export const BGM_VOLUME: Record<BgmIntensity, number> = {
    silent: 0,
    low:    0.4,
    mid:    0.8,
    high:   1.2,
};
