/**
 * Remote component loader for the Remotion engine.
 *
 * Loads React components from URLs at render time. Remote components
 * are ES-module-like scripts that use `window.__React` and `window.__Remotion`
 * for framework access, and export via `module.exports.default` or `export default`.
 *
 * Convention for remote components:
 *   const React = window.__React;
 *   const { useCurrentFrame } = window.__Remotion;
 *   export default function MyComp(props) { ... }
 *
 * Uses delayRender/continueRender to block frame output until loaded.
 */
import * as React from "react";
import * as Remotion from "remotion";
import { delayRender, continueRender } from "remotion";

// ── Globals for remote component access ──────────────────────────────────
if (typeof window !== "undefined") {
  (window as any).__React = React;
  (window as any).__Remotion = Remotion;
}

// ── Module cache ─────────────────────────────────────────────────────────
const cache = new Map<string, React.ComponentType<any>>();
const inflight = new Map<string, Promise<React.ComponentType<any>>>();

// Bypass bundler import() analysis
const dynamicImport = typeof window !== "undefined"
  ? new Function("url", "return import(url)") as (url: string) => Promise<any>
  : null;

async function loadComponent(url: string): Promise<React.ComponentType<any>> {
  if (cache.has(url)) return cache.get(url)!;

  if (!inflight.has(url)) {
    const promise = (async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load component from ${url}: HTTP ${response.status}`);
      }
      const source = await response.text();

      // Try ES module import via blob URL (works in Chromium)
      if (dynamicImport) {
        try {
          const blob = new Blob([source], { type: "text/javascript" });
          const blobUrl = URL.createObjectURL(blob);
          try {
            const mod = await dynamicImport(blobUrl);
            const Comp = mod.default ?? mod;
            if (typeof Comp === "function") {
              cache.set(url, Comp);
              return Comp;
            }
          } finally {
            URL.revokeObjectURL(blobUrl);
          }
        } catch {
          // Fall through to CJS eval
        }
      }

      // Fallback: CJS-style eval
      const module = { exports: {} as any };
      const factory = new Function(
        "module", "exports", "React", "remotion",
        source,
      );
      factory(module, module.exports, React, Remotion);
      const Comp = module.exports.default ?? module.exports;
      if (typeof Comp !== "function") {
        throw new Error(`Component at ${url} did not export a function`);
      }
      cache.set(url, Comp);
      return Comp;
    })();

    inflight.set(url, promise);
    promise.finally(() => inflight.delete(url));
  }

  return inflight.get(url)!;
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useDynamicComponent(
  url: string | undefined,
  onError?: (err: unknown, ctx: { url: string }) => void,
): React.ComponentType<any> | null {
  const cached = url ? cache.get(url) ?? null : null;
  const needsLoad = !!url && !cached;

  const [handle] = React.useState(() =>
    needsLoad ? delayRender(`Loading remote component: ${url}`) : null,
  );
  const [Comp, setComp] = React.useState<React.ComponentType<any> | null>(() => cached);

  React.useEffect(() => {
    if (!url || !handle) return;
    let active = true;

    loadComponent(url)
      .then((C) => {
        if (active) setComp(() => C);
      })
      .catch((err) => {
        onError?.(err, { url });
      })
      .finally(() => {
        continueRender(handle);
      });

    return () => {
      active = false;
    };
  }, [url, handle, onError]);

  return Comp;
}

/** Pre-warm the cache for a list of URLs (call before rendering). */
export function preloadComponents(urls: string[]): Promise<void> {
  return Promise.all(urls.map((u) => loadComponent(u).catch(() => {}))).then(() => {});
}
