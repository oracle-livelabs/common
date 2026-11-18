#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const htmlPath = path.join(root, "index.html");
const cssPath = path.join(root, "assets", "css", "dashboard.css");
const jsPath = path.join(root, "assets", "js", "dashboard.js");
const cssMarker = '<link rel="stylesheet" href="./assets/css/dashboard.css">';
const jsMarker = '<script src="./assets/js/dashboard.js"></script>';
const html = fs.readFileSync(htmlPath, "utf8");

function rebaseExtractedCssUrls(css) {
  return css.replace(/url\((["']?)\.\/assets\//g, "url($1../");
}

if (html.includes(cssMarker) || html.includes(jsMarker)) {
  if (!html.includes(cssMarker) || !html.includes(jsMarker) || !fs.existsSync(cssPath) || !fs.existsSync(jsPath)) {
    throw new Error("Dashboard asset split is incomplete.");
  }
  console.log("Dashboard CSS and JavaScript are already split into static assets.");
  process.exit(0);
}

const styleMatches = [...html.matchAll(/<style>([\s\S]*?)<\/style>/gi)];
const inlineScriptMatches = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
if (styleMatches.length !== 1 || inlineScriptMatches.length !== 1) {
  throw new Error(
    `Expected one inline style and one inline script; found ${styleMatches.length} style(s) and ${inlineScriptMatches.length} script(s).`,
  );
}

const css = rebaseExtractedCssUrls(styleMatches[0][1].replace(/^\r?\n/, "").replace(/\s+$/, ""));
const javascript = inlineScriptMatches[0][1].replace(/^\r?\n/, "").replace(/\s+$/, "");
let updatedHtml = html.replace(styleMatches[0][0], cssMarker);
updatedHtml = updatedHtml.replace(inlineScriptMatches[0][0], jsMarker);

fs.mkdirSync(path.dirname(cssPath), { recursive: true });
fs.mkdirSync(path.dirname(jsPath), { recursive: true });
fs.writeFileSync(cssPath, `${css}\n`, "utf8");
fs.writeFileSync(jsPath, `${javascript}\n`, "utf8");
fs.writeFileSync(htmlPath, updatedHtml, "utf8");

console.log(
  JSON.stringify(
    {
      html_before_bytes: Buffer.byteLength(html),
      html_after_bytes: Buffer.byteLength(updatedHtml),
      css_bytes: Buffer.byteLength(css) + 1,
      javascript_bytes: Buffer.byteLength(javascript) + 1,
    },
    null,
    2,
  ),
);
