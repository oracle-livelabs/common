#!/usr/bin/env node

import crypto from "node:crypto";
import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const fileFallbackBuilder = path.join(root, "dev", "scripts", "build-file-inventory-fallback.mjs");
const args = process.argv.slice(2);
const outputFlag = args.indexOf("--output");
const replaceExisting = args.includes("--replace");

if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node scripts/build-static-release.mjs --output <directory> [--replace]");
  console.log("Builds in a sibling staging directory, verifies the manifest, then atomically promotes the result.");
  console.log("Existing output is preserved unless --replace is explicit; replacement keeps a dated previous directory.");
  process.exit(0);
}
if (outputFlag >= 0 && !args[outputFlag + 1]) throw new Error("--output requires a directory.");

const output = path.resolve(root, outputFlag >= 0 ? args[outputFlag + 1] : "dev/releases/local");
if (output === root) throw new Error("Release output must be a separate directory.");
if (fs.existsSync(output) && !replaceExisting) {
  throw new Error(`Release output already exists: ${output}. Use a new immutable path or pass --replace for a recoverable local replacement.`);
}

childProcess.execFileSync(process.execPath, [fileFallbackBuilder], { cwd: root, stdio: "inherit" });

const releaseInputs = [
  { source: "index.html", target: "index.html" },
  { source: "inventory/index.html", target: "inventory/index.html" },
  { source: "dev/config/.nojekyll", target: ".nojekyll" },
  { source: "dev/config/release-manifest.json", target: "release-manifest.json" },
  { source: "assets", target: "assets" },
  { source: "inventory/data/portfolio_inventory.json", target: "inventory/data/portfolio_inventory.json" },
  { source: "inventory/data/portfolio_inventory.file.js", target: "inventory/data/portfolio_inventory.file.js" },
];
const staging = `${output}.staging-${process.pid}-${Date.now()}`;

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function walkFiles(directory, base = directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(filePath, base));
    else files.push(path.relative(base, filePath).replaceAll(path.sep, "/"));
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function releaseFileEntries(directory) {
  return walkFiles(directory)
    .filter((relativePath) => relativePath !== "release-manifest.json")
    .map((relativePath) => {
      const filePath = path.join(directory, relativePath);
      return { relativePath, filePath };
    })
    .map(({ relativePath, filePath }) => ({
      path: relativePath,
      bytes: fs.statSync(filePath).size,
      sha256: sha256(filePath),
    }));
}

function verifyManifest(directory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "release-manifest.json"), "utf8"));
  const actual = releaseFileEntries(directory);
  const declared = manifest.release_files || [];
  if (actual.length !== declared.length) throw new Error(`Manifest file-count mismatch: ${declared.length} declared, ${actual.length} actual.`);
  for (let index = 0; index < actual.length; index += 1) {
    const expected = declared[index];
    const observed = actual[index];
    if (expected.path !== observed.path || expected.bytes !== observed.bytes || expected.sha256 !== observed.sha256) {
      throw new Error(`Manifest mismatch for ${observed.path || expected.path}.`);
    }
  }
  return manifest;
}

let previousOutput = null;
try {
  fs.mkdirSync(staging, { recursive: false });
  for (const { source: sourceRelativePath, target: targetRelativePath } of releaseInputs) {
    const source = path.join(root, sourceRelativePath);
    const target = path.join(staging, targetRelativePath);
    if (!fs.existsSync(source)) throw new Error(`Missing release input: ${relativePath}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, { recursive: true });
  }

  const manifestPath = path.join(staging, "release-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const inventoryData = JSON.parse(fs.readFileSync(path.join(staging, "inventory/data/portfolio_inventory.json"), "utf8"));
  manifest.data_snapshot = {
    ...(manifest.data_snapshot || {}),
    portfolio_inventory_generated_at: inventoryData.metadata?.generated_at || null,
    canonical_portfolio_payload: "inventory/data/portfolio_inventory.json",
  };
  manifest.release_files = releaseFileEntries(staging);
  const contentIdentity = crypto.createHash("sha256").update(JSON.stringify(manifest.release_files)).digest("hex").slice(0, 16);
  const version = String(manifest.bundle_version || "unversioned").replace(/[^a-z0-9._-]+/gi, "-");
  manifest.release_id = `${version}-${contentIdentity}`;
  manifest.release_built_at = new Date().toISOString();
  manifest.release_layout = {
    immutable_prefix: `releases/${manifest.release_id}/`,
    promotion_method: "change the approved gateway or stable route target; do not overwrite this prefix",
    rollback_method: "point the approved gateway or stable route at the previously validated release prefix",
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const verifiedManifest = verifyManifest(staging);

  if (fs.existsSync(output)) {
    const suffix = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    previousOutput = `${output}.previous-${suffix}`;
    fs.renameSync(output, previousOutput);
  }
  try {
    fs.renameSync(staging, output);
  } catch (error) {
    if (previousOutput && !fs.existsSync(output) && fs.existsSync(previousOutput)) fs.renameSync(previousOutput, output);
    throw error;
  }

  const totalBytes = verifiedManifest.release_files.reduce((total, file) => total + file.bytes, 0);
  console.log(`Static release written atomically to ${output}`);
  console.log(`Release ID: ${verifiedManifest.release_id}`);
  console.log(`${verifiedManifest.release_files.length} files, ${totalBytes} bytes`);
  if (previousOutput) console.log(`Previous output preserved at ${previousOutput}`);
} catch (error) {
  if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
  throw error;
}
