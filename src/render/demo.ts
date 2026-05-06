/**
 * Demo Automation — Phase 4 scaffold.
 *
 * Converts CDP screen captures into a stream tree for polished demo videos.
 * This is a future capability — the API is defined here for reference.
 *
 * Workflow:
 * 1. Record a CDP session (screenshots + click events + scroll events)
 * 2. Convert to a stream tree with DeviceMockup + CursorFlyover components
 * 3. Preview in Studio → render to MP4
 */

export interface CDPCapture {
  screenshots: Array<{
    timestamp: number;  // ms from start
    path: string;       // local file path
    viewport: { width: number; height: number };
  }>;
  events: Array<{
    type: "click" | "scroll" | "type" | "navigate";
    timestamp: number;
    x?: number;
    y?: number;
    text?: string;
    url?: string;
  }>;
  duration: number; // total ms
}

/**
 * Convert a CDP capture to a stream tree.
 * Not yet implemented — returns a placeholder.
 */
export function captureToStreamTree(
  _capture: CDPCapture,
  _options?: {
    device?: "browser" | "phone";
    theme?: string;
    headline?: string;
    cta?: string;
  },
): Record<string, unknown> {
  throw new Error("Demo automation not yet implemented. See DESIGN.md Phase 4.");
}
