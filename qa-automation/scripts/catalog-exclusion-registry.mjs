#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 32447;
const DEFAULT_FILE = "/var/qa-config/catalog-exclusions.json";
const MAX_REQUEST_BYTES = 8 * 1024;
const ACTION_HEADER = "manage-catalog-exclusions";
const ITEM_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export class RegistryError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "RegistryError";
    this.statusCode = statusCode;
  }
}

export function readRegistry(filePath) {
  if (!fs.existsSync(filePath)) return { schema_version: 1, items: [] };

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!parsed || parsed.schema_version !== 1 || !Array.isArray(parsed.items)) {
    throw new RegistryError("The exclusion registry has an invalid format.", 500);
  }

  return {
    schema_version: 1,
    items: parsed.items.map(normalizeStoredItem).filter(Boolean),
  };
}

export function writeRegistry(filePath, registry) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryFile = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(registry, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporaryFile, filePath);
}

export function createCatalogExclusionServer(options = {}) {
  const filePath = options.filePath || process.env.QA_CATALOG_EXCLUSIONS_FILE || DEFAULT_FILE;

  return http.createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("X-Content-Type-Options", "nosniff");

    try {
      if (request.method === "GET" && request.url === "/healthz") {
        sendJson(response, 200, { status: "ok" });
        return;
      }

      if (request.method === "GET" && request.url === "/api/catalog-exclusions") {
        sendJson(response, 200, readRegistry(filePath));
        return;
      }

      if (request.method === "POST" && request.url === "/api/catalog-exclusions") {
        requireActionHeader(request);
        const item = normalizeRequestItem(await readJsonBody(request));
        const registry = readRegistry(filePath);
        registry.items = [...registry.items.filter((entry) => entry.id !== item.id), item].sort((a, b) =>
          a.id.localeCompare(b.id),
        );
        writeRegistry(filePath, registry);
        sendJson(response, 200, registry);
        return;
      }

      const itemMatch = request.url?.match(/^\/api\/catalog-exclusions\/([^/?#]+)$/);
      if (request.method === "DELETE" && itemMatch) {
        requireActionHeader(request);
        const id = decodeURIComponent(itemMatch[1]);
        validateId(id);
        const registry = readRegistry(filePath);
        registry.items = registry.items.filter((entry) => entry.id !== id);
        writeRegistry(filePath, registry);
        sendJson(response, 200, registry);
        return;
      }

      sendJson(response, 404, { error: "Not found." });
    } catch (error) {
      sendJson(response, error instanceof RegistryError ? error.statusCode : 500, {
        error: error instanceof RegistryError ? error.message : "The exclusion registry could not be updated.",
      });
    }
  });
}

function requireActionHeader(request) {
  if (request.headers["x-qa-action"] !== ACTION_HEADER) {
    throw new RegistryError("The exclusion action header is missing.", 403);
  }
}

function normalizeRequestItem(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RegistryError("The request must contain one workshop.", 400);
  }

  const id = String(value.id || "").trim();
  validateId(id);
  return {
    id,
    title: limitedText(value.title, 300),
    reason: limitedText(value.reason, 500) || "Retired workshop confirmed by the content owner",
  };
}

function normalizeStoredItem(value) {
  try {
    return normalizeRequestItem(value);
  } catch {
    return undefined;
  }
}

function validateId(id) {
  if (!ITEM_ID_PATTERN.test(id)) {
    throw new RegistryError("The workshop ID is missing or invalid.", 400);
  }
}

function limitedText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

async function readJsonBody(request) {
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    throw new RegistryError("The request must use application/json.", 415);
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) throw new RegistryError("The request is too large.", 413);
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}");
  } catch {
    throw new RegistryError("The request body is not valid JSON.", 400);
  }
}

function sendJson(response, statusCode, value) {
  response.statusCode = statusCode;
  response.end(`${JSON.stringify(value)}\n`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const port = Number(process.env.QA_EXCLUSION_REGISTRY_INTERNAL_PORT || DEFAULT_PORT);
  const server = createCatalogExclusionServer();
  server.listen(port, "0.0.0.0", () => {
    process.stdout.write(`Catalog exclusion registry listening on ${port}\n`);
  });
}
