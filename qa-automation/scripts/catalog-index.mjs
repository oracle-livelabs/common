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
const DEFAULT_SUMMARY_OUTPUT_FILE = path.join(
  PROJECT_ROOT,
  "tests",
  "data",
  "generated",
  "livelabs_catalog_index.summary.json",
);
const CATALOG_PATH = "/livelabs-workshop-cards";
const DEFAULT_NAVIGATION_TIMEOUT_MS = 45_000;
const DEFAULT_WAIT_TIMEOUT_MS = 20_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 3_000;
const CATALOG_RESULT_CAP = 100;
const CATALOG_LEVEL_GROUP = "Level";
const CATALOG_PRIMARY_COVERAGE_GROUP = "Type";
const CATALOG_FALLBACK_COVERAGE_GROUP = "Product";

const HELP = `Generate a LiveLabs catalog index for data-driven QA tests.

Usage:
  node scripts/catalog-index.mjs [options]

Options:
  --environment <name>       Environment from config/project_settings.json.
  --base-url <url>           Override the configured LiveLabs base URL.
  --output <file>            Output JSON file. Defaults to tests/data/generated/livelabs_catalog_index.json.
  --search <term>            Crawl catalog results for a specific search term.
  --catalog-url <url>        Crawl an exact catalog/search URL instead of the default catalog.
  --max-pages <n>            Maximum catalog result pages to crawl. Default: 250.
  --max-items <n>            Optional item cap for local debugging.
  --retries <n>              Retry transient catalog navigation/loading failures. Default: 2.
  --retry-delay-ms <n>       Delay between crawler retries. Default: 3000.
  --summary-output <file>    Summary JSON file. Defaults to tests/data/generated/livelabs_catalog_index.summary.json.
  --storage-state <file>     Optional Playwright storage state for authenticated catalog crawling.
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

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
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

function resolveProxySetting() {
  const proxyServer =
    process.env.QA_PROXY_SERVER?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.http_proxy?.trim();

  if (!proxyServer) {
    return undefined;
  }

  const bypass = process.env.QA_PROXY_BYPASS?.trim() || process.env.NO_PROXY?.trim() || process.env.no_proxy?.trim();

  return {
    server: proxyServer,
    ...(bypass ? { bypass } : {}),
  };
}

function resolveStorageStatePath(value) {
  const configuredPath = value?.trim();
  if (!configuredPath) {
    return undefined;
  }

  const resolvedPath = path.resolve(PROJECT_ROOT, configuredPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Storage state file was not found: ${resolvedPath}`);
  }

  return resolvedPath;
}

function catalogUrl(options) {
  if (options.catalogUrl?.trim()) {
    return options.catalogUrl.trim();
  }

  const url = new URL(`${options.baseUrl}${CATALOG_PATH}`);
  url.searchParams.set("clear", "100");

  if (options.search?.trim()) {
    url.searchParams.set("search", options.search.trim());
  }

  return url.toString();
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
  const preferredParams = ["workshop", "workshop_id", "wid", "p400_id", "id", "p_id", "app_id", "lsid"];

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
  const normalizedUrl = new URL(normalizedHref);
  const type = itemTypeFromHref(normalizedHref);
  const slug = slugify(rawItem.title);
  const explicitId = explicitIdFromUrl(normalizedHref);
  const id = explicitId ?? `${type}-${slug || "item"}-${shortHash(normalizedHref)}`;

  return {
    id,
    slug,
    type,
    title: rawItem.title,
    href: normalizedUrl.pathname + normalizedUrl.search,
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

async function removeCrawlerOverlays(page) {
  await page.evaluate(() => {
    for (const element of document.querySelectorAll(".truste_overlay")) {
      element.remove();
    }
  });
}

async function waitForCards(page) {
  await page.waitForSelector(
    'a.a-CardView-fullLink[href*="view-workshop"], a.a-CardView-fullLink[href*="livestack-landing-page"]',
    { timeout: DEFAULT_WAIT_TIMEOUT_MS },
  );
}

async function waitForCardsWithRetries(page, options, warnings, contextName) {
  let lastError;

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      await waitForCards(page);
      return;
    } catch (error) {
      lastError = error;

      if (attempt >= options.retries) {
        break;
      }

      warnings.push(`${contextName}: card list did not render on attempt ${attempt + 1}; retrying.`);
      await page.waitForTimeout(options.retryDelayMs);
      await page.reload({
        waitUntil: "domcontentloaded",
        timeout: DEFAULT_NAVIGATION_TIMEOUT_MS,
      });
      await dismissCookieBanner(page);
    }
  }

  throw lastError;
}

async function gotoWithRetries(page, url, options, warnings) {
  let lastError;

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: DEFAULT_NAVIGATION_TIMEOUT_MS,
      });
      return;
    } catch (error) {
      lastError = error;

      if (attempt >= options.retries) {
        break;
      }

      warnings.push(`Catalog navigation failed on attempt ${attempt + 1}; retrying.`);
      await page.waitForTimeout(options.retryDelayMs);
    }
  }

  throw lastError;
}

async function collectVisibleCards(page, catalogPage) {
  return page.evaluate((pageNumber) => {
    const cleanText = (value) => (value ?? "").replace(/\s+/g, " ").trim();
    const isGenericActionText = (value) => /^(card action|view|open|details|learn more)$/i.test(cleanText(value));
    const looksLikeTitle = (value) => {
      const text = cleanText(value);

      return (
        text.length >= 6 &&
        text.length <= 180 &&
        /[A-Za-z0-9]/.test(text) &&
        !isGenericActionText(text) &&
        !/^\d+(\.\d+)?\s*(hr|hrs|hour|hours|min|mins|minutes|views?)$/i.test(text)
      );
    };
    const firstVisibleTitle = (card, anchor) => {
      const titleSelectors = [
        ".a-CardView-title",
        ".a-CardView-titleLink",
        ".a-CardView-header",
        ".a-CardView-mainContent h1",
        ".a-CardView-mainContent h2",
        ".a-CardView-mainContent h3",
        ".a-CardView-mainContent h4",
        "h1",
        "h2",
        "h3",
        "h4",
        "[class*='Title']",
        "[class*='title']",
      ];
      const selectorTitle = titleSelectors
        .flatMap((selector) => Array.from(card.querySelectorAll(selector)))
        .map((element) => cleanText(element.textContent))
        .find(looksLikeTitle);

      if (selectorTitle) {
        return selectorTitle;
      }

      const anchorTitle = cleanText(anchor.textContent);
      if (looksLikeTitle(anchorTitle)) {
        return anchorTitle;
      }

      const rawCardText = "innerText" in card ? card.innerText : card.textContent;
      const lineTitle = String(rawCardText ?? "")
        .split(/\n+/)
        .map(cleanText)
        .filter(Boolean)
        .find(looksLikeTitle);

      if (lineTitle) {
        return lineTitle;
      }

      const idMatch = (anchor.getAttribute("href") ?? "").match(/[?&](?:wid|id|p\d+_workshop_id)=([^&]+)/i);
      return idMatch ? `Workshop ${decodeURIComponent(idMatch[1])}` : "";
    };
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
          anchor.parentElement?.closest(".a-CardView, .a-CardView-item, li, article, [class*='Card'], [class*='card']") ??
          anchor.parentElement ??
          anchor;
        const title = firstVisibleTitle(card, anchor);
        const href = anchor.getAttribute("href") ?? "";
        const cardText = cleanText(card.textContent);
        const labels = Array.from(card.querySelectorAll(".a-Badge, .a-Label, [class*='badge'], [class*='tag']"))
          .map((element) => cleanText(element.textContent))
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
  const candidates = page.getByRole("button", { name: "Next", exact: true });

  for (let index = (await candidates.count()) - 1; index >= 0; index -= 1) {
    const candidate = candidates.nth(index);
    const disabled = await candidate.evaluate((element) => {
      const classNames = `${element.className || ""} ${element.parentElement?.className || ""}`.toLowerCase();
      return (
        element.hasAttribute("disabled") ||
        element.getAttribute("aria-disabled") === "true" ||
        classNames.includes("disabled")
      );
    });

    if (!disabled && (await candidate.isVisible()) && (await candidate.isEnabled())) {
      await removeCrawlerOverlays(page);
      await candidate.click({ timeout: DEFAULT_WAIT_TIMEOUT_MS });
      return true;
    }
  }

  return false;
}

async function crawlCatalog(options) {
  const channel = resolveChromiumChannel(options.browserChannel || process.env.QA_BROWSER_CHANNEL);
  const proxy = resolveProxySetting();
  const browser = await chromium.launch({
    headless: !options.headed,
    ...(channel ? { channel } : {}),
    ...(proxy ? { proxy } : {}),
  });
  const context = await browser.newContext({
    ...(options.storageStateFile ? { storageState: options.storageStateFile } : {}),
  });
  const page = await context.newPage();
  const seen = new Map();
  const warnings = [];
  const pageBudget = { used: 0 };
  let strategy = "visible-results";

  try {
    await gotoWithRetries(page, catalogUrl(options), options, warnings);
    await dismissCookieBanner(page);
    await removeCrawlerOverlays(page);

    const shouldEnumerateFullCatalog = !options.search?.trim() && !options.catalogUrl?.trim() && options.maxItems === 0;
    const coverage = shouldEnumerateFullCatalog ? await discoverFullCatalogCoverage(page) : null;

    if (coverage?.plans.length) {
      strategy = "partitioned-facets";
      for (const plan of coverage.plans) {
        if (plan.phase === "fallback" && coverage.targetCount > 0 && seen.size >= coverage.targetCount) {
          break;
        }

        const appliedFacets = [];
        for (const facet of plan.facets) {
          const applied = await setCatalogFacet(page, facet, true, options, warnings);
          if (!applied) break;
          appliedFacets.push(facet);
        }

        if (appliedFacets.length !== plan.facets.length) {
          for (const facet of [...appliedFacets].reverse()) {
            await setCatalogFacet(page, facet, false, options, warnings);
          }
          continue;
        }

        const planLabel = plan.facets.map((facet) => facet.label).join(" + ");
        const result = await collectCatalogResultPages(
          page,
          options,
          warnings,
          seen,
          pageBudget,
          `Catalog facet "${planLabel}"`,
        );

        for (const facet of [...plan.facets].reverse()) {
          await setCatalogFacet(page, facet, false, options, warnings);
        }

        if (
          result.reachedItemCap ||
          result.reachedPageCap
        ) {
          break;
        }
      }

      if (coverage.targetCount > 0 && seen.size < coverage.targetCount) {
        warnings.push(
          `Catalog coverage found ${seen.size} of at least ${coverage.targetCount} advertised workshops and LiveStacks.`,
        );
      }
    } else {
      if (shouldEnumerateFullCatalog) {
        warnings.push(
          "Catalog coverage facets were not available. The index contains only the visible catalog result set.",
        );
      }
      await collectCatalogResultPages(page, options, warnings, seen, pageBudget, "Catalog");
    }

    return {
      items: [...seen.values()].sort((left, right) => left.title.localeCompare(right.title)),
      warnings,
      strategy,
      coverageFacets: coverage?.labels || [],
    };
  } finally {
    await browser.close();

    if (warnings.length > 0) {
      for (const warning of warnings) {
        console.warn(`Warning: ${warning}`);
      }
    }
  }
}

async function discoverFullCatalogCoverage(page) {
  const facets = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input[type='checkbox'][id]"))
      .map((input) => {
        const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        const listbox = input.closest("[role='listbox']");
        const badge = label?.querySelector("[data-count]");
        return {
          id: input.id,
          group: listbox?.getAttribute("aria-label")?.trim() || "",
          label: label?.querySelector(".label")?.textContent?.replace(/\s+/g, " ").trim() || "",
          count: Number(String(badge?.getAttribute("data-count") || "0").replace(/,/g, "")) || 0,
        };
      })
      .filter((facet) => facet.group && facet.label),
  );
  const levels = facets.filter((facet) => facet.group === CATALOG_LEVEL_GROUP);
  const primary = facets.filter((facet) => facet.group === CATALOG_PRIMARY_COVERAGE_GROUP);
  const fallback = facets.filter((facet) => facet.group === CATALOG_FALLBACK_COVERAGE_GROUP);
  const expectedCount = levels.reduce((count, facet) => count + facet.count, 0);
  const liveStackCount = primary.find((facet) => facet.label === "LiveStack")?.count || 0;
  const targetCount = expectedCount + liveStackCount;
  const primaryPlans = partitionFacetGroup(primary, levels).map((facets) => ({ facets, phase: "primary" }));
  const fallbackPlans = partitionFacetGroup(fallback, levels).map((facets) => ({ facets, phase: "fallback" }));

  return {
    expectedCount,
    targetCount,
    plans: [...primaryPlans, ...fallbackPlans],
    labels: [
      `${CATALOG_PRIMARY_COVERAGE_GROUP} (${primary.length} values)`,
      `${CATALOG_FALLBACK_COVERAGE_GROUP} (${fallback.length} values)`,
      `${CATALOG_LEVEL_GROUP} (${levels.length} values)`,
    ],
  };
}

function partitionFacetGroup(facets, levels) {
  return facets.flatMap((facet) =>
    facet.count > CATALOG_RESULT_CAP && levels.length
      ? levels.map((level) => [facet, level])
      : [[facet]],
  );
}

async function setCatalogFacet(page, facet, selected, options, warnings) {
  const input = page.locator(`#${facet.id}`);
  const currentState = await input.isChecked().catch(() => false);
  if (currentState === selected) return true;

  await removeCrawlerOverlays(page);
  const option = input.locator("..");
  const unavailable =
    (await option.getAttribute("aria-disabled")) === "true" ||
    /\bis-disabled\b/i.test((await option.getAttribute("class")) || "");
  if (selected && unavailable) return false;

  await prepareFacetRefreshWait(page, facet);
  await option.dispatchEvent("click");
  await page.waitForFunction(
    ({ id, expected }) => document.getElementById(id)?.checked === expected,
    { id: facet.id, expected: selected },
    { timeout: DEFAULT_WAIT_TIMEOUT_MS },
  );
  await page.waitForFunction(
    (marker) => window.__qaCatalogFacetRefresh === marker,
    facet.refreshMarker,
    { timeout: DEFAULT_WAIT_TIMEOUT_MS },
  );
  await page.waitForTimeout(500);
  await waitForCardsWithRetries(page, options, warnings, `Catalog facet "${facet.label}"`);
  return true;
}

async function prepareFacetRefreshWait(page, facet) {
  facet.refreshMarker = `${Date.now()}-${Math.random()}`;
  await page.evaluate(
    ({ marker, regionId }) => {
      window.__qaCatalogFacetRefresh = "";
      const region = document.getElementById(regionId);
      window.apex?.jQuery(region).one("apexafterrefresh.qaCatalog", () => {
        window.__qaCatalogFacetRefresh = marker;
      });
    },
    {
      marker: facet.refreshMarker,
      regionId: facet.id.split("_fr_")[0],
    },
  );
}

async function collectCatalogResultPages(page, options, warnings, seen, pageBudget, contextName) {
  while (pageBudget.used < options.maxPages) {
    pageBudget.used += 1;
    const catalogPage = pageBudget.used;
    await waitForCardsWithRetries(page, options, warnings, `${contextName}, result page ${catalogPage}`);
    const rawItems = await collectVisibleCards(page, catalogPage);

    for (const rawItem of rawItems) {
      const item = buildCatalogItem(options.baseUrl, rawItem);
      const key = `${item.type}|${item.normalized_href}`;

      if (!seen.has(key)) {
        seen.set(key, item);
      }

      if (options.maxItems && seen.size >= options.maxItems) {
        return { reachedItemCap: true, reachedPageCap: false };
      }
    }

    const before = await cardSignature(page);
    const hasNext = await clickNextPage(page);
    if (!hasNext) {
      return { reachedItemCap: false, reachedPageCap: false };
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
      warnings.push(`${contextName}: Next clicked but the card set did not change before timeout.`);
      return { reachedItemCap: false, reachedPageCap: false };
    }
  }

  warnings.push(`Catalog crawl stopped after reaching the ${options.maxPages}-page limit.`);
  return { reachedItemCap: false, reachedPageCap: true };
}

function buildIndex(options, items, warnings, crawlMetadata = {}) {
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
    catalog_url: catalogUrl(options),
    item_count: items.length,
    counts,
    crawl: {
      strategy: crawlMetadata.strategy || "visible-results",
      coverage_facets: crawlMetadata.coverageFacets || [],
      max_pages: options.maxPages,
      max_items: options.maxItems,
      retries: options.retries,
      retry_delay_ms: options.retryDelayMs,
      warnings,
    },
    items,
  };
}

function writeIndex(outputFile, index) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(index, null, 2)}\n`, "utf-8");
}

function buildSummary(index, outputFile) {
  const pages = new Map();

  for (const item of index.items) {
    const pageSummary = pages.get(item.catalog_page) ?? { page: item.catalog_page, workshop: 0, livestack: 0, total: 0 };
    pageSummary[item.type] += 1;
    pageSummary.total += 1;
    pages.set(item.catalog_page, pageSummary);
  }

  return {
    generated_at: index.generated_at,
    base_url: index.base_url,
    catalog_url: index.catalog_url,
    output_file: outputFile,
    item_count: index.item_count,
    counts: index.counts,
    pages: [...pages.values()].sort((left, right) => left.page - right.page),
    warnings: index.crawl.warnings,
    recommended_shards: [1, 2, 4, 8].filter((shardCount) => index.item_count >= shardCount),
  };
}

function writeSummary(summaryOutputFile, summary) {
  fs.mkdirSync(path.dirname(summaryOutputFile), { recursive: true });
  fs.writeFileSync(summaryOutputFile, `${JSON.stringify(summary, null, 2)}\n`, "utf-8");
}

function parseCliArgs(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      environment: { type: "string" },
      "base-url": { type: "string" },
      output: { type: "string" },
      search: { type: "string" },
      "catalog-url": { type: "string" },
      "max-pages": { type: "string" },
      "max-items": { type: "string" },
      retries: { type: "string" },
      "retry-delay-ms": { type: "string" },
      "summary-output": { type: "string" },
      "storage-state": { type: "string" },
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
    search: values.search || process.env.QA_CATALOG_SEARCH,
    catalogUrl: values["catalog-url"] || process.env.QA_CATALOG_URL,
    outputFile: path.resolve(PROJECT_ROOT, values.output || process.env.QA_CATALOG_INDEX_FILE || DEFAULT_OUTPUT_FILE),
    summaryOutputFile: path.resolve(
      PROJECT_ROOT,
      values["summary-output"] || process.env.QA_CATALOG_INDEX_SUMMARY_FILE || DEFAULT_SUMMARY_OUTPUT_FILE,
    ),
    maxPages: parsePositiveInteger(values["max-pages"] || process.env.QA_CATALOG_INDEX_MAX_PAGES, 250),
    maxItems: parseNonNegativeInteger(values["max-items"] || process.env.QA_CATALOG_INDEX_MAX_ITEMS, 0),
    retries: parseNonNegativeInteger(values.retries || process.env.QA_CATALOG_INDEX_RETRIES, DEFAULT_RETRIES),
    retryDelayMs: parseNonNegativeInteger(
      values["retry-delay-ms"] || process.env.QA_CATALOG_INDEX_RETRY_DELAY_MS,
      DEFAULT_RETRY_DELAY_MS,
    ),
    storageStateFile: resolveStorageStatePath(values["storage-state"] || process.env.QA_STORAGE_STATE),
    headed: values.headed === true || ["1", "true", "yes", "on"].includes(String(process.env.QA_HEADED ?? "").toLowerCase()),
    browserChannel: values["browser-channel"],
  };
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  console.log(`Catalog : ${catalogUrl(options)}`);
  console.log(`Output  : ${options.outputFile}`);
  console.log(`Summary : ${options.summaryOutputFile}`);
  console.log(`Pages   : up to ${options.maxPages}`);
  console.log(`Retries : ${options.retries}`);
  console.log(`Auth    : ${options.storageStateFile ? "storage state" : "anonymous"}`);

  const crawlResult = await crawlCatalog(options);
  const index = buildIndex(options, crawlResult.items, crawlResult.warnings, {
    strategy: crawlResult.strategy,
    coverageFacets: crawlResult.coverageFacets,
  });
  writeIndex(options.outputFile, index);
  writeSummary(options.summaryOutputFile, buildSummary(index, options.outputFile));

  console.log(`Indexed : ${index.item_count} cards (${index.counts.workshop} workshops, ${index.counts.livestack} LiveStacks)`);
  console.log(`Strategy: ${index.crawl.strategy}`);
  console.log(`Warnings: ${index.crawl.warnings.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
