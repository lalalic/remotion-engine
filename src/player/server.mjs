#!/usr/bin/env node
/**
 * Custom player server for remotion-engine.
 *
 * Modes:
 *   --label   – playback with label input overlay; labels map to media timestamps
 *   --watch    – auto-reload when the JSON file changes (agent edits file, player refreshes)
 *
 * Usage:
 *   node src/player/server.mjs <video.json> [--label] [--watch] [--port 3001]
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, watchFile, existsSync, statSync, createReadStream } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PORT = parseInt(process.argv.find(a => a.startsWith("--port="))?.split("=")[1] || process.argv[process.argv.indexOf("--port") + 1] || "3001", 10);

// Find video.json path
const jsonArg = process.argv.find(a => a.endsWith(".json") && !a.startsWith("--"));
const VIDEO_JSON = jsonArg ? resolve(jsonArg) : join(ROOT, "video.json");
const MODE_LABEL = process.argv.includes("--label");
const MODE_WATCH = process.argv.includes("--watch");

// ─── SSE clients for reload notifications ────────────────────────────────
const sseClients = new Set();
let shutdownTimer = null;

// ─── Label store for label mode ───────────────────────────────────────────
let labels = [];

// ─── Edit history for context ─────────────────────────────────────────────
let editHistory = [];

// ─── Parse video.json for scene info ─────────────────────────────────────
// Supports two JSON formats:
//   1. Stream tree: root → scene folders (type:"folder") → media children
//   2. scenes folder: root → "scenes" folder → scene objects with media src
let scenes = [];
let totalDuration = 0;
try {
  const raw = readFileSync(VIDEO_JSON, "utf-8");
  const parsed = JSON.parse(raw);
  const root = parsed.root || parsed;

  // Try format 1: scenes are direct children of root (stream tree)
  // Root children that are folders with their own children are scenes
  if (root.children?.length && !root.children.find(c => c.name === "scenes" || c.id === "scenes")) {
    let offset = 0;
    scenes = root.children
      .filter(c => c.type === "folder" || c.children?.length)
      .filter(c => !c.isBackground)
      .map(s => {
        // Find first leaf child with a src (image/video) for playback
        const leaf = (s.children || []).find(c => c.src && (c.type === "image" || c.type === "video"));
        const action = leaf?.actions?.[0] || s.actions?.[0] || {};
        const dur = (action.end || 5) - (action.start || 0);
        const src = leaf?.src || "";
        const mediaType = leaf?.type || "unknown";
        const scene = {
          name: s.name || s.id || "scene",
          start: offset,
          end: offset + dur,
          duration: dur,
          src,
          mediaType,
        };
        offset += dur;
        return scene;
      });
    totalDuration = offset;
  }

  // Try format 2: scenes wrapped in a "scenes" folder
  const scenesFolder = root.children?.find(c => c.name === "scenes" || c.id === "scenes");
  if (scenesFolder?.children && scenes.length === 0) {
    let offset = 0;
    scenes = scenesFolder.children.map(s => {
      const child = s.children?.[0] || {};
      const action = child?.actions?.[0];
      const dur = action ? (action.end - action.start) : 5;
      const src = child.src || "";
      const mediaType = child.type || "unknown";
      const scene = {
        name: s.name,
        start: offset,
        end: offset + dur,
        duration: dur,
        src,
        mediaType,
      };
      offset += dur;
      return scene;
    });
    totalDuration = offset;
  }
} catch (e) {
  console.error("Warning: could not parse video.json for scene info:", e.message);
}

// ─── Watch file for changes (--watch mode) ───────────────────────────────
if (MODE_WATCH) {
  watchFile(VIDEO_JSON, { interval: 500 }, (curr, prev) => {
    if (curr.mtimeMs === prev.mtimeMs) return;
    console.log(`  📁 ${VIDEO_JSON} changed, notifying clients...`);
    // Re-parse scenes
    try {
      const raw = readFileSync(VIDEO_JSON, "utf-8");
      const parsed = JSON.parse(raw);
      const root = parsed.root || parsed;
      scenes = [];
      totalDuration = 0;
      if (root.children?.length && !root.children.find(c => c.name === "scenes" || c.id === "scenes")) {
        let offset = 0;
        scenes = root.children
          .filter(c => c.type === "folder" || c.children?.length)
          .filter(c => !c.isBackground)
          .map(s => {
            const leaf = (s.children || []).find(c => c.src && (c.type === "image" || c.type === "video"));
            const action = leaf?.actions?.[0] || s.actions?.[0] || {};
            const dur = (action.end || 5) - (action.start || 0);
            const src = leaf?.src || "";
            const mediaType = leaf?.type || "unknown";
            const scene = { name: s.name || s.id || "scene", start: offset, end: offset + dur, duration: dur, src, mediaType };
            offset += dur;
            return scene;
          });
        totalDuration = offset;
      }
      for (const client of sseClients) {
        client.write("data: " + JSON.stringify({ type: "reload", scenes, totalDuration }) + "\n\n");
      }
    } catch (e) {
      console.error("  ⚠️  Failed to re-parse after change:", e.message);
    }
  });
}

// ─── MIME types ──────────────────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wasm": "application/wasm",
};

// ─── Resolve asset path ──────────────────────────────────────────────────
function resolveAsset(urlPath) {
  if (urlPath === "/") return join(ROOT, "src", "player", "index.html");
  // Bundle dir for the Remotion Player
  if (urlPath === "/player.js") return join(ROOT, "src", "player", "bundle", "player.js");
  // Serve from ROOT/public or ROOT
  const candidates = [
    join(ROOT, "public", urlPath),
    join(ROOT, urlPath),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

// ─── HTML page ───────────────────────────────────────────────────────────
function getHtml() {
  const hasLabel = MODE_LABEL ? "true" : "false";
  const hasWatch = MODE_WATCH ? "true" : "false";
  const title = MODE_LABEL ? " — Label" : MODE_WATCH ? " — Watch" : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Remotion Player${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a0a; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; }
  #header { display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: 500px; padding: 8px 12px; flex-shrink: 0; }
  #header-title { font-size: 12px; color: rgba(255,255,255,.3); font-weight: 500; letter-spacing: .5px; }
  #header-status { font-size: 11px; color: rgba(255,255,255,.35); min-width: 80px; text-align: center; }
  #header-actions { display: flex; gap: 6px; align-items: center; }
  #close-btn { width: 22px; height: 22px; border-radius: 50%; border: 1px solid rgba(255,255,255,.15); background: rgba(0,0,0,.3); color: rgba(255,255,255,.4); font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; }
  #close-btn:hover { background: rgba(255,60,60,.4); border-color: rgba(255,60,60,.5); color: #fff; }
  #player-frame { flex: 1; width: 100%; max-width: 480px; min-height: 0; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,.08); background: #000; box-shadow: 0 4px 40px rgba(0,0,0,.6); margin: 0 12px; }
  #root { width: 100%; height: 100%; }
  #reload-toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(74,158,255,.9); color: #fff; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; opacity: 0; transition: opacity .3s; pointer-events: none; z-index: 200; backdrop-filter: blur(8px); }
  #reload-toast.show { opacity: 1; }
  #bottom-bar { display: flex; gap: 6px; align-items: center; width: 100%; max-width: 500px; padding: 8px 12px; flex-shrink: 0; }
  #edit-input { flex: 1; padding: 8px 12px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05); color: #eee; border-radius: 8px; font-size: 13px; outline: none; transition: border-color .15s; }
  #edit-input:focus { border-color: rgba(74,158,255,.5); }
  #edit-input::placeholder { color: rgba(255,255,255,.25); }
  #edit-btn { width: 32px; height: 32px; padding: 0; background: rgba(255,255,255,.06); color: rgba(255,255,255,.5); border: 1px solid rgba(255,255,255,.1); border-radius: 8px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all .15s; flex-shrink: 0; }
  #edit-btn:hover { background: rgba(74,158,255,.2); border-color: rgba(74,158,255,.4); color: #4a9eff; }
  #edit-btn:disabled { opacity: 0.3; cursor: wait; }
</style>
</head>
<body>
${MODE_WATCH ? `<div id="header">
  <span id="header-title">remotion-engine</span>
  <span id="header-status"></span>
  <div id="header-actions">
    <button id="close-btn" title="Close player and return to terminal">✕</button>
  </div>
</div>` : ""}
<div id="player-frame">
  <div id="root"></div>
</div>
<div id="reload-toast">🔄 JSON changed — reloading...</div>
${MODE_WATCH ? `<div id="bottom-bar">
  <input id="edit-input" placeholder="What should change? e.g. make text bigger" />
  <button id="edit-btn" title="Apply edit">&#x2728;</button>
</div>` : ""}
<script src="/player.js" type="module"></script>
${MODE_WATCH ? `<script>
// ─── SSE reload ───────────────────────────────────────────────────────
const evtSource = new EventSource("/api/events");
evtSource.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "reload" && !suppressReload) {
    location.reload();
  }
};

// ─── Close button ─────────────────────────────────────────────────────
document.getElementById("close-btn")?.addEventListener("click", () => {
  navigator.sendBeacon("/api/shutdown", "{}");
  document.body.innerHTML = "<div style='display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#555;font-family:sans-serif;font-size:16px'>\u2B61 player closed \u2014 return to terminal</div>";
});

// ─── Edit input ───────────────────────────────────────────────────────
const editInput = document.getElementById("edit-input");
const editBtn = document.getElementById("edit-btn");
const headerStatus = document.getElementById("header-status");

// Suppress SSE auto-reload during edits — we reload ourselves
let suppressReload = false;

async function applyEdit() {
  const text = editInput.value.trim();
  if (!text) return;
  editBtn.disabled = true;
  headerStatus.textContent = "\u231B editing...";
  editInput.value = "";
  suppressReload = true;
  try {
    const res = await fetch("/api/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (res.ok) {
      const summary = (data.output || "done").split("\\n")[0].slice(0, 65);
      headerStatus.textContent = summary;
      // Reload after showing summary so user sees the change
      setTimeout(() => { suppressReload = false; location.reload(); }, 4000);
    } else {
      headerStatus.textContent = "\u274C " + (data.error || "failed");
      suppressReload = false;
    }
  } catch (e) {
    headerStatus.textContent = "\u274C error";
    suppressReload = false;
  }
  editBtn.disabled = false;
}

editBtn?.addEventListener("click", applyEdit);
editInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); applyEdit(); }
});
</script>` : ""}

</body>
</html>`;
}

// ─── HTTP Server ──────────────────────────────────────────────────────────
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  try {
    // API: Get or save labels (label mode)
    if (path === "/api/labels") {
      const labelsPath = join(dirname(VIDEO_JSON), "labels.json");
      if (req.method === "GET") {
        try {
          const data = readFileSync(labelsPath, "utf-8");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(data);
        } catch (e) {
          // No labels file yet
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ labels: [], scenes: [] }));
        }
        return;
      }
      if (req.method === "POST") {
        let body = "";
        req.on("data", c => body += c);
        req.on("end", () => {
          try {
            writeFileSync(labelsPath, body, "utf-8");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ saved: true, path: labelsPath }));
          } catch (e) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }
    }

    // API: Shutdown — kill the server, return control to terminal
    if (path === "/api/shutdown") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ shutting_down: true }));
      console.log("\n  🚪 Close requested from browser — shutting down\n");
      process.exit(0);
      return;
    }

    // API: Feedback from user — printed to stdout AND saved to feedback.txt
    // Agent can read feedback.txt or tail the log
    if (path === "/api/feedback" && req.method === "POST") {
      let body = "";
      req.on("data", c => body += c);
      req.on("end", () => {
        try {
          const { text } = JSON.parse(body);
          const line = `[${new Date().toISOString()}] ${text}`;
          console.log(`\n  💬 USER FEEDBACK: ${text}\n`);
          try { writeFileSync(join(dirname(VIDEO_JSON), "feedback.txt"), line + "\n", { flag: "a" }); } catch {}
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ received: true }));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // API: Edit — call pi one-shot to edit the JSON, player auto-reloads
    if (path === "/api/edit" && req.method === "POST") {
      let body = "";
      req.on("data", c => body += c);
      req.on("end", () => {
        try {
          const { text } = JSON.parse(body);
          if (!text) { res.writeHead(400); res.end(JSON.stringify({ error: "empty text" })); return; }

          editHistory.push(text);

          // Build timeline context from current JSON
          let timelineInfo = "";
          try {
            const raw = readFileSync(VIDEO_JSON, "utf-8");
            const parsed = JSON.parse(raw);
            const root = parsed.root || parsed;
            const scenes = (root.children || []).filter(c => c.type === "folder" || c.children?.length);
            timelineInfo = scenes.map((s, i) => {
              const dur = s.durationInSeconds || s.children?.[0]?.actions?.[0]?.end || 5;
              const components = (s.children || [])
                .filter(c => !c.isBackground)
                .map(c => {
                  if (c.type === "component") return `${c.componentName}(${JSON.stringify(c.props || {})})`;
                  if (c.type === "subtitle") return `subtitle("${(c.src || "").slice(0, 40)}")`;
                  return `${c.type}${c.src ? `("${c.src.slice(0, 40)}")` : ""}`;
                }).join(", ");
              return `  Scene ${i+1} "${s.name || s.id || ""}" (${dur}s): ${components}`;
            }).join("\n");
          } catch {}

          const historyStr = editHistory.length > 1
            ? "\nPrevious edits on this file (in order):\n" + editHistory.slice(0, -1).map((e, i) => `${i+1}. ${e}`).join("\n") + "\n"
            : "";

          const prompt = `You are editing ${VIDEO_JSON.split("/").pop()}, a Remotion stream tree JSON.

Timeline:\n${timelineInfo || "(could not read timeline)"}\n${historyStr}\nEdit request: ${text}

IMPORTANT: Only edit the JSON file. Do not explain or describe changes. Output the exact change you made.`;

          console.log(`  🤖 pi edit: ${text}`);
          const child = spawn("pi", ["-p", prompt], {
            cwd: ROOT,
            stdio: ["ignore", "pipe", "pipe"],
          });

          let output = "";
          child.stdout.on("data", d => output += d);
          child.stderr.on("data", d => output += d);

          child.on("exit", (code) => {
            if (code === 0) {
              console.log(`  ✅ pi edit complete`);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ done: true, output: output.trim() }));
            } else {
              console.error(`  ❌ pi edit failed (exit ${code}): ${output.trim()}`);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: `pi exited with code ${code}`, output: output.trim() }));
            }
          });
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // API: SSE stream for reload notifications
    // When the browser tab closes, this connection drops → server shuts down
    // Grace period: wait 3s for reconnection (page reload), then exit
    if (path === "/api/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });
      sseClients.add(res);
      if (shutdownTimer) {
        clearTimeout(shutdownTimer);
        shutdownTimer = null;
      }
      req.on("close", () => {
        sseClients.delete(res);
        if (MODE_WATCH && sseClients.size === 0) {
          shutdownTimer = setTimeout(() => {
            console.error("\n  🚪 Browser tab closed — shutting down\n");
            process.exit(0);
          }, 3000);
        }
      });
      return;
    }

    // API: Get video.json raw data (browser fetches this instead of embedded JSON)
    if (path === "/api/video-data") {
      try {
        const data = readFileSync(VIDEO_JSON, "utf-8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(data);
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    // API: Get scenes with media info (for thumbnails)
    if (path === "/api/scenes") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(scenes));
      return;
    }

    // API: Get current video.json info
    if (path === "/api/video-info") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        scenes,
        totalDuration,
        mode: { label: MODE_LABEL, watch: MODE_WATCH },
      }));
      return;
    }

    // Serve the main HTML page
    if (path === "/" || path === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getHtml());
      return;
    }

    // Serve static files from ROOT/public/
    const assetPath = resolveAsset(path);
    if (assetPath && existsSync(assetPath)) {
      const ext = path.slice(path.lastIndexOf("."));
      const mime = MIME[ext] || "application/octet-stream";
      const stat = statSync(assetPath);
      const fileSize = stat.size;
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        const stream = createReadStream(assetPath, { start, end });
        res.writeHead(206, {
          "Content-Range": "bytes " + start + "-" + end + "/" + fileSize,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": mime,
        });
        stream.pipe(res);
      } else {
        const data = readFileSync(assetPath);
        res.writeHead(200, {
          "Content-Type": mime,
          "Accept-Ranges": "bytes",
          "Content-Length": fileSize,
        });
        res.end(data);
      }
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  } catch (err) {
    try {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Server error: " + err.message);
    } catch {
      // Response already sent
    }
  }
});

server.listen(PORT, () => {
  const mode = MODE_LABEL ? " --label" : MODE_WATCH ? " --watch" : "";
  console.log(`\n🎬 Remotion Player${mode} at http://localhost:${PORT}`);
  console.log(`   JSON: ${VIDEO_JSON}`);
  if (MODE_LABEL) console.log(`   Labels: ${dirname(VIDEO_JSON)}/labels.json`);
  if (MODE_WATCH) console.log(`   Watching ${VIDEO_JSON} for changes — edit the file and player auto-reloads`);
  console.log("");
});
