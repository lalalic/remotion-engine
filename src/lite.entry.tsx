import * as React from "react";
import { AbsoluteFill } from "remotion";
import { ComposeContext, type ComposeContextValue } from "./context/index";
import { ThemeProvider, resolveTheme, type Theme } from "./themes";
import { FolderLeaf } from "./types/Folder";
import { getDurationInSeconds } from "./utils/index";
import { root as rootSchema, type Root } from "./schema/index";

export interface RemotionEngineProps {
  /** Stream tree. Will be parsed by zod (defaults applied). */
  root: unknown;
  /** Optional host-provided Container + components registry. */
  compose?: Partial<ComposeContextValue>;
  /** Background of the canvas. Defaults to black. */
  background?: string;
  /** Theme preset name, theme object, or JSON string. */
  theme?: string | Theme;
}

const DefaultContainer: ComposeContextValue["Container"] = ({ children, style, className }) => (
  <div className={className} style={{ position: "absolute", inset: 0, ...style }}>
    {children}
  </div>
);

export function RemotionEngine({ root, compose, background = "#000", theme }: RemotionEngineProps) {
  const parsed = React.useMemo<Root>(() => rootSchema.parse(root), [root]);

  // engine pre-pass: stamp durationInSeconds onto every node
  React.useMemo(() => getDurationInSeconds(parsed as any, true), [parsed]);

  const resolvedTheme = React.useMemo(
    () => resolveTheme(theme ?? (root as any)?.theme),
    [theme, root],
  );

  const value = React.useMemo<ComposeContextValue>(
    () => ({
      Container: compose?.Container ?? DefaultContainer,
      components: compose?.components ?? {},
      onError: compose?.onError,
    }),
    [compose],
  );

  return (
    <ComposeContext.Provider value={value}>
      <ThemeProvider theme={resolvedTheme}>
        <AbsoluteFill style={{ background: background || resolvedTheme.colors.background }}>
          <FolderLeaf stream={parsed as any} />
        </AbsoluteFill>
      </ThemeProvider>
    </ComposeContext.Provider>
  );
}

export { rootSchema, FolderLeaf };
export * from "./schema/index";
export * from "./context/index";
export { getDurationInSeconds } from "./utils/index";
