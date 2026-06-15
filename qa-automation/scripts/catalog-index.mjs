#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(__filename), "..");
const SETTINGS_FILE = path.join(PROJECT_ROOT, "config", "project_settings.json");
const DEFAULT_OUTPUT_FILE = path.join(PROJECT_ROOT, "tests", "data", "generated", "livelabs_catalog_index.json");
const CATALOG_PATH = "/livelabs-workshop-cards";
const DEFAULT_NAVIGATION_TIMEOUT_MS = 45_000;
const DEFAULT_WAIT_TIMEOUT_MS = 20_000;

const HELP = `Generate a LiveLabs catalog index for data-driven QA tests.

Usage:
  node scripts/catalog-index.mjs [options]

Options:
  --environment <name>       Environment from config/project_settings.json.
  --base-url <url>           Override the configured LiveLabs base URL.
  --output <file>            Output JSON file. Defaults to tests/data/generated/livelabs_catalog_index.json.
  --max-pages <n>            Maximum catalog result pages to crawl. Default: 250.
  --max-items <n>            Optional item cap for local debugging.
  --headed                   Show the browser while crawling.
  --browser-channel <name>   Chromium channel, usually msedge or chrome.
  --help                     Show this help text.

The generated file is intentionally ignored by Git. Commit the crawler and tests,
then regenerate the index in CI or before running the generated suite.
`;

function loadSettings() {
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
}

function resolveBaseUrl(environmentName, explicitBaseUrl) {
  if (explicitBaseUrl?.trim()) {
    return explicitBaseUrl.trim().replace(/\/+$/, "");
  }

  const settings = loadSettings();
  const resolvedEnvironment = environmentName || settings.default_environment;
  const environment = settings.environments[resolvedEnvironment];

  if (!environment) {
    throw new Error(
      `Unknown environment "${resolvedEnvironment}". Available environments: ${Object.keys(settings.environments)
        .sort()
        .join(", ")}.`,
    );
  }

  return String(environment.base_url).replace(/\/+$/, "");
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveChromiumChannel(explicitChannel) {
  if (explicitChannel?.trim()) {
    return explicitChannel.trim();
  }

  if (process.platform !== "win32") {
    return undefined;
  }

  const candidates = [
    { channel: "msedge", executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" },
    { channel: "msedge", executablePath: "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe" },
    { channel: "chrome", executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" },
    { channel: "chrome", executablePath: "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" },
  ];

  return candidates.find((candidate) => fs.existsSync(candidate.executablePath))?.channel;
}

function catalogUrl(baseUrl) {
  return `${baseUrl}${CATALOG_PATH}?clear=100`;
}

function normalizeAbsoluteUrl(baseUrl, href) {
  return new URL(href, `${baseUrl}/`).toString();
}

function normalizeHref(baseUrl, href) {
  const url = new URL(href, `${baseUrl}/`);
  const sessionParamNames = ["session", "cs", "p_instance", "x01"];

  for (const paramName of sessionParamNames) {
    url.searchParams.delete(paramName);
  }

  url.hash = "";
  return url.toString();
}

function itemTypeFromHref(href) {
  return href.includes("livestack-landing-page") ? "livestack" : "workshop";
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function shortHash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function explicitIdFromUrl(urlValue) {
  const url = new URL(urlValue);
  const preferredParams = ["workshop", "workshop_id", "wid", "id", "p_id", "app_id", "lsid"];

  for (const paramName of preferredParams) {
    const value = url.searchParams.get(paramName);
    if (value?.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function buildCatalogItem(baseUrl, rawItem) {
  const normalizedHref = normalizeHref(baseUrl, rawItem.href);
  const absoluteUrl = normalizeAbsoluteUrl(baseUrl, rawItem.href);
  const type = itemTypeFromHref(normalizedHref);
  const slug = slugify(rawItem.title);
  const explicitId = explicitIdFromUrl(normalizedHref);
  const id = explicitId ?? `${type}-${slug || "item"}-${shortHash(normalizedHref)}`;

  return {
    id,
    slug,
    type,
    title: rawItem.title,
    href: rawItem.href,
    normalized_href: normalizedHref,
    absolute_url: normalizedHref,
    catalog_page: rawItem.catalogPage,
    catalog_position: rawItem.catalogPosition,
    card_text: rawItem.cardText,
    labels: rawItem.labels,
  };
}

async function dismissCookieBanner(page) {
  for (const buttonName of ["Decline all", "Accept all"]) {
    const button = page.getByRole("button", { name: buttonName }).first();
    try {
      await button.click({ timeout: 2_000 });
      return;
    } catch {
      continue;
    }
  }
}

async function waitForCards(page) {
  await page.waitForSelector(
    'a.a-CardView-fullLink[href*="view-workshop"], a.a-CardView-fullLink[href*="livestack-landing-page"]',
    { timeout: DEFAULT_WAIT_TIMEOUT_MS },
  );
}

async function collectVisibleCards(page, catalogPage) {
  return page.evaluate((pageNumber) => {
    const anchors = Array.from(
      document.querySelectorAll(
        'a.a-CardView-fullLink[href*="view-workshop"], a.a-CardView-fullLink[href*="livestack-landing-page"]',
      ),
    );

    return anchors
      .filter((anchor) => {
        const box = anchor.getBoundingClientRect();
        const style = window.getComputedStyle(anchor);

        return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      })
      .map((anchor, index) => {
        const card =
          anchor.closest(".a-CardView-item, .a-CardView, li, article, [class*='Card'], [class*='card']") ?? anchor;
        const title = (anchor.textContent ?? "").replace(/\s+/g, " ").trim();
        const href = anchor.getAttribute("href") ?? "";
        const cardText = (card.textContent ?? "").replace(/\s+/g, " ").trim();
        const labels = Array.from(card.querySelectorAll(".a-Badge, .a-Label, [class*='badge'], [class*='tag']"))
          .map((element) => (element.textContent ?? "").replace(/\s+/g, " ").trim())
          .filter(Boolean);

        return {
          title,
          href,
          catalogPage: pageNumber,
          catalogPosition: index + 1,
          cardText,
          labels: Array.from(new Set(labels)),
        };
      })
      .filter((item) => item.title && item.href);
  }, catalogPage);
}

async function cardSignature(page) {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        'a.a-CardView-fullLink[href*="view-workshop"], a.a-CardView-fullLink[href*="livestack-landing-page"]',
      ),
    )
      .slice(0, 5)
      .map((anchor) => `${(anchor.textContent ?? "").replace(/\s+/g, " ").trim()}|${anchor.getAttribute("href") ?? ""}`)
      .join("\n"),
  );
}

async function clickNextPage(page) {
  return page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll("button, a, [role='button']"));
    const next = candidates.find((element) => {
      const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
      const label = element.getAttribute("aria-label") ?? "";
      const title = element.getAttribute("title") ?? "";
      const name = `${text} ${label} ${title}`;
      const box = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const disabled =
        element.hasAttribute("disabled") ||
        element.getAttribute("aria-disabled") === "true" ||
        element.className.toString().toLowerCase().includes("disabled");

      return /(^|\s)next(\s|$)/i.test(name) && box.width > 0 && box.height > 0 && style.visibility !== "hidden" && !disabled;
    });

    if (!next) {
      return false;
    }

    next.click();
    return true;
  });
}

async function crawlCatalog(options) {
  const channel = resolveChromiumChannel(options.browserChannel || process.env.QA_BROWSER_CHANNEL);
  const browser = await chromium.launch({
    headless: !options.headed,
    ...(channel ? { channel } : {}),
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const seen = new Map();
  const warnings = [];

  try {
    await page.goto(catalogUrl(options.baseUrl), {
      waitUntil: "domcontentloaded",
      timeout: DEFAULT_NAVIGATION_TIMEOUT_MS,
    });
    await dismissCookieBanner(page);

    for (let pageNumber = 1; pageNumber <= options.maxPages; pageNumber += 1) {
      await waitForCards(page);
      const rawItems = await collectVisibleCards(page, pageNumber);

      for (const rawItem of rawItems) {
        const item = buildCatalogItem(options.baseUrl, rawItem);
        const key = `${item.type}|${item.normalized_href}`;

        if (!seen.has(key)) {
          seen.set(key, item);
        }

        if (options.maxItems && seen.size >= options.maxItems) {
          return [...seen.values()];
        }
      }

      const before = await cardSignature(page);
      const hasNext = await clickNextPage(page);
      if (!hasNext) {
        break;
      }

      try {
        await page.waitForFunction(
          (previousSignature) =>
            Array.from(
              document.querySelectorAll(
                'a.a-CardView-fullLink[href*="view-workshop"], a.a-CardView-fullLink[href*="livestack-landing-page"]',
              ),
            )
              .slice(0, 5)
              .map((anchor) => `${(anchor.textContent ?? "").replace(/\s+/g, " ").trim()}|${anchor.getAttribute("href") ?? ""}`)
              .join("\n") !== previousSignature,
          before,
          { timeout: DEFAULT_WAIT_TIMEOUT_MS },
        );
      } catch {
        warnings.push(`Catalog page ${pageNumber}: Next clicked but card signature did not change before timeout.`);
        break;
      }
    }

    return [...seen.values()].sort((left, right) => left.title.localeCompare(right.title));
  } finally {
    await browser.close();

    if (warnings.length > 0) {
      for (const warning of warnings) {
        console.warn(`Warning: ${warning}`);
      }
    }
  }
}

function buildIndex(options, items) {
  const counts = items.reduce(
    (accumulator, item) => {
      accumulator[item.type] += 1;
      return accumulator;
    },
    { workshop: 0, livestack: 0 },
  );

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/catalog-index.mjs",
    base_url: options.baseUrl,
    catalog_url: catalogUrl(options.baseUrl),
    item_count: items.length,
    counts,
    items,
  };
}

function writeIndex(outputFile, index) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(index, null, 2)}\n`, "utf-8");
}

function parseCliArgs(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      environment: { type: "string" },
      "base-url": { type: "string" },
      output: { type: "string" },
      "max-pages": { type: "string" },
      "max-items": { type: "string" },
      headed: { type: "boolean" },
      "browser-channel": { type: "string" },
      help: { type: "boolean" },
    },
    strict: true,
  });

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }

  return {
    environment: values.environment,
    baseUrl: resolveBaseUrl(values.environment, values["base-url"] || process.env.QA_BASE_URL),
    outputFile: path.resolve(PROJECT_ROOT, values.output || process.env.QA_CATALOG_INDEX_FILE || DEFAULT_OUTPUT_FILE),
    maxPages: parsePositiveInteger(values["max-pages"] || process.env.QA_CATALOG_INDEX_MAX_PAGES, 250),
    maxItems: values["max-items"] ? parsePositiveInteger(values["max-items"], 0) : 0,
    headed: values.headed === true || ["1", "true", "yes", "on"].includes(String(process.env.QA_HEADED ?? "").toLowerCase()),
    browserChannel: values["browser-channel"],
  };
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  console.log(`Catalog : ${catalogUrl(options.baseUrl)}`);
  console.log(`Output  : ${options.outputFile}`);
  console.log(`Pages   : up to ${options.maxPages}`);

  const items = await crawlCatalog(options);
  const index = buildIndex(options, items);
  writeIndex(options.outputFile, index);

  console.log(`Indexed : ${index.item_count} cards (${index.counts.workshop} workshops, ${index.counts.livestack} LiveStacks)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
