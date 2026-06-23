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
      const action = s.children?.[0]?.actions?.[0];
      const dur = action ? (action.end - action.start) : 5;
      const scene = { name: s.name, start: offset, end: offset + dur };
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
  #label-panel { position: absolute; right: 0; top: 0; bottom: 0; width: 320px; background: rgba(0,0,0,.85); padding: 16px; overflow-y: auto; transform: translateX(100%); transition: transform .2s; pointer-events: auto; }
  #label-panel.open { transform: translateX(0); }
  #label-panel h3 { margin-bottom: 12px; font-size: 14px; color: #aaa; text-transform: uppercase; letter-spacing: 1px; }
  .label-item { background: #222; border-radius: 6px; padding: 10px; margin-bottom: 8px; cursor: pointer; }
  .label-item:hover { background: #333; }
  .label-item .time { font-size: 11px; color: #888; font-family: monospace; }
  .label-item .text { font-size: 14px; margin-top: 2px; }
  .label-input-area { margin-top: 8px; }
  .label-input-area input, .label-input-area select { width: 100%; padding: 8px; margin-bottom: 6px; border: 1px solid #444; background: #222; color: #eee; border-radius: 4px; }
  .label-input-area button { width: 100%; padding: 8px; background: #4a9eff; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
  ` : ""}
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
    <div id="overlay">
      <div id="controls">
        <button id="btn-label">🏷️ Label this moment</button>
        <span id="time-display">00:00 / 00:00</span>
      </div>
    </div>
    <div id="label-panel">
      <h3>Labels</h3>
      <div id="label-list"></div>
      <div class="label-input-area" id="label-input-area" style="display:none">
        <input id="label-text" placeholder="Label (e.g. Arrival at campsite)" />
        <select id="label-mood">
          <option value="">Mood…</option>
          <option value="happy">😊 Happy</option>
          <option value="calm">😌 Calm</option>
          <option value="exciting">🤩 Exciting</option>
          <option value="funny">😂 Funny</option>
          <option value="dramatic">🎭 Dramatic</option>
          <option value="quiet">🤫 Quiet</option>
          <option value="warm">💛 Warm</option>
        </select>
        <label><input type="checkbox" id="label-highlight" /> Highlight</label>
        <label><input type="checkbox" id="label-skip" /> Skip</label>
        <button id="btn-save-label">Save</button>
        <button id="btn-cancel-label" style="background:#555">Cancel</button>
      </div>
      <button id="btn-export-labels" style="width:100%;padding:8px;margin-top:8px;background:#333;color:#eee;border:1px solid #555;border-radius:4px;cursor:pointer">📥 Export Labels</button>
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
    // Highlight current scene in collect mode
    if (typeof updateCurrentScene === "function") updateCurrentScene(current);
  };
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

${MODE_COLLECT ? `
// ─── Collect Mode ────────────────────────────────────────────────────────
let currentLabels = [];
let editingIndex = -1;

function getCurrentScene(time) {
  return scenes.find(s => time >= s.start && time < s.end) || null;
}

function updateCurrentScene(time) {
  const scene = getCurrentScene(time);
  const btn = document.getElementById("btn-label");
  if (btn) {
    btn.textContent = scene ? "🏷️ Label: " + scene.name : "🏷️ Label this moment";
  }
}

// Open label input at current time
document.getElementById("btn-label")?.addEventListener("click", () => {
  const time = player.currentTime;
  const scene = getCurrentScene(time);
  const area = document.getElementById("label-input-area");
  area.style.display = "block";
  area.dataset.time = time;
  area.dataset.sceneIndex = scenes.indexOf(scene);
  document.getElementById("label-text").value = scene ? scene.name : "";
  document.getElementById("label-text").focus();
  editingIndex = -1;
});

// Save label
document.getElementById("btn-save-label")?.addEventListener("click", () => {
  const text = document.getElementById("label-text").value.trim();
  if (!text) return;
  const time = parseFloat(document.getElementById("label-input-area").dataset.time || "0");
  const sceneIndex = parseInt(document.getElementById("label-input-area").dataset.sceneIndex || "-1");
  const label = {
    time: time,
    sceneIndex: sceneIndex >= 0 ? sceneIndex : null,
    sceneName: sceneIndex >= 0 && scenes[sceneIndex] ? scenes[sceneIndex].name : null,
    label: text,
    mood: document.getElementById("label-mood").value || null,
    isHighlight: document.getElementById("label-highlight").checked,
    isSkip: document.getElementById("label-skip").checked,
  };

  if (editingIndex >= 0) {
    currentLabels[editingIndex] = label;
  } else {
    currentLabels.push(label);
  }
  renderLabels();
  document.getElementById("label-input-area").style.display = "none";
  resetLabelForm();
});

document.getElementById("btn-cancel-label")?.addEventListener("click", () => {
  document.getElementById("label-input-area").style.display = "none";
  resetLabelForm();
});

function resetLabelForm() {
  document.getElementById("label-text").value = "";
  document.getElementById("label-mood").value = "";
  document.getElementById("label-highlight").checked = false;
  document.getElementById("label-skip").checked = false;
}

function renderLabels() {
  const list = document.getElementById("label-list");
  list.innerHTML = currentLabels.map((l, i) => \`
    <div class="label-item" onclick="editLabel(\${i})">
      <div class="time">\${formatTime(l.time)} \${l.sceneName ? "— " + l.sceneName : ""}</div>
      <div class="text">\${l.isHighlight ? "⭐ " : ""}\${l.isSkip ? "🚫 " : ""}\${l.label} \${l.mood ? "(" + l.mood + ")" : ""}</div>
    </div>
  \`).join("");
}

function editLabel(i) {
  const l = currentLabels[i];
  editingIndex = i;
  const area = document.getElementById("label-input-area");
  area.style.display = "block";
  area.dataset.time = l.time;
  document.getElementById("label-text").value = l.label;
  document.getElementById("label-mood").value = l.mood || "";
  document.getElementById("label-highlight").checked = l.isHighlight;
  document.getElementById("label-skip").checked = l.isSkip;
  document.getElementById("label-text").focus();
}

// Export labels
document.getElementById("btn-export-labels")?.addEventListener("click", async () => {
  const json = JSON.stringify({ labels: currentLabels, scenes }, null, 2);
  // Save via API
  try {
    const res = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
    });
    if (res.ok) alert("✅ Labels saved!");
    else alert("❌ Failed to save labels");
  } catch(e) {
    alert("❌ Error: " + e.message);
  }
});
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
