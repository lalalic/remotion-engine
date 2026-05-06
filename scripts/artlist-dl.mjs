#!/usr/bin/env node
/**
 * artlist-dl — Download BGM/SFX from artlist.io CDN URLs or track pages.
 * 
 * Usage:
 *   node scripts/artlist-dl.mjs bgm <cdnUrl> <name>     → public/assets/bgm/<name>.mp3
 *   node scripts/artlist-dl.mjs sfx <cdnUrl> <name> [s]  → public/assets/sfx/<name>.mp3 (trimmed to s seconds)
 *   node scripts/artlist-dl.mjs grab <trackPageUrl> <name> [bgm|sfx] [s]  → auto-extract CDN URL from track page
 *   node scripts/artlist-dl.mjs list                      → show current assets
 *
 * CDN URLs are captured from artlist.io when playing a track (see SKILL.md).
 * Pattern: https://cms-public-artifacts.artlist.io/content/...
 * 
 * The `grab` command scrapes the track page HTML for base64-encoded CDN paths,
 * no browser or login needed — works with just curl.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const BGM_DIR = resolve(ROOT, "public/assets/bgm");
const SFX_DIR = resolve(ROOT, "public/assets/sfx");

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function download(url, outPath, trimSeconds) {
  const tmpPath = resolve(ROOT, ".tmp", `dl-${Date.now()}.aac`);
  ensureDir(dirname(tmpPath));
  ensureDir(dirname(outPath));

  console.log(`⬇ Downloading: ${url.substring(0, 80)}...`);
  execSync(`curl -sL "${url}" -o "${tmpPath}"`, { stdio: "inherit" });

  const trimFlag = trimSeconds ? `-t ${trimSeconds}` : "";
  console.log(`🔄 Converting to MP3${trimSeconds ? ` (${trimSeconds}s)` : ""}...`);
  execSync(`ffmpeg -y -i "${tmpPath}" ${trimFlag} "${outPath}" 2>/dev/null`, { stdio: "inherit" });

  execSync(`rm "${tmpPath}"`);

  const size = statSync(outPath).size;
  console.log(`✅ ${outPath} (${(size / 1024).toFixed(1)} KB)`);
}

function list() {
  console.log("\n📁 BGM (public/assets/bgm/):");
  if (existsSync(BGM_DIR)) {
    for (const f of readdirSync(BGM_DIR)) {
      const size = statSync(resolve(BGM_DIR, f)).size;
      console.log(`  🎵 ${f} (${(size / 1024).toFixed(1)} KB)`);
    }
  }
  console.log("\n📁 SFX (public/assets/sfx/):");
  if (existsSync(SFX_DIR)) {
    for (const f of readdirSync(SFX_DIR)) {
      const size = statSync(resolve(SFX_DIR, f)).size;
      console.log(`  🔊 ${f} (${(size / 1024).toFixed(1)} KB)`);
    }
  }
}

function search(term, type = "sfx", count = 10) {
  const GRAPHQL = "https://search-api.artlist.io/v1/graphql";
  let query, variables;
  
  if (type === "bgm" || type === "music") {
    query = `query SongList($page: Int!, $songSortType: Int!, $take: Int!, $vocalMenuId: Int!, $searchTerm: String) {
      songList(page: $page, songSortType: $songSortType, take: $take, vocalMenuId: $vocalMenuId, searchTerm: $searchTerm) {
        songs { songId songName artistName duration sitePlayableFilePath nameForURL }
      }
    }`;
    variables = { page: 1, songSortType: 0, take: count, vocalMenuId: 0, searchTerm: term };
  } else {
    query = `query SfxList($categoryIds: String!, $page: Float!, $tags: String!, $term: String!, $sortBy: SfxListRequestSortByOptions!) {
      sfxList(categoryIds: $categoryIds, page: $page, tags: $tags, term: $term, sortBy: $sortBy) {
        songs { songId songName artistName durationTime sitePlayableFilePath nameForURL }
      }
    }`;
    variables = { categoryIds: "", page: 1, tags: "", term, sortBy: "STAFF_PICKS" };
  }
  
  const body = JSON.stringify({ query, variables });
  const result = execSync(
    `curl -s '${GRAPHQL}' -H 'Content-Type: application/json' -d '${body.replace(/'/g, "'\\''")}'`,
    { encoding: "utf-8" }
  );
  const data = JSON.parse(result);
  const songs = type === "bgm" || type === "music"
    ? data.data?.songList?.songs || []
    : data.data?.sfxList?.songs || [];
  
  if (!songs.length) {
    console.log(`No results for "${term}"`);
    return;
  }
  
  const typeLabel = type === "bgm" || type === "music" ? "Music" : "SFX";
  console.log(`\n🔍 ${typeLabel} results for "${term}" (${songs.length} tracks):\n`);
  for (const s of songs) {
    const dur = s.duration || `${s.durationTime}s`;
    const url = type === "bgm" || type === "music"
      ? `https://artlist.io/royalty-free-music/song/${s.nameForURL}/${s.songId}`
      : `https://artlist.io/sfx/track/${s.nameForURL}/${s.songId}`;
    console.log(`  ${s.songId.padEnd(8)} ${s.songName} — ${s.artistName} (${dur})`);
    console.log(`           ${url}`);
  }
  console.log(`\nTo download: node scripts/artlist-dl.mjs grab <url> <name> [bgm|sfx]`);
}

// CLI
const [,, cmd, ...args] = process.argv;

if (cmd === "list") {
  list();
} else if (cmd === "search" && args.length >= 1) {
  const [term, type = "sfx", count] = args;
  search(term, type, count ? Number(count) : 10);
} else if (cmd === "grab" && args.length >= 2) {
  const [trackUrl, name, type = "sfx", trim] = args;
  // Parse track ID and type from URL
  // SFX: artlist.io/sfx/track/.../81139  |  Music: artlist.io/royalty-free-music/song/.../6000953
  const sfxMatch = trackUrl.match(/\/sfx\/track\/[^/]+\/(\d+)/);
  const musicMatch = trackUrl.match(/\/(?:royalty-free-music|song)\/[^/]+\/[^/]+\/(\d+)/);
  const trackId = sfxMatch?.[1] || musicMatch?.[1];
  const isSfx = !!sfxMatch || type === "sfx";
  const isMusic = !!musicMatch || type === "bgm";

  if (!trackId) {
    console.error("❌ Could not parse track ID from URL. Expected format:");
    console.error("   SFX:   artlist.io/sfx/track/<name>/<id>");
    console.error("   Music: artlist.io/royalty-free-music/song/<name>/<id>");
    process.exit(1);
  }

  console.log(`🔍 Fetching ${isMusic ? "music" : "sfx"} track #${trackId} via GraphQL API...`);
  try {
    const query = isMusic
      ? `query Songs($ids: [String!]!) { songs(ids: $ids) { songId songName sitePlayableFilePath duration artistName } }`
      : `query Sfxs($ids: [Int!]!) { sfxs(ids: $ids) { songId songName sitePlayableFilePath duration artistName } }`;
    const variables = isMusic ? { ids: [trackId] } : { ids: [Number(trackId)] };
    const body = JSON.stringify({ query, variables });
    
    const result = execSync(
      `curl -s 'https://search-api.artlist.io/v1/graphql' -H 'Content-Type: application/json' -d '${body.replace(/'/g, "'\\''")}'`,
      { encoding: "utf-8" }
    );
    const data = JSON.parse(result);
    const track = isMusic ? data.data?.songs?.[0] : data.data?.sfxs?.[0];
    
    if (!track?.sitePlayableFilePath) {
      console.error("❌ Track not found or no audio URL available.");
      process.exit(1);
    }
    
    console.log(`✅ "${track.songName}" by ${track.artistName} (${track.duration})`);
    const cdnUrl = track.sitePlayableFilePath;
    const outDir = isMusic ? BGM_DIR : SFX_DIR;
    const trimSec = trim ? Number(trim) : (isSfx && !isMusic ? 3 : undefined);
    download(cdnUrl, resolve(outDir, `${name}.mp3`), trimSec);
  } catch (e) {
    console.error(`❌ Failed: ${e.message}`);
    process.exit(1);
  }
} else if (cmd === "bgm" && args.length >= 2) {
  const [url, name] = args;
  download(url, resolve(BGM_DIR, `${name}.mp3`));
} else if (cmd === "sfx" && args.length >= 2) {
  const [url, name, trim] = args;
  download(url, resolve(SFX_DIR, `${name}.mp3`), trim ? Number(trim) : 3);
} else {
  console.log(`
Usage:
  node scripts/artlist-dl.mjs search <term> [sfx|bgm] [count]      Search artlist.io
  node scripts/artlist-dl.mjs grab <trackPageUrl> <name> [bgm|sfx]  Download from track page URL
  node scripts/artlist-dl.mjs bgm <cdnUrl> <name>                   Download BGM from CDN URL
  node scripts/artlist-dl.mjs sfx <cdnUrl> <name> [sec]             Download SFX from CDN URL (trim to sec)
  node scripts/artlist-dl.mjs list                                   List current audio assets

Examples:
  node scripts/artlist-dl.mjs search "whoosh" sfx
  node scripts/artlist-dl.mjs search "cinematic epic" bgm
  node scripts/artlist-dl.mjs grab https://artlist.io/sfx/track/sci-fi-transitions---powerful-whoosh/81139 whoosh sfx
  node scripts/artlist-dl.mjs grab https://artlist.io/royalty-free-music/song/dominion/6000953 dominion bgm
  `);
}
