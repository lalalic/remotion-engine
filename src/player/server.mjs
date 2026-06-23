#!/usr/bin/env node
/**
 * Custom player server for remotion-engine.
 *
 * Modes:
 *   --collect  – playback with label input overlay; labels map to media timestamps
 *   --chat     – playback + chat panel; agent makes changes that take effect immediately
 *
 * Usage:
 *   node src/player/server.mjs <video.json> [--collect] [--chat] [--port 3001]
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, watchFile, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PORT = parseInt(process.argv.find(a => a.startsWith("--port="))?.split("=")[1] || process.argv[process.argv.indexOf("--port") + 1] || "3001", 10);

// Find video.json path
const jsonArg = process.argv.find(a => a.endsWith(".json") && !a.startsWith("--"));
const VIDEO_JSON = jsonArg ? resolve(jsonArg) : join(ROOT, "video.json");
const MODE_COLLECT = process.argv.includes("--collect");
const MODE_CHAT = process.argv.includes("--chat");

// ─── SSE clients for chat mode ──────────────────────────────────────────
const sseClients = new Set();

// ─── Label store for collect mode ────────────────────────────────────────
let labels = [];

// ─── Parse video.json for scene info ─────────────────────────────────────
let scenes = [];
let totalDuration = 0;
try {
  const raw = readFileSync(VIDEO_JSON, "utf-8");
  const parsed = JSON.parse(raw);
  const root = parsed.root || parsed;
  const scenesFolder = root.children?.find(c => c.name === "scenes" || c.id === "scenes");
  if (scenesFolder?.children) {
    let offset = 0;
    scenes = scenesFolder.children.map(s => {
      const child = s.children?.[0] || {};
      const action = child?.actions?.[0];
      const dur = action ? (action.end - action.start) : 5;
      // Extract the media source path from the child element
      const src = child.src || "";
      const mediaType = child.type || "unknown";
      const scene = {
        name: s.name,
        start: offset,
        end: offset + dur,
        duration: dur,
        src,          // e.g. "vlog/label-preview-.../photos/photo_1_9x16.jpg"
        mediaType,    // "image" | "video"
      };
      offset += dur;
      return scene;
    });
    totalDuration = offset;
  }
} catch (e) {
  console.error("Warning: could not parse video.json for scene info:", e.message);
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
  const hasCollect = MODE_COLLECT ? "true" : "false";
  const hasChat = MODE_CHAT ? "true" : "false";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Remotion Player${MODE_COLLECT ? " — Label" : ""}${MODE_CHAT ? " — Chat" : ""}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #111; color: #eee; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; height: 100vh; overflow: hidden; }
  #player-container { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; }
  #player-container video { max-width: 100%; max-height: 100vh; }
  #overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end; padding: 24px; }
  #overlay.active { pointer-events: auto; }
  #controls { display: flex; gap: 12px; align-items: center; padding: 12px; background: rgba(0,0,0,.7); border-radius: 8px; pointer-events: auto; }
  #controls button { background: #444; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
  #controls button:hover { background: #666; }
  #time-display { font-size: 14px; color: #aaa; font-family: monospace; }
  ${MODE_COLLECT ? `
  #label-bar { position: absolute; bottom: 80px; left: 24px; right: 24px; display: flex; flex-direction: column; gap: 6px; pointer-events: auto; }
  #label-bar .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  #label-bar .chip { background: rgba(74,158,255,.8); color: #fff; font-size: 12px; padding: 4px 10px; border-radius: 12px; white-space: nowrap; }
  #label-bar .chip .time { opacity: .7; margin-right: 4px; }
  #label-input-row { display: flex; gap: 8px; align-items: center; }
  #label-input { flex: 1; padding: 10px 14px; border: 1px solid rgba(255,255,255,.2); background: rgba(0,0,0,.6); color: #fff; border-radius: 6px; font-size: 14px; outline: none; backdrop-filter: blur(4px); }
  #label-input:focus { border-color: #4a9eff; }
  #label-input::placeholder { color: rgba(255,255,255,.4); }
  #label-counter { font-size: 11px; color: rgba(255,255,255,.5); padding-left: 4px; }
  #label-time { font-size: 11px; color: rgba(255,255,255,.4); font-family: monospace; }` : ""}
  ${MODE_CHAT ? `
  #chat-panel { width: 360px; display: flex; flex-direction: column; border-left: 1px solid #333; background: #1a1a1a; }
  #chat-header { padding: 12px 16px; border-bottom: 1px solid #333; font-size: 13px; color: #aaa; text-transform: uppercase; letter-spacing: 1px; }
  #chat-messages { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
  .chat-msg { padding: 8px 12px; border-radius: 8px; max-width: 85%; font-size: 14px; line-height: 1.4; }
  .chat-msg.agent { align-self: flex-start; background: #2a2a4a; color: #aac; }
  .chat-msg.user { align-self: flex-end; background: #4a9eff; color: #fff; }
  .chat-msg .time { font-size: 10px; color: rgba(255,255,255,.5); margin-top: 4px; }
  .chat-msg.agent .time { color: rgba(170,170,204,.6); }
  #chat-input-area { display: flex; padding: 8px; border-top: 1px solid #333; gap: 8px; }
  #chat-input { flex: 1; padding: 8px 12px; border: 1px solid #444; background: #222; color: #eee; border-radius: 4px; outline: none; }
  #chat-input:focus { border-color: #4a9eff; }
  #chat-send { padding: 8px 16px; background: #4a9eff; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
  ` : ""}
</style>
</head>
<body>
  <div id="player-container">
    <video id="player" controls autoplay></video>
    ${MODE_COLLECT ? `
    <div id="label-bar">
      <div class="chips" id="label-chips"></div>
      <div id="label-input-row">
        <input id="label-input" placeholder="Type a label and press Enter…" autocomplete="off" />
        <span id="label-time"></span>
        <span id="label-counter">0</span>
      </div>
    </div>
    <div id="controls">
      <span id="time-display">00:00 / 00:00</span>
    </div>
    ` : ""}
  </div>
  ${MODE_CHAT ? `
  <div id="chat-panel">
    <div id="chat-header">💬 Agent Chat</div>
    <div id="chat-messages"></div>
    <div id="chat-input-area">
      <input id="chat-input" placeholder="Type a message…" />
      <button id="chat-send">Send</button>
    </div>
  </div>
  ` : ""}

<script>
// ─── Load video.json from API ──────────────────────────────────────────
let scenes = [];
let totalDuration = 0;

async function loadVideoData() {
  try {
    const res = await fetch("/api/video-data");
    const videoJson = await res.json();
    const root = videoJson.root || videoJson;
    const scenesFolder = root.children?.find(c => c.name === "scenes" || c.id === "scenes");
    if (scenesFolder?.children) {
      let offset = 0;
      scenes = scenesFolder.children.map(s => {
        const action = s.children?.[0]?.actions?.[0];
        const dur = action ? (action.end - action.start) : 5;
        const scene = { name: s.name, start: offset, end: offset + dur };
        offset += dur;
        return scene;
      });
      totalDuration = offset;
    }
  } catch(e) { console.error("Failed to load video data:", e); }
}

loadVideoData();

// ─── Player setup ────────────────────────────────────────────────────────
const player = document.getElementById("player");
if (player) {
  // Try label_preview.mp4 first, fall back to first video source in scenes
  player.src = "/outputs/label_preview.mp4";
  // If MP4 doesn't exist, the 404 will be handled silently
    const current = player.currentTime;
    const total = player.duration || totalDuration;
    const timeDisplay = document.getElementById("time-display");
    if (timeDisplay) {
      timeDisplay.textContent = formatTime(current) + " / " + formatTime(total);
    }
  };
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

${MODE_COLLECT ? `
// ─── Collect Mode — simplified auto-save ─────────────────────────────────
let currentLabels = [];

function getCurrentScene(time) {
  return scenes.find(s => time >= s.start && time < s.end) || null;
}

function sceneIndex(time) {
  return scenes.findIndex(s => time >= s.start && time < s.end);
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

// Auto-save label via API
async function saveLabel(text, time) {
  const idx = sceneIndex(time);
  const scene = idx >= 0 ? scenes[idx] : null;
  const label = {
    time: Math.round(time * 1000) / 1000,
    sceneIndex: idx >= 0 ? idx : null,
    sceneName: scene ? scene.name : null,
    src: scene ? scene.src : null,           // file path to the media asset
    mediaType: scene ? scene.mediaType : null, // "image" | "video"
    label: text,
  };
  currentLabels.push(label);
  renderChips();

  // Auto-save to file
  try {
    await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labels: currentLabels, scenes }),
    });
  } catch(e) { console.error("Auto-save failed:", e); }
}

function renderChips() {
  const container = document.getElementById("label-chips");
  container.innerHTML = currentLabels.map(l => \`
    <span class="chip"><span class="time">\${formatTime(l.time)}</span>\${l.label}</span>
  \`).join("");
  document.getElementById("label-counter").textContent = currentLabels.length;
}

// Update time display
document.getElementById("label-input")?.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    const input = e.target;
    const text = input.value.trim();
    if (!text) return;
    const time = player && typeof player.currentTime !== 'undefined' ? player.currentTime : 0;
    await saveLabel(text, time);
    input.value = "";
    input.focus();
  }
});

// Show current time in label bar
if (player) {
  player.ontimeupdate = () => {
    const t = player.currentTime;
    const el = document.getElementById("label-time");
    if (el) el.textContent = formatTime(t);
  };
}
` : ""}

${MODE_CHAT ? `
// ─── Chat Mode ───────────────────────────────────────────────────────────
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatPanel = document.getElementById("chat-panel");

// Connect to SSE for agent messages
const evtSource = new EventSource("/api/chat/events");
evtSource.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  addChatMessage(msg.text, "agent");
};

// Send user message
async function sendChatMessage(text) {
  addChatMessage(text, "user");
  try {
    await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, time: player?.currentTime || 0 }),
    });
  } catch(e) { console.error("Chat send error:", e); }
}

chatSend?.addEventListener("click", () => {
  const text = chatInput.value.trim();
  if (!text) return;
  sendChatMessage(text);
  chatInput.value = "";
});

chatInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    chatSend?.click();
  }
});

function addChatMessage(text, role) {
  const div = document.createElement("div");
  div.className = "chat-msg " + role;
  div.innerHTML = text + '<div class="time">' + new Date().toLocaleTimeString() + '</div>';
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
` : ""}
</script>
</body>
</html>`;
}

// ─── HTTP Server ──────────────────────────────────────────────────────────
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  try {
    // API: Save labels (collect mode)
    if (path === "/api/labels" && req.method === "POST") {
      let body = "";
      req.on("data", c => body += c);
      req.on("end", () => {
        try {
          const labelsPath = join(dirname(VIDEO_JSON), "labels.json");
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

    // API: Chat SSE stream
    if (path === "/api/chat/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });
      sseClients.add(res);
      req.on("close", () => sseClients.delete(res));
      return;
    }

    // API: Receive agent message (from external process)
    if (path === "/api/chat/send" && req.method === "POST") {
      let body = "";
      req.on("data", c => body += c);
      req.on("end", () => {
        try {
          const msg = JSON.parse(body);
          for (const client of sseClients) {
            client.write("data: " + JSON.stringify(msg) + "\n\n");
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ sent: true }));
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
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

    // API: Get current video.json info
    if (path === "/api/video-info") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        scenes,
        totalDuration,
        mode: { collect: MODE_COLLECT, chat: MODE_CHAT },
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
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(readFileSync(assetPath));
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
  const mode = MODE_COLLECT ? " --collect" : MODE_CHAT ? " --chat" : "";
  console.log(`\n🎬 Remotion Player${mode} at http://localhost:${PORT}`);
  console.log(`   JSON: ${VIDEO_JSON}`);
  if (MODE_COLLECT) console.log(`   Labels will be saved to ${dirname(VIDEO_JSON)}/labels.json`);
  if (MODE_CHAT) console.log(`   Agent can POST to http://localhost:${PORT}/api/chat/send`);
  console.log("");
});
