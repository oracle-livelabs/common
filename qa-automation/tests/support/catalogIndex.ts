import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { PROJECT_ROOT, parseIntegerFlag } from "../../config/projectConfig.js";

export type CatalogIndexItemType = "workshop" | "livestack";

export interface CatalogIndexItem {
  id: string;
  slug: string;
  type: CatalogIndexItemType;
  title: string;
  href: string;
  normalized_href: string;
  absolute_url: string;
  catalog_page: number;
  catalog_position: number;
  card_text: string;
  labels: string[];
}

export interface CatalogIndex {
  schema_version: 1;
  generated_at: string;
  generator: string;
  base_url: string;
  catalog_url: string;
  item_count: number;
  counts: Record<CatalogIndexItemType, number>;
  items: CatalogIndexItem[];
}

export type CatalogIndexLoadResult =
  | {
      status: "loaded";
      filePath: string;
      index: CatalogIndex;
    }
  | {
      status: "missing";
      filePath: string;
      message: string;
    };

const DEFAULT_CATALOG_INDEX_FILE = path.join(
  PROJECT_ROOT,
  "tests",
  "data",
  "generated",
  "livelabs_catalog_index.json",
);
const STOP_WORDS = new Set([
  "about",
  "and",
  "build",
  "create",
  "demo",
  "from",
  "into",
  "livelab",
  "livelabs",
  "livestack",
  "oracle",
  "overview",
  "the",
  "this",
  "using",
  "with",
  "workshop",
]);

let cachedLoadResult: CatalogIndexLoadResult | undefined;

export function resolveCatalogIndexFile(): string {
  const configuredFile = process.env.QA_CATALOG_INDEX_FILE?.trim();

  if (!configuredFile) {
    return DEFAULT_CATALOG_INDEX_FILE;
  }

  return path.isAbsolute(configuredFile) ? configuredFile : path.resolve(PROJECT_ROOT, configuredFile);
}

export function loadCatalogIndex(): CatalogIndexLoadResult {
  if (cachedLoadResult) {
    return cachedLoadResult;
  }

  const filePath = resolveCatalogIndexFile();

  if (!existsSync(filePath)) {
    cachedLoadResult = {
      status: "missing",
      filePath,
      message: `Catalog index file was not found at ${filePath}. Run "npm run catalog:index" before the generated suite.`,
    };
    return cachedLoadResult;
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf-8")) as unknown;
  assertCatalogIndex(parsed, filePath);

  cachedLoadResult = {
    status: "loaded",
    filePath,
    index: parsed,
  };
  return cachedLoadResult;
}

export function catalogIndexItems(type?: CatalogIndexItemType): CatalogIndexItem[] {
  const loadResult = loadCatalogIndex();
  if (loadResult.status !== "loaded") {
    return [];
  }

  const allowedIds = parseList(process.env.QA_CATALOG_INDEX_IDS);
  const configuredLimit = parseIntegerFlag(process.env.QA_CATALOG_INDEX_LIMIT, 0);
  const filteredItems = loadResult.index.items.filter((item) => {
    if (type && item.type !== type) {
      return false;
    }

    if (allowedIds.length === 0) {
      return true;
    }

    return allowedIds.includes(item.id) || allowedIds.includes(item.slug);
  });

  return configuredLimit > 0 ? filteredItems.slice(0, configuredLimit) : filteredItems;
}

export function catalogItemTestTitle(item: CatalogIndexItem): string {
  const prefix = item.type === "livestack" ? "LiveStack" : "workshop";
  const title = `${prefix}: ${item.title}`;

  return title.length <= 160 ? title : `${title.slice(0, 157)}...`;
}

export function expectedTermsForCatalogItem(item: CatalogIndexItem, maxTerms = 3): string[] {
  const words = item.title
    .replace(/[^A-Za-z0-9+#. ]+/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => word.length >= 3)
    .filter((word) => !STOP_WORDS.has(word.toLowerCase()));

  return Array.from(new Set(words)).slice(0, maxTerms);
}

function assertCatalogIndex(value: unknown, filePath: string): asserts value is CatalogIndex {
  if (!isRecord(value)) {
    throw new Error(`Catalog index must be a JSON object: ${filePath}`);
  }

  if (value.schema_version !== 1) {
    throw new Error(`Unsupported catalog index schema_version in ${filePath}: ${String(value.schema_version)}`);
  }

  if (!Array.isArray(value.items)) {
    throw new Error(`Catalog index must contain an items array: ${filePath}`);
  }

  for (const [index, item] of value.items.entries()) {
    assertCatalogIndexItem(item, `${filePath} items[${index}]`);
  }
}

function assertCatalogIndexItem(value: unknown, context: string): asserts value is CatalogIndexItem {
  if (!isRecord(value)) {
    throw new Error(`Catalog index item must be an object: ${context}`);
  }

  for (const field of ["id", "slug", "title", "href", "normalized_href", "absolute_url", "card_text"]) {
    if (typeof value[field] !== "string") {
      throw new Error(`Catalog index item field "${field}" must be a string: ${context}`);
    }
  }

  if (value.type !== "workshop" && value.type !== "livestack") {
    throw new Error(`Catalog index item type must be workshop or livestack: ${context}`);
  }

  if (typeof value.catalog_page !== "number" || typeof value.catalog_position !== "number") {
    throw new Error(`Catalog index item must include numeric catalog_page and catalog_position: ${context}`);
  }

  if (!Array.isArray(value.labels) || value.labels.some((label) => typeof label !== "string")) {
    throw new Error(`Catalog index item labels must be a string array: ${context}`);
  }
}

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
