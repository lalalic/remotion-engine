/**
 * Sound effects presets for scene transitions and events.
 * These are URL references to royalty-free sound effects.
 *
 * In production, host apps would provide their own SFX URLs.
 * These are placeholder paths that can be overridden via the theme or root.audio config.
 */

export interface SFXConfig {
  transition?: string;  // URL for transition sound
  impact?: string;      // URL for text impact/reveal
  whoosh?: string;      // URL for slide/wipe transitions
  click?: string;       // URL for cursor click
  typing?: string;      // URL for typewriter sound
}

/**
 * Default SFX paths (relative to project assets/).
 * These are optional — if files don't exist, components render silently.
 */
export const defaultSFX: SFXConfig = {
  transition: "assets/sfx/transition.mp3",
  impact: "assets/sfx/impact.mp3",
  whoosh: "assets/sfx/whoosh.mp3",
  click: "assets/sfx/click.mp3",
  typing: "assets/sfx/typing.mp3",
};

/**
 * Merge user SFX config with defaults.
 */
export function resolveSFX(userSFX?: Partial<SFXConfig>): SFXConfig {
  return { ...defaultSFX, ...userSFX };
}
