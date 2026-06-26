#!/usr/bin/env node
/**
 * Custom player server for remotion-engine.
 *
 * Modes:
 *   --label   – playback with label input overlay; labels map to media timestamps
 *   --chat     – playback + chat panel; agent makes changes that take effect immediately
 *
 * Usage:
 *   node src/player/server.mjs <video.json> [--label] [--chat] [--port 3001]
 */
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
const MODE_CHAT = process.argv.includes("--chat");

// ─── SSE clients for chat mode ──────────────────────────────────────────
const sseClients = new Set();

// ─── Label store for label mode ───────────────────────────────────────────
let labels = [];

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
  const hasLabel = MODE_LABEL ? "true" : "false";
  const hasChat = MODE_CHAT ? "true" : "false";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Remotion Player${MODE_LABEL ? " — Label" : ""}${MODE_CHAT ? " — Chat" : ""}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #111; color: #eee; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; height: 100vh; overflow: hidden; }
  #player-container { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 8px; gap: 6px; min-height: 0; }
  #phone-frame { flex: 1; width: 100%; max-width: 420px; background: #000; border-radius: 24px; border: 3px solid #333; overflow: hidden; box-shadow: 0 0 40px rgba(0,0,0,.5); min-height: 0; }
  #scene-player { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  #scene-player video, #scene-player img { width: 100%; height: 100%; object-fit: contain; }
  #overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: flex-end; padding: 24px; }
  #overlay.active { pointer-events: auto; }
  #controls { display: flex; gap: 8px; align-items: center; padding: 6px 8px; width: 100%; max-width: 420px; flex-shrink: 0; }
  #controls button { background: #444; color: #fff; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background .15s; }
  #controls button:hover { background: #666; }
  #controls .ctrl-time { font-size: 12px; color: #aaa; font-family: monospace; white-space: nowrap; flex-shrink: 0; }
  #seek-bar { flex: 1; height: 4px; -webkit-appearance: none; appearance: none; background: #444; border-radius: 2px; outline: none; cursor: pointer; min-width: 0; }
  #seek-bar::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #4a9eff; border: 2px solid #fff; cursor: pointer; }
  #seek-bar::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #4a9eff; border: 2px solid #fff; cursor: pointer; }
  ${MODE_LABEL ? `
  #label-bar { display: flex; flex-direction: column; gap: 4px; width: 100%; max-width: 420px; flex-shrink: 0; }
  #label-bar .chips { display: none; }
  #label-input-row { display: flex; gap: 8px; align-items: center; }
  #label-input { flex: 1; padding: 10px 14px; border: 1px solid rgba(255,255,255,.2); background: rgba(0,0,0,.6); color: #fff; border-radius: 6px; font-size: 14px; outline: none; backdrop-filter: blur(4px); }
  #label-input:focus { border-color: #4a9eff; }
  #label-input::placeholder { color: rgba(255,255,255,.4); }
  #label-counter { font-size: 11px; color: rgba(255,255,255,.5); padding-left: 4px; }
  #label-time { font-size: 11px; color: rgba(255,255,255,.4); font-family: monospace; }
  #thumb-bar { display: flex; gap: 4px; overflow-x: auto; padding: 6px 0; scrollbar-width: thin; scrollbar-color: #444 transparent; justify-content: center; }
  #thumb-bar::-webkit-scrollbar { height: 4px; }
  #thumb-bar::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }
  #thumb-bar .thumb { flex: 0 0 auto; width: 60px; height: 60px; border-radius: 4px; overflow: hidden; cursor: pointer; border: 2px solid transparent; opacity: .6; transition: all .15s; }
  #thumb-bar .thumb:hover { opacity: 1; border-color: #4a9eff; }
  #thumb-bar .thumb.active { border-color: #fff; opacity: 1; }
  #thumb-bar .thumb.labeled { border-color: #4a9eff; }
  #thumb-bar .thumb img, #thumb-bar .thumb video { width: 100%; height: 100%; object-fit: cover; }` : ""}
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

    <div id="phone-frame">
      <div id="scene-player">
        <video id="player" style="display:none"></video>
        <img id="photo-player" style="display:none" />
      </div>
    </div>
    ${MODE_LABEL ? `
    <div id="controls">
      <button id="play-btn" title="Play/Pause">⏸</button>
      <input type="range" id="seek-bar" min="0" max="60" value="0" step="0.1" />
      <span class="ctrl-time"><span id="ctrl-current">00:00</span> / <span id="ctrl-total">00:00</span></span>
    </div>
    <div id="label-bar">
      <div id="label-input-row">
        <input id="label-input" placeholder="Type a label and press Enter…" autocomplete="off" />
        <span id="label-time"></span>
        <span id="label-counter">0</span>
      </div>
      <div id="thumb-bar"></div>
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
    const children = root.children || [];

    // Try stream tree format: scene folders are direct children of root
    const sceneFolders = children.filter(c => c.type === "folder" || c.children?.length);
    // Try scenes folder format: scenes wrapped in a "scenes" folder
    const scenesFolder = children.find(c => c.name === "scenes" || c.id === "scenes");

    if (sceneFolders.length > 0 && !scenesFolder) {
      let offset = 0;
      scenes = sceneFolders.map(s => {
        const leaf = (s.children || []).find(c => c.src);
        const action = leaf?.actions?.[0] || s.actions?.[0] || {};
        const dur = (action.end || 5) - (action.start || 0);
        const scene = { name: s.name || s.id, start: offset, end: offset + dur };
        offset += dur;
        return scene;
      });
      totalDuration = offset;
    } else if (scenesFolder?.children) {
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

// ─── Scene player ─────────────────────────────────────────────────────────
// Plays directly from scene media files instead of a single rendered MP4
let scenesWithMedia = [];
let currentSceneIdx = -1;
let sceneTimer = null;
let sceneStartTime = 0; // performance.now() when current scene started
let playing = true;
const player = document.getElementById("player");
const photoPlayer = document.getElementById("photo-player");
const playBtn = document.getElementById("play-btn");
const seekBar = document.getElementById("seek-bar");

// Load scenes with media info, then start playback
async function initScenePlayer() {
  try {
    const res = await fetch("/api/scenes");
    scenesWithMedia = await res.json();
    if (!scenesWithMedia.length) return;
    // Also populate the global scenes array for saveLabel etc.
    scenes = scenesWithMedia.map((s, i) => ({
      name: s.name,
      start: s.start,
      end: s.end,
      src: s.src,
      mediaType: s.mediaType,
    }));
    totalDuration = scenesWithMedia[scenesWithMedia.length - 1].end;
    // Set seek bar max
    if (seekBar) seekBar.max = totalDuration;
    // Set total time display
    var totalEl = document.getElementById("ctrl-total");
    if (totalEl) totalEl.textContent = formatTime(totalDuration);
    playScene(0);
  } catch(e) { console.error("Scene player init error:", e); }
}

function playScene(idx, seekTime) {
  // Auto-save any pending label before switching
  autoSaveLabel();
  if (idx < 0 || idx >= scenesWithMedia.length) return;
  // Stop any previous scene timer
  clearTimeout(sceneTimer);
  currentSceneIdx = idx;
  sceneStartTime = performance.now();
  const s = scenesWithMedia[idx];
  const url = s.src && (s.src.startsWith("http://") || s.src.startsWith("https://")) ? s.src : "/" + s.src;
  const isVideo = s.mediaType === "video";

  if (isVideo) {
    player.style.display = "";
    photoPlayer.style.display = "none";
    player.src = url;
    player.currentTime = 0;
    // If seeking within this scene
    if (typeof seekTime === "number") {
      var offsetInScene = seekTime - s.start;
      if (offsetInScene > 0) {
        player.currentTime = offsetInScene;
        sceneStartTime = performance.now() - offsetInScene * 1000;
      }
    }
    if (playing) {
      player.play().catch(function(e) {
        console.error("Video play error:", e);
        // Autoplay blocked (no user gesture) — switch to paused state
        playing = false;
        if (playBtn) playBtn.textContent = "\u25B6";
      });
    }
    // Advance on video end
    player.onended = function() { advanceScene(); };
    player.ontimeupdate = function() {
      if (!playing) return;
      var t = getCurrentTime();
      updateDisplay(t);
    };
  } else {
    player.style.display = "none";
    photoPlayer.style.display = "";
    photoPlayer.src = url;
    // Calculate remaining time for this scene
    var remain = (s.duration || 4) * 1000;
    if (typeof seekTime === "number") {
      var elapsed = seekTime - s.start;
      remain = Math.max(0, (s.duration || 4) - elapsed) * 1000;
      sceneStartTime = performance.now() - elapsed * 1000;
    }
    if (playing) {
      sceneTimer = setTimeout(advanceScene, remain);
    }
  }

  var t = getCurrentTime();
  updateDisplay(t);
  // Show label for this scene if one exists
  showLabelForCurrentScene();
}

// Auto-save any text in the input box before switching away
var _lastAutoLabel = null; // tracks last auto-populated label to avoid duplicates
function autoSaveLabel() {
  if (currentSceneIdx < 0) return;
  var input = document.getElementById("label-input");
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;
  // Skip if text matches last auto-populated label (user didn't modify it)
  if (text === _lastAutoLabel) { _lastAutoLabel = null; return; }
  var t = getCurrentTime();
  // Save it silently
  var idx = sceneIndex(t);
  var scene = idx >= 0 ? scenes[idx] : null;
  var label = {
    time: Math.round(t * 1000) / 1000,
    sceneIndex: idx >= 0 ? idx : null,
    sceneName: scene ? scene.name : null,
    src: scene ? scene.src : null,
    mediaType: scene ? scene.mediaType : null,
    label: text,
  };
  currentLabels.push(label);
  updateLabeledThumbs();
  input.value = "";
  // Persist to server
  fetch("/api/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ labels: currentLabels, scenes }),
  }).catch(function(e){});
}

// Show existing label for current scene in the input box
function showLabelForCurrentScene() {
  var input = document.getElementById("label-input");
  if (!input) return;
  var t = getCurrentTime();
  var idx = sceneIndex(t);
  // Find last label for this scene index
  var match = null;
  for (var i = currentLabels.length - 1; i >= 0; i--) {
    if (currentLabels[i].sceneIndex === idx) {
      match = currentLabels[i].label;
      break;
    }
  }
  input.value = match || "";
  _lastAutoLabel = match || null;
}

function advanceScene() {
  playScene(currentSceneIdx + 1);
}

function getCurrentTime() {
  if (currentSceneIdx < 0 || !scenesWithMedia.length) return 0;
  var s = scenesWithMedia[currentSceneIdx];
  var elapsed = (performance.now() - sceneStartTime) / 1000;
  return Math.min(s.start + elapsed, s.end);
}

function updateDisplay(t) {
  // Update label-time
  var el = document.getElementById("label-time");
  if (el) el.textContent = formatTime(t);
  // Update ctrl-current
  var ctrl = document.getElementById("ctrl-current");
  if (ctrl) ctrl.textContent = formatTime(t);
  // Update seek bar
  if (seekBar && !seekBar._dragging) seekBar.value = t;
  // Update active thumbnail
  updateActiveThumb(t);
}

// Toggle play/pause
function togglePlay() {
  playing = !playing;
  if (playBtn) playBtn.textContent = playing ? "\u23F8" : "\u25B6";
  if (currentSceneIdx < 0) return;
  var s = scenesWithMedia[currentSceneIdx];
  var isVideo = s.mediaType === "video";
  if (playing) {
    sceneStartTime = performance.now() - (getCurrentTime() - s.start) * 1000;
    if (isVideo) {
      player.play().catch(function(e){});
    } else {
      var remain = ((s.duration || 4) - (getCurrentTime() - s.start)) * 1000;
      sceneTimer = setTimeout(advanceScene, Math.max(0, remain));
    }
  } else {
    if (isVideo) {
      player.pause();
    } else {
      clearTimeout(sceneTimer);
    }
  }
}

function stopPlayback() {
  playing = true;
  if (playBtn) playBtn.textContent = "⏸";
  clearTimeout(sceneTimer);
  playScene(0);
}

// Seek to a specific time
function seekToScene(time) {
  for (var i = scenesWithMedia.length - 1; i >= 0; i--) {
    if (time >= scenesWithMedia[i].start) {
      playScene(i, time);
      return;
    }
  }
}

// Wire up controls
if (playBtn) playBtn.addEventListener("click", togglePlay);
if (seekBar) {
  seekBar.addEventListener("input", function() {
    seekBar._dragging = true;
    seekToScene(parseFloat(this.value));
  });
  seekBar.addEventListener("change", function() {
    seekBar._dragging = false;
  });
}

initScenePlayer();

${MODE_LABEL ? `
// ─── Label Mode — simplified auto-save ────────────────────────────────────
let currentLabels = [];

// ─── Thumbnail bar — scene previews with click-to-seek ───────────────────
async function renderThumbnails() {
  try {
    const res = await fetch("/api/scenes");
    const scenesWithMedia = await res.json();
    const bar = document.getElementById("thumb-bar");
    if (!bar || !scenesWithMedia.length) return;
    var html = "";
    for (var i = 0; i < scenesWithMedia.length; i++) {
      var s = scenesWithMedia[i];
      var url = s.src && (s.src.startsWith("http://") || s.src.startsWith("https://")) ? s.src : "/" + s.src;
      var isVideo = s.mediaType === "video";
      var cls = i === 0 ? "thumb active" : "thumb";
      html += '<div class="' + cls + '" data-index="' + i + '" data-start="' + s.start + '" onclick="seekToScene(' + s.start + ')">';
      if (isVideo) {
        html += '<video src="' + url + '" muted preload="metadata"></video>';
      } else {
        html += '<img src="' + url + '" loading="lazy" />';
      }
      html += '</div>';
    }
    bar.innerHTML = html;
    // Label thumbs that have saved labels
    if (typeof updateLabeledThumbs === 'function') updateLabeledThumbs();
  } catch(e) { console.error("Thumbnails error:", e); }
}

// Highlight active thumbnail and keep current one visible
function updateActiveThumb(time) {
  const thumbs = document.querySelectorAll("#thumb-bar .thumb");
  let activeIdx = -1;
  // Walk backwards to find the scene start we're in
  for (let i = thumbs.length - 1; i >= 0; i--) {
    const start = parseFloat(thumbs[i].dataset.start);
    if (time >= start) { activeIdx = i; break; }
  }
  thumbs.forEach((el, i) => {
    el.classList.toggle("active", i === activeIdx);
  });
  // Scroll active thumb into view
  if (activeIdx >= 0 && thumbs[activeIdx]) {
    thumbs[activeIdx].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }
}

// Fetch scenes and render thumbnails on load
renderThumbnails();

// Load saved labels from server
async function loadLabels() {
  try {
    const res = await fetch("/api/labels");
    const data = await res.json();
    if (data.labels) currentLabels = data.labels;
    updateLabeledThumbs();
    showLabelForCurrentScene();
  } catch(e) { console.error("Load labels error:", e); }
}
loadLabels();

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
  updateLabeledThumbs();

  // Auto-save to file
  try {
    await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labels: currentLabels, scenes }),
    });
  } catch(e) { console.error("Auto-save failed:", e); }
}

function updateLabeledThumbs() {
  // Update counter
  document.getElementById("label-counter").textContent = currentLabels.length;
  // Mark thumbnails that have labels
  var labeled = {};
  for (var i = 0; i < currentLabels.length; i++) {
    if (currentLabels[i].sceneIndex !== null) {
      labeled[currentLabels[i].sceneIndex] = true;
    }
  }
  var thumbs = document.querySelectorAll("#thumb-bar .thumb");
  thumbs.forEach(function(el, idx) {
    el.classList.toggle("labeled", !!labeled[idx]);
  });
}

// Update time display
document.getElementById("label-input")?.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    const input = e.target;
    const text = input.value.trim();
    if (!text) return;
    const time = typeof getCurrentTime === 'function' ? getCurrentTime() : 0;
    // Skip if same as last label for this scene (avoid duplicates)
    const idx = sceneIndex(time);
    var lastLabel = null;
    for (var i = currentLabels.length - 1; i >= 0; i--) {
      if (currentLabels[i].sceneIndex === idx) { lastLabel = currentLabels[i].label; break; }
    }
    if (lastLabel !== text) {
      await saveLabel(text, time);
    }
    input.focus();
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
        mode: { label: MODE_LABEL, chat: MODE_CHAT },
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
  const mode = MODE_LABEL ? " --label" : MODE_CHAT ? " --chat" : "";
  console.log(`\n🎬 Remotion Player${mode} at http://localhost:${PORT}`);
  console.log(`   JSON: ${VIDEO_JSON}`);
  if (MODE_LABEL) console.log(`   Labels will be saved to ${dirname(VIDEO_JSON)}/labels.json`);
  if (MODE_CHAT) console.log(`   Agent can POST to http://localhost:${PORT}/api/chat/send`);
  console.log("");
});
