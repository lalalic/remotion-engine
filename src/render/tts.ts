/**
 * TTS integration using edge-tts (Microsoft Edge TTS).
 * Generates WAV voiceover files from text.
 *
 * Prerequisites: pip install edge-tts
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

export interface TTSOptions {
  voice?: string;
  rate?: string;  // e.g., "+20%", "-10%"
  volume?: string; // e.g., "+50%"
}

const DEFAULT_VOICE = "en-US-GuyNeural";

/**
 * Generate a WAV file from text using edge-tts.
 * Returns the output file path.
 */
export function generateTTS(
  text: string,
  outputPath: string,
  options: TTSOptions = {},
): string {
  const voice = options.voice ?? DEFAULT_VOICE;
  const rateFlag = options.rate ? `--rate="${options.rate}"` : "";
  const volumeFlag = options.volume ? `--volume="${options.volume}"` : "";

  mkdirSync(dirname(outputPath), { recursive: true });

  // edge-tts outputs mp3 by default, we'll convert to wav for Remotion compatibility
  const mp3Path = outputPath.replace(/\.wav$/, ".mp3");

  const cmd = `edge-tts --voice "${voice}" --text "${text.replace(/"/g, '\\"')}" ${rateFlag} ${volumeFlag} --write-media "${mp3Path}"`;

  try {
    execSync(cmd, { stdio: "pipe" });
  } catch (e: any) {
    console.warn(`TTS failed: ${e.message}. Skipping voiceover.`);
    return "";
  }

  // Convert to WAV using ffmpeg if available
  if (existsSync(mp3Path)) {
    try {
      execSync(`ffmpeg -y -i "${mp3Path}" "${outputPath}" 2>/dev/null`, { stdio: "pipe" });
      execSync(`rm "${mp3Path}"`, { stdio: "pipe" });
    } catch {
      // Keep mp3 if ffmpeg not available
      return mp3Path;
    }
  }

  return existsSync(outputPath) ? outputPath : mp3Path;
}

/**
 * Generate TTS for multiple segments and return an array of file paths.
 */
export function generateTTSBatch(
  segments: Array<{ text: string; id: string }>,
  outputDir: string,
  options: TTSOptions = {},
): Array<{ id: string; path: string }> {
  mkdirSync(outputDir, { recursive: true });

  return segments.map(({ text, id }) => {
    const path = join(outputDir, `${id}.wav`);
    const result = generateTTS(text, path, options);
    return { id, path: result };
  });
}

/**
 * List available TTS voices.
 */
export function listVoices(): string[] {
  try {
    const output = execSync("edge-tts --list-voices 2>/dev/null", { encoding: "utf-8" });
    return output
      .split("\n")
      .filter((l) => l.startsWith("Name:"))
      .map((l) => l.replace("Name: ", "").trim());
  } catch {
    return [];
  }
}
