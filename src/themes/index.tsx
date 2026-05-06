import * as React from "react";
import type { Theme } from "./schema";
import { themePresets } from "./presets";
import { themeSchema } from "./schema";

const ThemeContext = React.createContext<Theme>(themePresets.cinematic!);

export function useTheme(): Theme {
  return React.useContext(ThemeContext);
}

export function ThemeProvider({
  theme,
  children,
}: {
  theme: Theme;
  children: React.ReactNode;
}) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/**
 * Resolve a theme from a preset name, inline JSON string, or Theme object.
 * Falls back to "cinematic" if unresolvable.
 */
export function resolveTheme(input?: string | Theme | Record<string, unknown>): Theme {
  if (!input) return themePresets.cinematic!;

  // Preset name
  if (typeof input === "string") {
    if (themePresets[input]) return themePresets[input]!;
    // Try parsing as JSON
    try {
      const parsed = JSON.parse(input);
      return themeSchema.parse(parsed);
    } catch {
      return themePresets.cinematic!;
    }
  }

  // Theme object or partial
  try {
    return themeSchema.parse(input);
  } catch {
    return themePresets.cinematic!;
  }
}

export { ThemeContext, themePresets };
export { themeSchema, type Theme, type SpringConfig } from "./schema";
