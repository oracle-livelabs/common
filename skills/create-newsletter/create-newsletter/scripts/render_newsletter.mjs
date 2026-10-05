#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { execFileSync } from "node:child_process";

function usage() {
  console.error(
    "Usage: render_newsletter.mjs <input.md> [--html output.html] [--text output.txt]",
  );
  process.exit(1);
}

function ensureParentDir(path) {
  const dir = dirname(path);
  if (dir && dir !== ".") {
    mkdirSync(dir, { recursive: true });
  }
}

async function loadEmailmd() {
  try {
    return await import("emailmd");
  } catch (error) {
    console.log("emailmd not found; running `npm install emailmd`...");
    execFileSync("npm", ["install", "emailmd"], {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    return import("emailmd");
  }
}

const args = process.argv.slice(2);
if (args.length === 0) usage();

const inputArg = args[0];
if (!inputArg || inputArg.startsWith("--")) usage();

let htmlPath;
let textPath;

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--html") {
    htmlPath = args[i + 1];
    i += 1;
  } else if (arg === "--text") {
    textPath = args[i + 1];
    i += 1;
  } else {
    usage();
  }
}

const inputPath = resolve(inputArg);
if (!existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

const base =
  extname(inputPath).toLowerCase() === ".md"
    ? inputPath.slice(0, -3)
    : inputPath;

const htmlOutput = resolve(htmlPath ?? `${base}.html`);
const textOutput = resolve(textPath ?? `${base}.txt`);

const markdown = readFileSync(inputPath, "utf8");
const { render } = await loadEmailmd();
const { html, text, meta } = render(markdown);

ensureParentDir(htmlOutput);
ensureParentDir(textOutput);

writeFileSync(htmlOutput, html);
writeFileSync(textOutput, text);

console.log(
  JSON.stringify(
    {
      markdown: inputPath,
      html: htmlOutput,
      text: textOutput,
      meta,
    },
    null,
    2,
  ),
);
