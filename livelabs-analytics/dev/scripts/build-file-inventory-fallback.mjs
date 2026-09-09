#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = path.join(root, "inventory", "data", "portfolio_inventory.json");
const output = path.join(root, "inventory", "data", "portfolio_inventory.file.js");
const payloadText = fs.readFileSync(source, "utf8").trim();
const payload = JSON.parse(payloadText);

if (!Array.isArray(payload.records)) throw new Error("Canonical inventory payload must contain a records array.");

const generated = [
  "/* Generated from portfolio_inventory.json. Do not edit directly. */",
  `globalThis.__livelabsPortfolioInventoryPayload = ${payloadText};`,
  ""
].join("\n");

fs.writeFileSync(output, generated, "utf8");
console.log(`File-safe Inventory payload written to ${output} (${payload.records.length} records).`);
