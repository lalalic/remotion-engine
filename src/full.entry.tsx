/**
 * Full bundle entry. Re-exports lite + built-in components + themes + templates.
 */
export * from "./lite.entry";
export { builtinComponents } from "./components";
export * from "./components";
export { themePresets, resolveTheme, useTheme, ThemeProvider, themeSchema } from "./themes";
export type { Theme, SpringConfig } from "./themes";
export { templates, getTemplate, listTemplates, resolveTemplate, validateSlots, applyDefaults } from "./templates";
export type { TemplateMeta, TemplateSlot } from "./templates";
