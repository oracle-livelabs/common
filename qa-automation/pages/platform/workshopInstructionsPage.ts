import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

import { BasePage } from "../basePage.js";
import {
  assertNoContentQualityIssues,
  attachContentQualityIssues,
  contentQualityIssue,
  type ContentQualityIssue,
} from "../../tests/support/contentQuality.js";
import { locateWorkshopSourceLinks } from "../../tests/support/parSourceDiscovery.js";

interface InstructionContentQualityOptions {
  contextName: string;
  expectedTerms?: string[];
  expectedTermsMode?: "all" | "any";
  linkLimit?: number;
}

interface LinkCandidate {
  text: string;
  href: string;
  url: string;
  location: string;
  pageUrl: string;
  marker: string;
}

interface BrokenLinkRecord extends LinkCandidate {
  status?: number;
  error?: string;
}

// WorkshopInstructionsPage models the rendered preview instructions opened
// from the launch dialog. It intentionally avoids a fixed path because the
// preview can be served by different workshop backends.
export class WorkshopInstructionsPage extends BasePage {
  static readonly INSTRUCTIONS_READY_TIMEOUT_MS = Math.max(90_000, BasePage.PAGE_READY_TIMEOUT_MS);

  constructor(page: Page) {
    super(page);
  }

  get body(): Locator {
    return this.page.locator("body");
  }

  async assertLoaded(): Promise<void> {
    await this.waitForPageReady(WorkshopInstructionsPage.INSTRUCTIONS_READY_TIMEOUT_MS);
    await this.dismissCookieBannerIfPresent();
    await this.assertNotMigrationNotice();

    const contentBody = await this.instructionContentBody();

    await expect(contentBody).toContainText(/workshop|lab|instructions|introduction|task|overview/i, {
      timeout: WorkshopInstructionsPage.INSTRUCTIONS_READY_TIMEOUT_MS,
    });
    await expect(contentBody).toContainText(/Get started|Introduction|Objectives|Task\s+1/i, {
      timeout: WorkshopInstructionsPage.INSTRUCTIONS_READY_TIMEOUT_MS,
    });

  }

  async assertContentQuality(options: InstructionContentQualityOptions, testInfo: TestInfo): Promise<void> {
    const contentBody = await this.instructionContentBody();
    const issues: ContentQualityIssue[] = [];

    issues.push(...(await this.collectObviousTextDefectIssues(contentBody, options.contextName)));
    issues.push(...(await this.collectBrokenVisibleImageIssues(contentBody, options.contextName)));
    issues.push(...(await this.collectBrokenEmbeddedContentIssues(contentBody, options.contextName)));
    issues.push(...(await this.collectBrokenLinkIssues(contentBody, options)));

    await attachContentQualityIssues(testInfo, issues, options.contextName);
    if (issues.some((issue) => issue.code === "BROKEN_VISIBLE_LINK" || issue.code === "BROKEN_VISIBLE_IMAGE")) {
      await testInfo.attach("highlighted-issue-screenshot", {
        body: await this.page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    }
    assertNoContentQualityIssues(issues, options.contextName);
  }

  private async instructionContentBody(): Promise<Locator> {
    const candidates: Locator[] = [this.page.locator("main:visible").first(), this.body];

    for (const frame of this.page.frames()) {
      if (frame === this.page.mainFrame()) {
        continue;
      }

      candidates.push(frame.locator("main:visible").first());
      candidates.push(frame.locator("body"));
    }

    for (const candidate of candidates) {
      try {
        await expect(candidate).toContainText(/workshop|lab|instructions|introduction|task|overview/i, {
          timeout: BasePage.OPTIONAL_LOAD_TIMEOUT_MS,
        });
        await expect(candidate).toContainText(/Get started|Introduction|Objectives|Task\s+1/i, {
          timeout: BasePage.OPTIONAL_LOAD_TIMEOUT_MS,
        });
        return candidate;
      } catch {
        continue;
      }
    }

    throw new Error(`Instructions content did not render in the page or any visible content frame: ${this.page.url()}`);
  }

  private async assertNotMigrationNotice(): Promise<void> {
    try {
      await expect(this.page.getByText("LiveLabs has Moved!", { exact: true }).first()).not.toBeVisible({
        timeout: BasePage.OPTIONAL_LOAD_TIMEOUT_MS,
      });
    } catch {
      throw new Error(
        `Instructions did not render. The page stayed on the LiveLabs migration notice instead: ${this.page.url()}`,
      );
    }
  }

  private async collectObviousTextDefectIssues(
    contentBody: Locator,
    contextName: string,
  ): Promise<ContentQualityIssue[]> {
    const bodyText = await contentBody.innerText({ timeout: BasePage.DEFAULT_TIMEOUT_MS });
    const defects = TEXT_DEFECT_PATTERNS.filter(({ pattern }) => pattern.test(bodyText)).map(({ label }) => label);

    if (defects.length === 0) return [];
    return [
      contentQualityIssue(
        "CONTENT_TEXT_DEFECT",
        "Text needs correction",
        "major",
        `${contextName} contains ${defects.join(", ")}.`,
        defects,
      ),
    ];
  }

  private async collectBrokenVisibleImageIssues(
    contentBody: Locator,
    contextName: string,
  ): Promise<ContentQualityIssue[]> {
    const images = contentBody.locator("img[src]:visible");
    const imageCount = await images.count();

    for (let index = 0; index < imageCount; index += 1) {
      await images.nth(index).scrollIntoViewIfNeeded();
    }

    const brokenImages = await images.evaluateAll((elements, reportPageUrl) => {
      const nearestVisibleHeading = (element: Element): string => {
        const headings = Array.from(
          element.ownerDocument.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']"),
        );
        const preceding = headings.filter((heading) =>
          Boolean(heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
        );
        const hierarchy: string[] = [];
        for (const heading of preceding.slice(-4)) {
          const text = (heading.textContent ?? "").replace(/\s+/g, " ").trim();
          if (text && hierarchy.at(-1) !== text) hierarchy.push(text);
        }
        return hierarchy.join(" / ");
      };

      return elements
        .filter((element): element is HTMLImageElement => element instanceof HTMLImageElement)
        .map((image) => ({
          alt: image.alt,
          src: image.currentSrc || image.src,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          complete: image.complete,
          location: nearestVisibleHeading(image),
          pageUrl: reportPageUrl,
        }))
        .filter((image) => image.src && (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0));
    }, this.page.url());

    if (brokenImages.length === 0) return [];
    await images.evaluateAll((elements) => {
      const broken = elements.filter(
        (element): element is HTMLImageElement =>
          element instanceof HTMLImageElement &&
          Boolean(element.src) &&
          (!element.complete || element.naturalWidth === 0 || element.naturalHeight === 0),
      );
      for (const image of broken) {
        image.style.setProperty("outline", "4px solid #c62828", "important");
        image.style.setProperty("outline-offset", "3px", "important");
        image.style.setProperty("background-color", "#fff1f0", "important");
      }
      broken[0]?.scrollIntoView({ block: "center", inline: "nearest" });
    });
    return [
      contentQualityIssue(
        "BROKEN_VISIBLE_IMAGE",
        "Broken visible image",
        "major",
        `${contextName} shows ${brokenImages.length} broken image${brokenImages.length === 1 ? "" : "s"}.`,
        brokenImages,
      ),
    ];
  }

  private async collectBrokenEmbeddedContentIssues(
    contentBody: Locator,
    contextName: string,
  ): Promise<ContentQualityIssue[]> {
    const brokenEmbeds = await contentBody.locator("iframe[src]:visible, video:visible, audio:visible, embed:visible, object:visible").evaluateAll(
      (elements) =>
        elements
          .map((element) => {
            if (element instanceof HTMLIFrameElement) {
              return {
                type: "iframe",
                src: element.src,
                error: element.src && element.src !== "about:blank" ? "" : "Missing iframe src",
              };
            }

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
    );

    if (brokenEmbeds.length === 0) return [];
    return [
      contentQualityIssue(
        "BROKEN_EMBEDDED_CONTENT",
        "Broken embedded content",
        "major",
        `${contextName} shows ${brokenEmbeds.length} broken embedded item${brokenEmbeds.length === 1 ? "" : "s"}.`,
        brokenEmbeds,
      ),
    ];
  }

  private async collectBrokenLinkIssues(
    contentBody: Locator,
    options: InstructionContentQualityOptions,
  ): Promise<ContentQualityIssue[]> {
    const candidates = await this.collectVisibleLinks(contentBody);
    const limit = options.linkLimit ?? 50;
    const linksToCheck = limit === 0 ? candidates : candidates.slice(0, limit);
    const brokenLinks: BrokenLinkRecord[] = [];

    for (const link of linksToCheck) {
      try {
        const status = await this.probeLinkStatus(link.url);

        if (status >= 400 && !AUTH_OR_RATE_LIMIT_STATUSES.has(status)) {
          brokenLinks.push({ ...link, status });
        }
      } catch (error) {
        brokenLinks.push({
          ...link,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (brokenLinks.length === 0) return [];
    await this.highlightBrokenLinks(contentBody, brokenLinks);
    const sourceLocations = await locateWorkshopSourceLinks(
      this.page,
      brokenLinks.flatMap((link) => [link.url, link.href]).filter(Boolean),
    ).catch(() => []);
    const sourceByUrl = new Map(sourceLocations.map((location) => [location.url, location]));
    const locatedBrokenLinks = brokenLinks.map(({ marker, ...link }) => {
      const source = sourceByUrl.get(link.url) || sourceByUrl.get(link.href);
      if (!source) return link;
      return {
        ...link,
        pageUrl: source.pageUrl,
        sourceFileUrl: source.sourceFileUrl,
        labTitle: source.labTitle,
        labNumber: source.labNumber,
        section: source.section,
        instruction: source.instruction,
        sourceLine: source.sourceLine,
        location: [source.labTitle, source.section].filter(Boolean).join(" / "),
      };
    });
    return [
      contentQualityIssue(
        "BROKEN_VISIBLE_LINK",
        "Broken visible link",
        "major",
        `${options.contextName} contains ${brokenLinks.length} link${brokenLinks.length === 1 ? "" : "s"} that did not open.`,
        {
          checked: linksToCheck.length,
          totalCandidates: candidates.length,
          linkLimit: limit,
          brokenLinks: locatedBrokenLinks,
        },
      ),
    ];
  }

  private async highlightBrokenLinks(contentBody: Locator, brokenLinks: BrokenLinkRecord[]): Promise<void> {
    const markers = brokenLinks.map((link) => link.marker).filter(Boolean);
    if (markers.length === 0) return;
    await contentBody.locator("a[data-livelabs-qa-link]").evaluateAll((anchors, selectedMarkers) => {
      const selected = new Set(selectedMarkers);
      const broken = anchors.filter((anchor) => selected.has(anchor.getAttribute("data-livelabs-qa-link") || ""));
      for (const anchor of broken) {
        if (!(anchor instanceof HTMLElement)) continue;
        anchor.style.setProperty("outline", "4px solid #c62828", "important");
        anchor.style.setProperty("outline-offset", "3px", "important");
        anchor.style.setProperty("background-color", "#fff1f0", "important");
      }
      broken[0]?.scrollIntoView({ block: "center", inline: "nearest" });
    }, markers);
  }

  private async probeLinkStatus(url: string): Promise<number> {
    try {
      const headResponse = await this.page.request.head(url, {
        failOnStatusCode: false,
        maxRedirects: 5,
        timeout: 15_000,
      });

      return headResponse.status();
    } catch {
      const getResponse = await this.page.request.get(url, {
        failOnStatusCode: false,
        maxRedirects: 5,
        timeout: 15_000,
      });

      return getResponse.status();
    }
  }

  private async collectVisibleLinks(contentBody: Locator): Promise<LinkCandidate[]> {
    return contentBody.locator("a[href]:visible").evaluateAll((anchors) => {
      const seen = new Set<string>();
      const candidates: LinkCandidate[] = [];

      for (const anchor of anchors) {
        if (!(anchor instanceof HTMLAnchorElement)) {
          continue;
        }

        if (anchor.closest("nav, header, footer, [role='banner'], [role='contentinfo']")) {
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
        const marker = `qa-link-${candidates.length + 1}`;
        anchor.setAttribute("data-livelabs-qa-link", marker);
        candidates.push({
          text,
          href,
          url,
          location: nearestVisibleHeading(anchor),
          pageUrl: anchor.ownerDocument.defaultView?.location.href || "",
          marker,
        });
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

      function nearestVisibleHeading(element: Element): string {
        const headings = Array.from(
          element.ownerDocument.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']"),
        );
        const preceding = headings.filter((heading) =>
          Boolean(heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
        );
        const hierarchy: string[] = [];
        let childLevel = Number.POSITIVE_INFINITY;
        for (const heading of preceding.reverse()) {
          const text = (heading.textContent ?? "").replace(/\s+/g, " ").trim();
          const level = heading.matches("h1, h2, h3, h4, h5, h6")
            ? Number(heading.tagName.slice(1))
            : Number(heading.getAttribute("aria-level") || 6);
          if (!text || level >= childLevel) continue;
          hierarchy.unshift(text);
          childLevel = level;
          if (hierarchy.length >= 3) break;
        }
        return hierarchy.join(" / ");
      }
    });
  }
}

const AUTH_OR_RATE_LIMIT_STATUSES = new Set([401, 403, 429]);
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
