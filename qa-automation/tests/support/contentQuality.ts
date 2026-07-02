import { expect, type Page, type TestInfo } from "@playwright/test";

import { BasePage } from "../../pages/basePage.js";
import { parseIntegerFlag } from "../../config/projectConfig.js";

interface ContentQualityOptions {
  contextName: string;
  expectedTerms?: string[];
  expectedTermsMode?: "all" | "any";
  linkLimit?: number;
}

export type ContentQualityIssueSeverity = "blocker" | "major" | "minor";

export interface ContentQualityIssue {
  code: string;
  label: string;
  severity: ContentQualityIssueSeverity;
  message: string;
  count?: number;
  details?: unknown;
}

interface LinkCandidate {
  text: string;
  href: string;
  url: string;
}

interface BrokenLinkRecord extends LinkCandidate {
  status?: number;
  error?: string;
}

interface BrokenImageRecord {
  alt: string;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  complete: boolean;
}

const DEFAULT_LINK_LIMIT = Math.max(0, parseIntegerFlag(process.env.QA_CONTENT_LINK_LIMIT, 50));
const LINK_TIMEOUT_MS = Math.max(5_000, parseIntegerFlag(process.env.QA_CONTENT_LINK_TIMEOUT_MS, 15_000));

const TEXT_DEFECT_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "placeholder text", pattern: /\blorem ipsum\b/i },
  { label: "unfinished TODO marker", pattern: /\bTODO\b/i },
  { label: "unfinished TBD marker", pattern: /\bTBD\b/i },
  { label: "unfinished FIXME marker", pattern: /\bFIXME\b/i },
  { label: "unresolved template token", pattern: /\{\{[^}]+\}\}/ },
  { label: "misspelling: environment", pattern: /\benviroment\b/i },
  { label: "misspelling: successful", pattern: /\bsuccesful\b/i },
  { label: "misspelling: successfully", pattern: /\bsuccesfully\b/i },
  { label: "misspelling: separate", pattern: /\bseperate\b/i },
  { label: "misspelling: receive", pattern: /\brecieve\b/i },
  { label: "misspelling: occurred", pattern: /\boccured\b/i },
  { label: "misspelling: occurrence", pattern: /\boccurence\b/i },
  { label: "misspelling: prerequisite", pattern: /\bprerequiste\b/i },
  { label: "misspelling: individual", pattern: /\bindifidual\b/i },
  { label: "misspelling: the", pattern: /\bteh\b/i },
];

const AUTH_OR_RATE_LIMIT_STATUSES = new Set([401, 403, 429]);

export async function assertContentQuality(page: Page, options: ContentQualityOptions): Promise<void> {
  const issues = await collectContentQualityIssues(page, options);
  assertNoContentQualityIssues(issues, options.contextName);
}

export async function collectContentQualityIssues(page: Page, options: ContentQualityOptions): Promise<ContentQualityIssue[]> {
  const issues: ContentQualityIssue[] = [];

  await page.locator("body").waitFor({
    state: "visible",
    timeout: BasePage.PAGE_READY_TIMEOUT_MS,
  });

  issues.push(...(await collectExpectedTermIssues(page, options)));
  issues.push(...(await collectObviousTextDefectIssues(page, options.contextName)));
  issues.push(...(await collectBrokenVisibleImageIssues(page, options.contextName)));
  issues.push(...(await collectBrokenEmbeddedContentIssues(page, options.contextName)));
  issues.push(...(await collectBrokenLinkIssues(page, options)));

  return issues;
}

export async function attachContentQualityIssues(
  testInfo: TestInfo,
  issues: ContentQualityIssue[],
  contextName: string,
): Promise<void> {
  if (issues.length === 0) {
    return;
  }

  await testInfo.attach("qa-issues.json", {
    body: JSON.stringify(
      {
        schema_version: 1,
        context: contextName,
        issue_count: issues.length,
        issues,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
}

export function assertNoContentQualityIssues(issues: ContentQualityIssue[], contextName: string): void {
  if (issues.length === 0) {
    return;
  }

  const issueSummary = issues
    .map((issue, index) => `${index + 1}. ${issue.label}: ${issue.message}`)
    .join("\n");

  expect(issues, `${contextName} found ${issues.length} issue(s):\n${issueSummary}`).toEqual([]);
}

export function contentQualityIssue(
  code: string,
  label: string,
  severity: ContentQualityIssueSeverity,
  message: string,
  details?: unknown,
): ContentQualityIssue {
  const count = Array.isArray(details) ? details.length : undefined;

  return {
    code,
    label,
    severity,
    message,
    ...(count ? { count } : {}),
    ...(details === undefined ? {} : { details }),
  };
}

async function collectExpectedTermIssues(page: Page, options: ContentQualityOptions): Promise<ContentQualityIssue[]> {
  const expectedTerms = options.expectedTerms ?? [];
  if (expectedTerms.length === 0) {
    return [];
  }

  const bodyText = await page.locator("body").innerText({ timeout: BasePage.DEFAULT_TIMEOUT_MS });
  const missingTerms = expectedTerms.filter((term) => !new RegExp(escapeRegex(term), "i").test(bodyText));

  if (options.expectedTermsMode === "any") {
    if (missingTerms.length < expectedTerms.length) {
      return [];
    }

    return [
      contentQualityIssue(
        "CONTENT_RELEVANCE",
        "Content relevance",
        "major",
        `The page did not contain any expected catalog terms: ${expectedTerms.join(", ")}.`,
        { expectedTerms },
      ),
    ];
  }

  if (missingTerms.length === 0) {
    return [];
  }

  return [
    contentQualityIssue(
      "CONTENT_RELEVANCE",
      "Content relevance",
      "major",
      `The page missed expected catalog terms: ${missingTerms.join(", ")}.`,
      { expectedTerms, missingTerms },
    ),
  ];
}

async function collectObviousTextDefectIssues(page: Page, contextName: string): Promise<ContentQualityIssue[]> {
  const bodyText = await page.locator("body").innerText({ timeout: BasePage.DEFAULT_TIMEOUT_MS });
  const defects = TEXT_DEFECT_PATTERNS.filter(({ pattern }) => pattern.test(bodyText)).map(({ label }) => label);

  if (defects.length === 0) {
    return [];
  }

  return [
    contentQualityIssue(
      "CONTENT_TEXT_DEFECT",
      "Content text defect",
      "major",
      `${contextName} has obvious placeholder text or misspellings: ${defects.join(", ")}.`,
      defects,
    ),
  ];
}

async function collectBrokenVisibleImageIssues(page: Page, contextName: string): Promise<ContentQualityIssue[]> {
  const images = await visibleContentLocator(page, "img[src]");
  const imageCount = await images.count();

  for (let index = 0; index < imageCount; index += 1) {
    await images.nth(index).scrollIntoViewIfNeeded();
  }

  try {
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll("main img[src], [role='main'] img[src], article img[src], img[src]")).every(
          (image) => !(image instanceof HTMLImageElement) || image.complete,
        ),
      undefined,
      { timeout: BasePage.OPTIONAL_LOAD_TIMEOUT_MS },
    );
  } catch {
    // Slow images are still evaluated below. If they never complete, the test
    // fails with the image details instead of silently accepting the problem.
  }

  const brokenImages = (await images.evaluateAll((elements) =>
    elements
      .filter((element): element is HTMLImageElement => element instanceof HTMLImageElement)
      .map((image) => ({
        alt: image.alt,
        src: image.currentSrc || image.src,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        complete: image.complete,
      }))
      .filter((image) => image.src && (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0)),
  )) as BrokenImageRecord[];

  if (brokenImages.length === 0) {
    return [];
  }

  return [
    contentQualityIssue(
      "BROKEN_VISIBLE_IMAGE",
      "Broken visible image",
      "major",
      `${contextName} shows ${brokenImages.length} broken visible image${brokenImages.length === 1 ? "" : "s"}.`,
      brokenImages,
    ),
  ];
}

async function collectBrokenEmbeddedContentIssues(page: Page, contextName: string): Promise<ContentQualityIssue[]> {
  const brokenEmbeds: Array<{ type: string; src: string; title?: string; error: string }> = [];
  const iframes = await visibleContentLocator(page, "iframe[src]");
  const iframeCount = await iframes.count();

  for (let index = 0; index < iframeCount; index += 1) {
    const iframe = iframes.nth(index);
    await iframe.scrollIntoViewIfNeeded();

    const src = (await iframe.getAttribute("src")) ?? "";
    const title = (await iframe.getAttribute("title")) ?? "";
    const handle = await iframe.elementHandle();
    const frame = await handle?.contentFrame();

    if (!src.trim()) {
      brokenEmbeds.push({ type: "iframe", src, title, error: "Missing iframe src" });
      continue;
    }

    if (!frame) {
      brokenEmbeds.push({ type: "iframe", src, title, error: "Iframe did not attach a frame" });
      continue;
    }

    try {
      await frame.waitForLoadState("domcontentloaded", {
        timeout: BasePage.OPTIONAL_LOAD_TIMEOUT_MS,
      });
    } catch {
      // The frame URL check below is the assertion. Some third-party embeds do
      // not cleanly report domcontentloaded even when content is visible.
    }

    const frameUrl = frame.url();
    if (!frameUrl || frameUrl === "about:blank" || frameUrl.startsWith("chrome-error://")) {
      brokenEmbeds.push({ type: "iframe", src, title, error: `Iframe loaded "${frameUrl || "empty url"}"` });
    }
  }

  const mediaElements = await visibleContentLocator(page, "video, audio, embed, object");
  const brokenMedia = (await mediaElements.evaluateAll((elements) =>
    elements
      .map((element) => {
        if (element instanceof HTMLMediaElement) {
          const source =
            element.currentSrc ||
            element.getAttribute("src") ||
            element.querySelector("source[src]")?.getAttribute("src") ||
            "";

          return {
            type: element.tagName.toLowerCase(),
            src: source,
            error: element.error ? `Media error code ${element.error.code}` : "",
          };
        }

        if (element instanceof HTMLObjectElement) {
          return {
            type: "object",
            src: element.data,
            error: element.data ? "" : "Missing object data",
          };
        }

        if (element instanceof HTMLEmbedElement) {
          return {
            type: "embed",
            src: element.src,
            error: element.src ? "" : "Missing embed src",
          };
        }

        return {
          type: element.tagName.toLowerCase(),
          src: "",
          error: "Unsupported embedded element",
        };
      })
      .filter((record) => record.error || !record.src),
  )) as Array<{ type: string; src: string; error: string }>;

  for (const media of brokenMedia) {
    brokenEmbeds.push(media);
  }

  if (brokenEmbeds.length === 0) {
    return [];
  }

  return [
    contentQualityIssue(
      "BROKEN_EMBEDDED_CONTENT",
      "Broken embedded content",
      "major",
      `${contextName} shows ${brokenEmbeds.length} broken embedded content item${brokenEmbeds.length === 1 ? "" : "s"}.`,
      brokenEmbeds,
    ),
  ];
}

async function collectBrokenLinkIssues(page: Page, options: ContentQualityOptions): Promise<ContentQualityIssue[]> {
  const candidates = await collectVisibleLinks(page);
  const limit = options.linkLimit ?? DEFAULT_LINK_LIMIT;
  const linksToCheck = limit === 0 ? candidates : candidates.slice(0, limit);
  const brokenLinks: BrokenLinkRecord[] = [];

  for (const link of linksToCheck) {
    try {
      const status = await probeLinkStatus(page, link.url);

      if (isBrokenLinkStatus(status)) {
        brokenLinks.push({ ...link, status });
      }
    } catch (error) {
      brokenLinks.push({
        ...link,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (brokenLinks.length === 0) {
    return [];
  }

  return [
    contentQualityIssue(
      "BROKEN_VISIBLE_LINK",
      "Broken visible link",
      "major",
      `${options.contextName} exposes ${brokenLinks.length} broken visible link${brokenLinks.length === 1 ? "" : "s"}.`,
      {
        checked: linksToCheck.length,
        totalCandidates: candidates.length,
        linkLimit: limit,
        hint: "Set QA_CONTENT_LINK_LIMIT=0 to check every visible content link.",
        brokenLinks,
      },
    ),
  ];
}

async function collectVisibleLinks(page: Page): Promise<LinkCandidate[]> {
  const linkLocator = await visibleContentLocator(page, "a[href]");
  const links = (await linkLocator.evaluateAll((anchors) => {
    const seen = new Set<string>();
    const candidates: LinkCandidate[] = [];

    for (const anchor of anchors) {
      if (!(anchor instanceof HTMLAnchorElement)) {
        continue;
      }

      if (anchor.closest(".a-CardView, .a-CardView-fullLink, nav, header, footer, [role='banner'], [role='contentinfo']")) {
        continue;
      }

      const href = anchor.getAttribute("href")?.trim() ?? "";
      const text = (anchor.textContent ?? "").replace(/\s+/g, " ").trim();
      const url = anchor.href;

      if (!href || !url || shouldSkipHref(href)) {
        continue;
      }

      const key = `${text}|${href}|${url}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      candidates.push({ text, href, url });
    }

    return candidates;

    function shouldSkipHref(hrefValue: string): boolean {
      const normalized = hrefValue.trim().toLowerCase();

      return (
        normalized.startsWith("#") ||
        normalized.startsWith("mailto:") ||
        normalized.startsWith("tel:") ||
        normalized.startsWith("javascript:") ||
        normalized.startsWith("data:")
      );
    }
  })) as LinkCandidate[];

  return links;
}

async function probeLinkStatus(page: Page, url: string): Promise<number> {
  try {
    const response = await page.request.head(url, {
      failOnStatusCode: false,
      maxRedirects: 5,
      timeout: LINK_TIMEOUT_MS,
    });

    return response.status();
  } catch {
    const response = await page.request.get(url, {
      failOnStatusCode: false,
      maxRedirects: 5,
      timeout: LINK_TIMEOUT_MS,
    });

    return response.status();
  }
}

async function visibleContentLocator(page: Page, selector: string) {
  const scopedSelector = `main ${selector}:visible, [role='main'] ${selector}:visible, article ${selector}:visible`;
  const scoped = page.locator(scopedSelector);

  if ((await scoped.count()) > 0) {
    return scoped;
  }

  return page.locator(`${selector}:visible`);
}

function isBrokenLinkStatus(status: number): boolean {
  return status >= 400 && !AUTH_OR_RATE_LIMIT_STATUSES.has(status);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
