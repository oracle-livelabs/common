import type { Frame, Page } from "@playwright/test";

import { parseIntegerFlag } from "../../config/projectConfig.js";
import {
  extractParUrlsFromText,
  mergeParCandidates,
  parseParUrl,
  sanitizeDiagnosticMessage,
  sanitizeSourceUrl,
  type ParCandidate,
  type ParSource,
} from "./parAudit.js";

export interface ParSourceScanError {
  page_type: string;
  page_url: string;
  label: string;
  error: string;
}

export interface ParSourceDiscoveryResult {
  handled: boolean;
  candidates: ParCandidate[];
  pagesScanned: number;
  scanErrors: ParSourceScanError[];
}

interface TutorialSource {
  sourceUrl: string;
  renderedUrl: string;
  label: string;
}

interface WorkshopManifest {
  tutorials?: Array<{ filename?: unknown; title?: unknown }>;
}

interface SourceResponse {
  status: number;
  body: string;
}

const sourceTextCache = new Map<string, Promise<string>>();

export async function collectWorkshopSourceParCandidates(
  page: Page,
  source: ParSource,
  seenSourceFiles: Set<string>,
): Promise<ParSourceDiscoveryResult> {
  const tutorials = new Map<string, TutorialSource>();
  const scanErrors: ParSourceScanError[] = [];
  let handled = false;

  for (const frame of page.frames()) {
    const workshopUrl = safeUrl(frame.url());
    if (!workshopUrl || !shouldTryManifest(workshopUrl)) continue;

    const manifestUrl = resolveManifestUrl(workshopUrl);
    try {
      const manifest = await fetchManifest(page, manifestUrl);
      if (!manifest || !Array.isArray(manifest.tutorials)) continue;
      handled = true;

      for (const [index, tutorial] of manifest.tutorials.entries()) {
        const filename = typeof tutorial.filename === "string" ? tutorial.filename.trim() : "";
        if (!filename) continue;

        const sourceUrl = normalizeLiveLabsSourceUrl(new URL(filename, manifestUrl)).toString();
        const labId = labIdFromFilename(filename);
        const renderedUrl = new URL(workshopUrl.toString());
        renderedUrl.searchParams.set("lab", labId);
        const title = typeof tutorial.title === "string" ? tutorial.title.trim() : "";

        tutorials.set(normalizedPageKey(sourceUrl), {
          sourceUrl,
          renderedUrl: renderedUrl.toString(),
          label: title || "Lab " + (index + 1) + " (" + labId + ")",
        });
      }
    } catch (error) {
      scanErrors.push({
        page_type: "workshop-manifest",
        page_url: sanitizeSourceUrl(manifestUrl),
        label: source.label + ": Workshop manifest",
        error: safeError(error),
      });
    }
  }

  if (!handled) {
    return { handled: false, candidates: [], pagesScanned: 0, scanErrors };
  }

  const candidates: ParCandidate[] = [];
  let pagesScanned = 0;
  const pending = Array.from(tutorials.values()).filter((tutorial) => {
    const key = normalizedPageKey(tutorial.sourceUrl);
    if (seenSourceFiles.has(key)) return false;
    seenSourceFiles.add(key);
    return true;
  });

  await mapWithConcurrency(pending, discoveryConcurrency(), async (tutorial) => {
    try {
      const text = await fetchSourceText(page, tutorial.sourceUrl);
      pagesScanned += 1;
      candidates.push(
        ...sourceTextCandidates(text, {
          pageType: source.pageType + "-lab",
          pageUrl: sanitizeSourceUrl(tutorial.renderedUrl),
          label: source.label + ": " + tutorial.label,
          sourceFileUrl: sanitizeSourceUrl(tutorial.sourceUrl),
        }),
      );
    } catch (error) {
      scanErrors.push({
        page_type: source.pageType + "-source",
        page_url: sanitizeSourceUrl(tutorial.sourceUrl),
        label: source.label + ": " + tutorial.label,
        error: safeError(error),
      });
    }
  });

  return {
    handled: true,
    candidates: mergeParCandidates(candidates),
    pagesScanned,
    scanErrors,
  };
}

export function sourceTextCandidates(text: string, source: ParSource): ParCandidate[] {
  const lines = text.split(/\r?\n/);

  return extractParUrlsFromText(text).map((url) => {
    const parsed = parseParUrl(url);
    const exactLine = lines.findIndex((line) => line.includes(url));
    const objectLine =
      exactLine >= 0 || !parsed?.objectName
        ? exactLine
        : lines.findIndex((line) => line.includes(parsed.objectName));
    const lineIndex = objectLine >= 0 ? objectLine : undefined;
    const section = lineIndex === undefined ? undefined : nearestHeading(lines, lineIndex);
    const instruction = lineIndex === undefined ? undefined : nearestInstruction(lines, lineIndex);
    const sourceExcerpt =
      lineIndex === undefined
        ? undefined
        : sanitizeDiagnosticMessage(lines[lineIndex].replace(/<\/?(?:copy|code)>/gi, "").trim());

    return {
      url,
      sources: [
        {
          ...source,
          location: lineIndex === undefined ? "Workshop source" : "Markdown line " + (lineIndex + 1),
          sourceLine: lineIndex === undefined ? undefined : lineIndex + 1,
          sourceExcerpt,
          section,
          searchText: parsed?.objectName,
          instruction,
        },
      ],
    };
  });
}

async function fetchManifest(page: Page, manifestUrl: string): Promise<WorkshopManifest | undefined> {
  const response = await fetchWithRetries(page, manifestUrl, 2);
  if (!response) return undefined;

  try {
    return JSON.parse(response) as WorkshopManifest;
  } catch {
    throw new Error("Workshop manifest is not valid JSON.");
  }
}

async function fetchSourceText(page: Page, sourceUrl: string): Promise<string> {
  const key = normalizedPageKey(sourceUrl);
  const cached = sourceTextCache.get(key);
  if (cached) return cached;

  const pending = fetchWithRetries(page, sourceUrl, 2).then((text) => {
    if (text === undefined) throw new Error("Workshop source returned HTTP 404.");
    return text;
  });
  sourceTextCache.set(key, pending);

  try {
    return await pending;
  } catch (error) {
    sourceTextCache.delete(key);
    throw error;
  }
}

async function fetchWithRetries(page: Page, url: string, retries: number): Promise<string | undefined> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      const response = await fetchSourceResponse(page, url);
      const status = response.status;

      if (status === 404) {
        return undefined;
      }

      if (status >= 400) {
        if (status === 408 || status === 425 || status === 429 || status >= 500) {
          throw new Error("Temporary source response: HTTP " + status);
        }
        throw new Error("Workshop source could not be opened: HTTP " + status);
      }

      return response.body;
    } catch (error) {
      lastError = error;
      if (attempt <= retries) await delay(500 * attempt);
    }
  }

  throw lastError;
}

async function fetchSourceResponse(page: Page, url: string): Promise<SourceResponse> {
  const matchingFrame = frameForOrigin(page, url);
  if (matchingFrame) {
    try {
      return await fetchThroughBrowser(matchingFrame, url);
    } catch {
      // Retry through Playwright's separate request context below.
    }
  }

  try {
    const response = await page.request.get(url, {
      failOnStatusCode: false,
      timeout: sourceTimeoutMs(),
    });
    const result = {
      status: response.status(),
      body: await response.text(),
    };
    await response.dispose();
    return result;
  } catch (directError) {
    if (matchingFrame) {
      throw directError;
    }

    try {
      return await fetchThroughBrowser(page, url);
    } catch {
      throw directError;
    }
  }
}

function frameForOrigin(page: Page, rawUrl: string): Frame | Page | undefined {
  let targetOrigin: string;
  try {
    targetOrigin = new URL(rawUrl).origin;
  } catch {
    return undefined;
  }

  if (safeUrl(page.url())?.origin === targetOrigin) return page;
  return page.frames().find((frame) => safeUrl(frame.url())?.origin === targetOrigin);
}

async function fetchThroughBrowser(context: Frame | Page, url: string): Promise<SourceResponse> {
  const result = await context.evaluate(
    async ({ targetUrl, timeoutMs }) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(targetUrl, {
          credentials: "include",
          signal: controller.signal,
        });
        return {
          status: response.status,
          body: await response.text(),
          error: "",
        };
      } catch (error) {
        return {
          status: 0,
          body: "",
          error: error instanceof Error ? error.message : String(error),
        };
      } finally {
        clearTimeout(timer);
      }
    },
    {
      targetUrl: url,
      timeoutMs: sourceTimeoutMs(),
    },
  );

  if (result.error) {
    throw new Error("Browser source request failed: " + result.error);
  }

  return {
    status: result.status,
    body: result.body,
  };
}

async function mapWithConcurrency<T>(
  values: T[],
  concurrency: number,
  action: (value: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, Math.max(values.length, 1)) }, async () => {
    while (nextIndex < values.length) {
      const value = values[nextIndex++];
      await action(value);
    }
  });
  await Promise.all(workers);
}

function discoveryConcurrency(): number {
  return Math.max(1, parseIntegerFlag(process.env.QA_PAR_DISCOVERY_CONCURRENCY, 3));
}

function sourceTimeoutMs(): number {
  return Math.max(5_000, parseIntegerFlag(process.env.QA_PAR_SOURCE_TIMEOUT_MS, 45_000));
}

function nearestInstruction(lines: string[], lineIndex: number): string | undefined {
  const firstCandidate = Math.max(0, lineIndex - 12);
  for (let index = lineIndex - 1; index >= firstCandidate; index -= 1) {
    const value = lines[index].replace(/<\/?(?:copy|code)>/gi, "").trim();
    if (!value || value.startsWith("```") || value.startsWith("#")) continue;
    if (/^(?:\d+|[a-z])\.\s+/i.test(value)) return value.replace(/\s+/g, " ");
  }
  return undefined;
}

function nearestHeading(lines: string[], lineIndex: number): string | undefined {
  for (let index = lineIndex; index >= 0; index -= 1) {
    const match = lines[index].match(/^#{1,6}\s+(.+?)\s*$/);
    if (match) return match[1].trim();
  }
  return undefined;
}

function shouldTryManifest(url: URL): boolean {
  return (
    url.searchParams.has("manifest") ||
    /\/index\.html?$/i.test(url.pathname) ||
    url.hostname.toLowerCase().includes("oracle-livelabs.github.io")
  );
}

function resolveManifestUrl(workshopUrl: URL): string {
  const explicitManifest = workshopUrl.searchParams.get("manifest");
  const manifestUrl = explicitManifest
    ? new URL(explicitManifest, workshopUrl)
    : new URL("manifest.json", workshopUrl);
  manifestUrl.pathname = manifestUrl.pathname.replace(/\/{2,}/g, "/");
  return manifestUrl.toString();
}

function normalizeLiveLabsSourceUrl(url: URL): URL {
  if (
    url.hostname.toLowerCase() === "livelabs.oracle.com" &&
    url.pathname.startsWith("/common/")
  ) {
    url.pathname = "/cdn" + url.pathname;
  }
  return url;
}

function labIdFromFilename(filename: string): string {
  const pathname = filename.split(/[?#]/)[0];
  const basename = pathname.split("/").filter(Boolean).pop() || pathname;
  return decodeURIComponent(basename).replace(/\.md$/i, "");
}

function normalizedPageKey(value: string): string {
  const url = safeUrl(value);
  if (!url) return value;
  url.hash = "";
  for (const key of ["session", "p_instance"]) url.searchParams.delete(key);
  return url.toString();
}

function safeUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}

function safeError(error: unknown): string {
  return sanitizeDiagnosticMessage(error instanceof Error ? error.message : String(error));
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
