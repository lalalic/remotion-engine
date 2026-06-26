/**
 * Map stream type — animated route on a static map canvas.
 *
 * Renders a route between waypoints with an animated marker that
 * travels along the path in sync with the current frame.
 * Uses HTML Canvas for rendering — no Google Maps API key required.
 *
 * For full Google Maps integration (DirectionsService, satellite tiles),
 * register a custom component via ComposeContext instead.
 *
 * Usage in stream tree:
 *   {
 *     type: "map",
 *     waypoints: [
 *       { lat: 37.7749, lng: -122.4194, label: "SF" },
 *       { lat: 34.0522, lng: -118.2437, label: "LA" }
 *     ],
 *     actions: [{ start: 0, end: 5 }]
 *   }
 */
import * as React from "react";
import { useCurrentFrame, useVideoConfig, Sequence } from "remotion";
import type { MapStream } from "../schema/index";

interface Point {
  x: number;
  y: number;
}

function latLngToCanvas(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  width: number,
  height: number,
  padding: number,
): Point {
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const x = padding + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * usableW;
  // lat is inverted (higher lat = higher on screen)
  const y = padding + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat || 1)) * usableH;
  return { x, y };
}

function getBounds(waypoints: Array<{ lat: number; lng: number }>) {
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  for (const wp of waypoints) {
    minLat = Math.min(minLat, wp.lat);
    maxLat = Math.max(maxLat, wp.lat);
    minLng = Math.min(minLng, wp.lng);
    maxLng = Math.max(maxLng, wp.lng);
  }
  // Add some padding to bounds
  const latPad = (maxLat - minLat) * 0.15 || 0.01;
  const lngPad = (maxLng - minLng) * 0.15 || 0.01;
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
}

function getPointOnPath(points: Point[], progress: number): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0]!;

  // Calculate total path length
  const segments: number[] = [];
  let totalLen = 0;
  for (let i = 1; i < points.length; i++) {
    const cur = points[i]!;
    const prev = points[i - 1]!;
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segments.push(len);
    totalLen += len;
  }

  const targetDist = progress * totalLen;
  let accumulated = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (accumulated + seg >= targetDist) {
      const t = (targetDist - accumulated) / (seg || 1);
      const p0 = points[i]!;
      const p1 = points[i + 1]!;
      return {
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t,
      };
    }
    accumulated += seg;
  }
  return points[points.length - 1]!;
}

function MapCanvas({
  stream,
  actionStart,
  actionDuration,
}: {
  stream: MapStream;
  actionStart: number;
  actionDuration: number;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const waypoints = stream.waypoints ?? [];
  const routeColor = stream.routeColor ?? "#4285F4";
  const routeWeight = stream.routeWeight ?? 4;
  const padding = 60;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waypoints.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "#e8e8e8";
    ctx.fillRect(0, 0, width, height);

    // Grid lines for map feel
    ctx.strokeStyle = "#d0d0d0";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const bounds = getBounds(waypoints);
    const points = waypoints.map((wp) => latLngToCanvas(wp.lat, wp.lng, bounds, width, height, padding));

    // Draw route line
    if (points.length > 1) {
      ctx.strokeStyle = routeColor;
      ctx.lineWidth = routeWeight;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i]!.x, points[i]!.y);
      }
      ctx.stroke();
    }

    // Draw waypoint markers
    for (let i = 0; i < waypoints.length; i++) {
      const p = points[i]!;
      const wp = waypoints[i]!;

      // Outer circle
      ctx.fillStyle = i === 0 ? "#34A853" : i === waypoints.length - 1 ? "#EA4335" : "#FBBC05";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.fill();

      // Inner circle
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Label
      if (wp.label) {
        ctx.fillStyle = "#333";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(wp.label, p.x, p.y - 20);
      }
    }

    // Animated marker
    const durationFrames = actionDuration * fps;
    const progress = Math.min(1, Math.max(0, frame / (durationFrames || 1)));
    const markerPos = getPointOnPath(points, progress);

    // Marker shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(markerPos.x, markerPos.y + 14, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Marker pin
    ctx.fillStyle = routeColor;
    ctx.beginPath();
    ctx.arc(markerPos.x, markerPos.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(markerPos.x, markerPos.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [frame, width, height, waypoints, routeColor, routeWeight, fps, actionDuration, padding]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}

export function MapLeaf({ stream }: { stream: MapStream }) {
  const { fps } = useVideoConfig();
  if (!stream.waypoints || stream.waypoints.length === 0) return null;

  return (
    <>
      {stream.actions.map((a) => {
        const start = a.start ?? 0;
        const end = a.end ?? start + 1;
        return (
          <Sequence
            key={a.id}
            durationInFrames={Math.max(1, Math.floor(fps * (end - start)))}
            from={Math.floor(fps * start)}
            layout="none"
          >
            <MapCanvas stream={stream} actionStart={start} actionDuration={end - start} />
          </Sequence>
        );
      })}
    </>
  );
}
