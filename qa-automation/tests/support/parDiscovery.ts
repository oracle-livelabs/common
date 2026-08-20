import type { Frame, Page, Route } from "@playwright/test";

import type { AuthRuntimeConfig } from "./authRuntime.js";
import { signInIfRequired } from "./authenticatedNavigation.js";
import { collectWorkshopSourceParCandidates } from "./parSourceDiscovery.js";
import {
  extractParUrlsFromText,
  isParUrl,
  mergeParCandidates,
  sanitizeDiagnosticMessage,
  sanitizeSourceUrl,
  type ParCandidate,
  type ParSource,
} from "./parAudit.js";

export interface ParScanError {
  page_type: string;
  page_url: string;
  label: string;
  error: string;
}

export interface ParDiscoveryResult {
  candidates: ParCandidate[];
  pagesScanned: number;
  scanErrors: ParScanError[];
}

interface FrameSnapshot {
  frameUrl: string;
  html: string;
  text: string;
  attributes: Array<{ value: string; location: string }>;
  labLinks: string[];
}

const PAGE_TIMEOUT_MS = 60_000;

export async function collectParCandidatesFromPage(page: Page, source: ParSource): Promise<ParCandidate[]> {
  const candidates: ParCandidate[] = [];

  for (const frame of page.frames()) {
    const snapshot = await snapshotFrame(frame).catch(() => undefined);
    if (!snapshot) continue;

    for (const attribute of snapshot.attributes) {
      candidates.push(
        ...extractParUrlsFromText(attribute.value).map((url) => ({
          url,
          sources: [
            {
              ...source,
              pageUrl: sanitizeSourceUrl(snapshot.frameUrl || source.pageUrl),
              location: attribute.location,
            },
          ],
        })),
      );
    }

    for (const content of [snapshot.frameUrl, snapshot.html, snapshot.text]) {
      candidates.push(
        ...extractParUrlsFromText(content).map((url) => ({
          url,
          sources: [
            {
              ...source,
              pageUrl: sanitizeSourceUrl(snapshot.frameUrl || source.pageUrl),
              location: "Rendered page content",
            },
          ],
        })),
      );
    }
  }

  return mergeParCandidates(candidates);
}

export async function collectWorkshopInstructionParCandidates(
  page: Page,
  authRuntime: AuthRuntimeConfig,
  source: ParSource,
  seenSourceFiles: Set<string> = new Set<string>(),
): Promise<ParDiscoveryResult> {
  const candidates = await collectParCandidatesFromPage(page, source);
  const scanErrors: ParScanError[] = [];
  let pagesScanned = 1;

  const sourceDiscovery = await collectWorkshopSourceParCandidates(page, source, seenSourceFiles);
  scanErrors.push(...sourceDiscovery.scanErrors);
  if (sourceDiscovery.handled) {
    candidates.push(...sourceDiscovery.candidates);
    pagesScanned += sourceDiscovery.pagesScanned;
    return { candidates: mergeParCandidates(candidates), pagesScanned, scanErrors };
  }

  const labUrls = await discoverWorkshopLabUrls(page, scanErrors);
  const currentUrls = new Set(page.frames().map((frame) => normalizedPageKey(frame.url())));

  for (const lab of labUrls) {
    if (currentUrls.has(normalizedPageKey(lab.url))) continue;

    const labPage = await page.context().newPage();
    try {
      const response = await labPage.goto(lab.url, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_TIMEOUT_MS,
      });
      if (response && response.status() >= 400) {
        throw new Error("HTTP " + response.status());
      }

      await signInIfRequired(labPage, authRuntime, source.label + ": " + lab.label);
      await labPage.locator("body").waitFor({ state: "visible", timeout: PAGE_TIMEOUT_MS });
      pagesScanned += 1;
      candidates.push(
        ...(await collectParCandidatesFromPage(labPage, {
          pageType: source.pageType + "-lab",
          pageUrl: sanitizeSourceUrl(labPage.url()),
          label: source.label + ": " + lab.label,
        })),
      );
    } catch (error) {
      scanErrors.push({
        page_type: source.pageType + "-lab",
        page_url: sanitizeSourceUrl(lab.url),
        label: source.label + ": " + lab.label,
        error: safeScanError(error),
      });
    } finally {
      await labPage.close();
    }
  }

  return { candidates: mergeParCandidates(candidates), pagesScanned, scanErrors };
}

export async function captureParCandidatesDuringAction(
  page: Page,
  source: ParSource,
  action: () => Promise<void>,
): Promise<ParCandidate[]> {
  const context = page.context();
  const captured: ParCandidate[] = [];
  const pagesBefore = new Set(context.pages());
  const requestListener = (request: { url(): string }) => {
    const url = request.url();
    if (isParUrl(url)) captured.push({ url, sources: [{ ...source, location: "Browser request" }] });
  };
  const routeHandler = async (route: Route) => {
    const url = route.request().url();
    if (isParUrl(url)) {
      captured.push({ url, sources: [{ ...source, location: "Asset action request" }] });
      await route.abort("aborted");
      return;
    }
    await route.continue();
  };

  context.on("request", requestListener);
  await context.route("**/*", routeHandler);

  try {
    await action().catch((error) => {
      if (captured.length === 0) throw error;
    });
    if (!page.isClosed()) {
      await page.waitForTimeout(750);
    }

    for (const openedPage of context.pages()) {
      if (!pagesBefore.has(openedPage) && !openedPage.isClosed()) {
        captured.push(...(await collectParCandidatesFromPage(openedPage, source).catch(() => [])));
        await openedPage.close();
      }
    }

    if (!page.isClosed()) {
      captured.push(...(await collectParCandidatesFromPage(page, source).catch(() => [])));
    }
  } finally {
    context.off("request", requestListener);
    await context.unroute("**/*", routeHandler);
  }

  return mergeParCandidates(captured);
}

async function discoverWorkshopLabUrls(
  page: Page,
  scanErrors: ParScanError[],
): Promise<Array<{ url: string; label: string }>> {
  const discovered = new Map<string, { url: string; label: string }>();
  const snapshots: FrameSnapshot[] = [];

  for (const frame of page.frames()) {
    const snapshot = await snapshotFrame(frame).catch(() => undefined);
    if (!snapshot) continue;
    snapshots.push(snapshot);

    for (const labUrl of snapshot.labLinks) {
      const parsed = safeUrl(labUrl);
      if (!parsed) continue;
      const label = parsed.searchParams.get("lab") || "Linked lab";
      discovered.set(normalizedPageKey(parsed.toString()), { url: parsed.toString(), label });
    }
  }

  for (const snapshot of snapshots) {
    const pageUrl = safeUrl(snapshot.frameUrl);
    if (!pageUrl || !shouldTryManifest(pageUrl)) continue;

    const manifestUrl = resolveManifestUrl(pageUrl);
    try {
      const manifest = await fetchWorkshopManifest(page, manifestUrl);
      if (!manifest || !Array.isArray(manifest.tutorials)) continue;

      for (const [index, tutorial] of manifest.tutorials.entries()) {
        const filename = typeof tutorial.filename === "string" ? tutorial.filename.trim() : "";
        if (!filename) continue;
        const labId = labIdFromFilename(filename);
        const labUrl = new URL(pageUrl.toString());
        labUrl.searchParams.set("lab", labId);
        const title = typeof tutorial.title === "string" ? tutorial.title.trim() : "";
        discovered.set(normalizedPageKey(labUrl.toString()), {
          url: labUrl.toString(),
          label: title || "Lab " + (index + 1) + " (" + labId + ")",
        });
      }
    } catch (error) {
      scanErrors.push({
        page_type: "workshop-manifest",
        page_url: sanitizeSourceUrl(manifestUrl),
        label: "Workshop manifest",
        error: safeScanError(error),
      });
    }
  }

  return Array.from(discovered.values());
}

async function snapshotFrame(frame: Frame): Promise<FrameSnapshot> {
  return frame.evaluate(() => {
    const attributes: Array<{ value: string; location: string }> = [];
    const attributeNames = ["href", "src", "data", "action", "data-url", "data-download-url"];

    for (const element of Array.from(document.querySelectorAll("[href], [src], [data], [action], [data-url], [data-download-url]"))) {
      for (const name of attributeNames) {
        const rawValue = element.getAttribute(name)?.trim();
        if (!rawValue) continue;

        let value = rawValue;
        try {
          value = new URL(rawValue, document.baseURI).toString();
        } catch {
          // Raw code and data attributes can still contain a complete PAR URL.
        }

        const text =
          (element.textContent || element.getAttribute("aria-label") || element.getAttribute("title") || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120);
        attributes.push({
          value,
          location: element.tagName.toLowerCase() + "[" + name + "]" + (text ? ": " + text : ""),
        });
      }
    }

    const labLinks = Array.from(document.querySelectorAll("a[href]"))
      .filter((element): element is HTMLAnchorElement => element instanceof HTMLAnchorElement)
      .map((anchor) => anchor.href)
      .filter((href) => {
        try {
          return new URL(href).searchParams.has("lab");
        } catch {
          return false;
        }
      });

    return {
      frameUrl: location.href,
      html: document.documentElement?.outerHTML || "",
      text: document.body?.innerText || "",
      attributes,
      labLinks,
    };
  });
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

async function fetchWorkshopManifest(
  page: Page,
  manifestUrl: string,
): Promise<{ tutorials?: Array<{ filename?: unknown; title?: unknown }> } | undefined> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const manifestPage = await page.context().newPage();
    try {
      const response = await manifestPage.goto(manifestUrl, {
        waitUntil: "commit",
        timeout: 30_000,
      });
      const status = response?.status() ?? 0;

      if (!response || !response.ok()) {
        if (status === 408 || status === 425 || status === 429 || status >= 500 || status === 0) {
          throw new Error("Temporary manifest response: HTTP " + (status || "unavailable"));
        }
        if (status === 404) return undefined;
        throw new Error("Workshop manifest could not be opened: HTTP " + status);
      }

      const body = await response.text();
      return JSON.parse(body) as { tutorials?: Array<{ filename?: unknown; title?: unknown }> };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1_500));
    } finally {
      await manifestPage.close();
    }
  }

  throw lastError;
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

function safeScanError(error: unknown): string {
  return sanitizeDiagnosticMessage(error instanceof Error ? error.message : String(error));
}
