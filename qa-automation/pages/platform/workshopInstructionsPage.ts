import { expect, type Locator, type Page } from "@playwright/test";

import { BasePage } from "../basePage.js";

interface InstructionContentQualityOptions {
  contextName: string;
  expectedTerms?: string[];
  linkLimit?: number;
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

  async assertLoaded(expectedTerms: string[] = []): Promise<void> {
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

    for (const term of expectedTerms) {
      await expect(contentBody).toContainText(new RegExp(escapeRegex(term), "i"), {
        timeout: WorkshopInstructionsPage.INSTRUCTIONS_READY_TIMEOUT_MS,
      });
    }
  }

  async assertContentQuality(options: InstructionContentQualityOptions): Promise<void> {
    const contentBody = await this.instructionContentBody();

    await this.assertExpectedTerms(contentBody, options.expectedTerms ?? [], options.contextName);
    await this.assertNoObviousTextDefects(contentBody, options.contextName);
    await this.assertNoBrokenVisibleImages(contentBody, options.contextName);
    await this.assertNoBrokenEmbeddedContent(contentBody, options.contextName);
    await this.assertNoBrokenLinks(contentBody, options);
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

  private async assertExpectedTerms(contentBody: Locator, expectedTerms: string[], contextName: string): Promise<void> {
    for (const term of expectedTerms) {
      await expect(contentBody, `${contextName} should stay relevant to "${term}"`).toContainText(
        new RegExp(escapeRegex(term), "i"),
      );
    }
  }

  private async assertNoObviousTextDefects(contentBody: Locator, contextName: string): Promise<void> {
    const bodyText = await contentBody.innerText({ timeout: BasePage.DEFAULT_TIMEOUT_MS });
    const defects = TEXT_DEFECT_PATTERNS.filter(({ pattern }) => pattern.test(bodyText)).map(({ label }) => label);

    expect(defects, `${contextName} has obvious placeholder text or misspellings`).toEqual([]);
  }

  private async assertNoBrokenVisibleImages(contentBody: Locator, contextName: string): Promise<void> {
    const images = contentBody.locator("img[src]:visible");
    const imageCount = await images.count();

    for (let index = 0; index < imageCount; index += 1) {
      await images.nth(index).scrollIntoViewIfNeeded();
    }

    const brokenImages = await images.evaluateAll((elements) =>
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
    );

    expect(brokenImages, `${contextName} should not show broken visible images`).toEqual([]);
  }

  private async assertNoBrokenEmbeddedContent(contentBody: Locator, contextName: string): Promise<void> {
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

    expect(brokenEmbeds, `${contextName} should not show broken visible embedded content`).toEqual([]);
  }

  private async assertNoBrokenLinks(contentBody: Locator, options: InstructionContentQualityOptions): Promise<void> {
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

    expect(
      brokenLinks,
      `${options.contextName} should not expose broken visible links. Set QA_CONTENT_LINK_LIMIT=0 to check every visible content link.`,
    ).toEqual([]);
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
