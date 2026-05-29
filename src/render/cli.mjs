#!/usr/bin/env node
/**
 * CLI entry point for the Remotion engine.
 *
 * Usage:
 *   node render/cli.mjs render <stream.json> [--aspect 16x9|9x16|1x1|all] [--output out.mp4]
 *   node render/cli.mjs render --template <id> --data <data.json> [--aspect all]
 *   node render/cli.mjs templates  — list available templates
 *   node render/cli.mjs preview <stream.json> [--force-new]  — open Remotion Studio
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../..");

const ASPECTS = {
  "16x9": { width: 1920, height: 1080 },
  "9x16": { width: 1080, height: 1920 },
  "1x1": { width: 1080, height: 1080 },
};

function usage() {
  console.log(`
remotion-engine CLI

Commands:
  render <file.json>                    Render a stream tree to MP4
    --aspect <16x9|9x16|1x1|all>       Aspect ratio (default: 16x9)
    --output <path>                     Output path (default: out/video-{aspect}.mp4)
    --template <id>                     Use a template instead of raw stream tree
    --data <data.json>                  Data for template slots

  templates                             List available templates
  preview <file.json>                   Open Remotion Studio with the stream tree
    --force-new                         Start a new Studio instance even if another is running
`);
}

// Minimal template resolver (avoids importing TSX in Node)
function resolveTemplatePlaceholders(tree, data) {
  if (typeof tree === "string") {
    if (/^\$\{[^}]+\}$/.test(tree)) {
      const key = tree.slice(2, -1);
      return data[key] !== undefined ? data[key] : tree;
    }
    return tree.replace(/\$\{([^}]+)\}/g, (_, key) => {
      const val = data[key];
      return val !== undefined ? String(val) : `\${${key}}`;
    });
  }
  if (Array.isArray(tree)) return tree.map((item) => resolveTemplatePlaceholders(item, data));
  if (tree !== null && typeof tree === "object") {
    const result = {};
    for (const [k, v] of Object.entries(tree)) {
      result[k] = resolveTemplatePlaceholders(v, data);
    }
    return result;
  }
  return tree;
}

function loadTemplate(id) {
  const paths = [
    join(ROOT, "src", "templates", "marketing", `${id}.json`),
    join(ROOT, "src", "templates", "demo", `${id}.json`),
    join(ROOT, "src", "templates", "social", `${id}.json`),
    join(ROOT, "src", "templates", "personal", `${id}.json`),
  ];
  for (const p of paths) {
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf-8"));
  }
  throw new Error(`Template "${id}" not found. Searched: ${paths.join(", ")}`);
}

function parseArgs(argv) {
  const args = { command: "", file: "", aspect: "16x9", output: "", template: "", data: "", forceNew: false };
  let i = 2;
  if (argv[i]) args.command = argv[i++];
  if (argv[i] && !argv[i].startsWith("--")) args.file = argv[i++];
  while (i < argv.length) {
    const flag = argv[i++];
    if (flag === "--aspect" && argv[i]) args.aspect = argv[i++];
    else if (flag === "--output" && argv[i]) args.output = argv[i++];
    else if (flag === "--template" && argv[i]) args.template = argv[i++];
    else if (flag === "--data" && argv[i]) args.data = argv[i++];
    else if (flag === "--force-new") args.forceNew = true;
  }
  return args;
}

function renderOne(streamTree, aspect, outputPath) {
  const dims = ASPECTS[aspect];
  if (!dims) throw new Error(`Unknown aspect: ${aspect}`);

  const adapted = { ...streamTree, width: dims.width, height: dims.height };
  const tmpProps = join(ROOT, ".tmp", `render-${aspect}.json`);
  mkdirSync(dirname(tmpProps), { recursive: true });
  writeFileSync(tmpProps, JSON.stringify({ root: adapted }));

  mkdirSync(dirname(outputPath), { recursive: true });

  const cmd = `npx remotion render Root "${outputPath}" --props="${tmpProps}" --config=remotion.config.ts`;
  console.log(`\n▶ Rendering ${aspect} → ${outputPath}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
  console.log(`✓ ${outputPath}`);
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.command || args.command === "help" || args.command === "--help") {
    usage();
    process.exit(0);
  }

  if (args.command === "templates") {
    const dir = join(ROOT, "src", "templates");
    console.log("\nAvailable templates:\n");
    for (const category of ["marketing", "demo", "social", "personal"]) {
      const catDir = join(dir, category);
      if (!existsSync(catDir)) continue;
      for (const f of readdirSync(catDir)) {
        if (!f.endsWith(".json")) continue;
        const t = JSON.parse(readFileSync(join(catDir, f), "utf-8"));
        console.log(`  ${t.id.padEnd(20)} ${t.name} — ${t.description}`);
      }
    }
    console.log("");
    process.exit(0);
  }

  if (args.command === "preview") {
    const propsFlag = args.file ? `--props="${resolve(args.file)}"` : "";
    const forceNewFlag = args.forceNew ? "--force-new" : "";
    const cmd = `npx remotion studio --config=remotion.config.ts ${propsFlag} ${forceNewFlag}`;
    execSync(cmd, { cwd: ROOT, stdio: "inherit" });
    process.exit(0);
  }

  if (args.command === "render") {
    let streamTree;

    if (args.template) {
      const tmpl = loadTemplate(args.template);
      const data = args.data ? JSON.parse(readFileSync(resolve(args.data), "utf-8")) : {};
      streamTree = resolveTemplatePlaceholders(tmpl.streamTree, data);
    } else if (args.file) {
      const raw = JSON.parse(readFileSync(resolve(args.file), "utf-8"));
      streamTree = raw.root ?? raw;
    } else {
      console.error("Error: provide a stream tree file or --template <id>");
      process.exit(1);
    }

    const aspects = args.aspect === "all" ? Object.keys(ASPECTS) : [args.aspect];

    for (const aspect of aspects) {
      const output = args.output && aspects.length === 1
        ? resolve(args.output)
        : join(ROOT, "out", `video-${aspect}.mp4`);
      renderOne(streamTree, aspect, output);
    }

    console.log("\n✅ All renders complete.");
    process.exit(0);
  }

  console.error(`Unknown command: ${args.command}`);
  usage();
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
