import type { TemplateMeta } from "./schema";
export { resolveTemplate, validateSlots, applyDefaults, templateMeta, templateSlot } from "./schema";
export type { TemplateMeta, TemplateSlot } from "./schema";

import productHero from "./marketing/product-hero.json";
import featureShowcase from "./marketing/feature-showcase.json";
import beforeAfter from "./marketing/before-after.json";
import socialClip from "./marketing/social-clip.json";
import demoWalkthrough from "./demo/demo-walkthrough.json";

export const templates: Record<string, TemplateMeta> = {
  "product-hero": productHero as unknown as TemplateMeta,
  "feature-showcase": featureShowcase as unknown as TemplateMeta,
  "before-after": beforeAfter as unknown as TemplateMeta,
  "social-clip": socialClip as unknown as TemplateMeta,
  "demo-walkthrough": demoWalkthrough as unknown as TemplateMeta,
};

/**
 * Get a template by ID. Throws if not found.
 */
export function getTemplate(id: string): TemplateMeta {
  const t = templates[id];
  if (!t) throw new Error(`Template "${id}" not found. Available: ${Object.keys(templates).join(", ")}`);
  return t;
}

/**
 * List all available templates.
 */
export function listTemplates(): Array<{ id: string; name: string; category: string; description: string }> {
  return Object.entries(templates).map(([id, t]) => ({
    id,
    name: t.name,
    category: t.category,
    description: t.description,
  }));
}
