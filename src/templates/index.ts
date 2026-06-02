import type { TemplateMeta } from "./schema";
export { resolveTemplate, validateSlots, applyDefaults, templateMeta, templateSlot } from "./schema";
export type { TemplateMeta, TemplateSlot } from "./schema";

// Marketing
import productHero from "./marketing/product-hero.json";
import featureShowcase from "./marketing/feature-showcase.json";
import beforeAfter from "./marketing/before-after.json";
import socialClip from "./marketing/social-clip.json";
import cinematicIntro from "./marketing/cinematic-intro.json";
// Demo
import demoWalkthrough from "./demo/demo-walkthrough.json";
// Social
import announcement from "./social/announcement.json";
import glowUp from "./social/glow-up.json";
import quoteCard from "./social/quote-card.json";
import roastList from "./social/roast-list.json";
import statReveal from "./social/stat-reveal.json";
import top5Countdown from "./social/top5-countdown.json";
import yearRecap from "./social/year-recap.json";
import beatDrop from "./social/beat-drop.json";
// Presentation
import journeyMap from "./presentation/journey-map.json";

export const templates: Record<string, TemplateMeta> = {
  // Marketing
  "product-hero": productHero as unknown as TemplateMeta,
  "feature-showcase": featureShowcase as unknown as TemplateMeta,
  "before-after": beforeAfter as unknown as TemplateMeta,
  "social-clip": socialClip as unknown as TemplateMeta,
  "cinematic-intro": cinematicIntro as unknown as TemplateMeta,
  // Demo
  "demo-walkthrough": demoWalkthrough as unknown as TemplateMeta,
  // Social
  "announcement": announcement as unknown as TemplateMeta,
  "glow-up": glowUp as unknown as TemplateMeta,
  "quote-card": quoteCard as unknown as TemplateMeta,
  "roast-list": roastList as unknown as TemplateMeta,
  "stat-reveal": statReveal as unknown as TemplateMeta,
  "top5-countdown": top5Countdown as unknown as TemplateMeta,
  "year-recap": yearRecap as unknown as TemplateMeta,
  "beat-drop": beatDrop as unknown as TemplateMeta,
  // Presentation
  "journey-map": journeyMap as unknown as TemplateMeta,
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
