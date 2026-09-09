import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
  assertParAuditPassed,
  auditParCandidates,
  buildParAuditAttachment,
  extractParUrlsFromText,
  isObviousParPlaceholder,
  isParUrl,
  maskParUrl,
  sanitizeDiagnosticMessage,
  sanitizeSourceUrl,
  parFingerprint,
  parseParUrl,
} from "../../support/parAudit.js";
import { sourceTextCandidates } from "../../support/parSourceDiscovery.js";
import { catalogRouteFailure } from "../../support/indexedCatalogNavigation.js";

const PAR_URL =
  "https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/fake-token-value/n/example/b/qa/o/assets/demo.zip";

test.describe("PAR audit core", { tag: ["@par", "@unit"] }, () => {
  test("recognizes confirmed invalid catalog redirects without waiting for a timeout", () => {
    expect(
      catalogRouteFailure(
        "https://livelabs.oracle.com/ords/r/dbpm/livelabs/home?p1_invalid_workshop_id=3794&session=123",
      ),
    ).toContain("p1_invalid_workshop_id=3794");
    expect(
      catalogRouteFailure(
        "https://livelabs.oracle.com/ords/r/dbpm/livelabs/home?p1_invalid_livestack_id=42",
      ),
    ).toContain("p1_invalid_livestack_id=42");
    expect(
      catalogRouteFailure(
        "https://livelabs.oracle.com/ords/r/dbpm/livelabs/view-workshop?wid=3794",
      ),
    ).toBeUndefined();
  });

  test("recognizes and masks OCI PAR URLs", () => {
    expect(isParUrl(PAR_URL)).toBe(true);
    expect(isParUrl("https://objectstorage.eu-frankfurt-1.oraclecloud.com/n/example/b/qa/o/demo.zip")).toBe(false);

    const masked = maskParUrl(PAR_URL + "?download=1");
    expect(masked).toContain("/p/***/");
    expect(masked).not.toContain("fake-token-value");
    expect(parFingerprint(PAR_URL)).toHaveLength(16);

    const location = parseParUrl(PAR_URL);
    expect(location?.region).toBe("eu-frankfurt-1");
    expect(location?.namespace).toBe("example");
    expect(location?.bucket).toBe("qa");
    expect(location?.objectName).toBe("assets/demo.zip");
  });

  test("extracts PAR URLs from rendered text and markup", () => {
    const found = extractParUrlsFromText(
      "curl '" +
        PAR_URL +
        "' and <a href=\"" +
        PAR_URL +
        "?download=1&amp;name=demo\">asset</a> and **[download](" +
        PAR_URL +
        "?markdown=1)**",
    );

    expect(found).toHaveLength(3);
    expect(found.every((url) => isParUrl(url))).toBe(true);
    expect(found.every((url) => !url.endsWith(")**"))).toBe(true);
  });

  test("ignores explicit angle-bracket PAR placeholders without hiding real links", () => {
    const placeholderUrl =
      "https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/%3Cyour-par-token%3E/n/example/b/qa/o/oci-files.zip";
    const replacementUrl =
      "https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/%3Creplace-with-par-url%3E/n/example/b/qa/o/oci-files.zip";
    const markdown = [
      "Placeholder: " + placeholderUrl,
      "Replacement: " + replacementUrl,
      "Real autolink: <" + PAR_URL + ">",
      "Download this real link to your computer: " + PAR_URL,
    ].join("\n");

    expect(isObviousParPlaceholder(placeholderUrl)).toBe(true);
    expect(isObviousParPlaceholder(replacementUrl)).toBe(true);
    expect(isParUrl(placeholderUrl)).toBe(false);
    expect(extractParUrlsFromText(markdown)).toEqual([PAR_URL]);
  });

  test("records the exact Markdown section and line for a PAR", () => {
    const markdown = [
      "# Workshop",
      "",
      "## Task 8: Install sample data",
      "",
      "1. Get sample file",
      "",
      "    <copy>wget " + PAR_URL + "</copy>",
    ].join("\n");
    const candidates = sourceTextCandidates(markdown, {
      pageType: "tenancy-instructions-lab",
      pageUrl: "https://example.com/index.html?lab=install",
      label: "Lab 2",
      sourceFileUrl: "https://example.com/install.md",
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].sources[0]).toMatchObject({
      sourceLine: 7,
      section: "Task 8: Install sample data",
      instruction: "1. Get sample file",
      searchText: "assets/demo.zip",
      location: "Markdown line 7",
      sourceExcerpt:
        "wget https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/***/n/example/b/qa/o/assets/demo.zip",
    });
    expect(candidates[0].sources[0].sourceExcerpt).not.toContain("fake-token-value");
  });
  test("uses GET range to confirm a broken PAR after HEAD", async () => {
    const request = mockRequest(405, 404);
    const results = await auditParCandidates(
      request,
      "catalog",
      [{ url: PAR_URL, sources: [{ pageType: "instructions", pageUrl: "https://example.com/lab", label: "Lab" }] }],
      { retries: 0, retryDelayMs: 0, timeoutMs: 100, concurrency: 1 },
    );

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("broken");
    expect(results[0].http_status).toBe(404);
    expect(results[0].method).toBe("GET range");
    expect(JSON.stringify(results[0])).not.toContain("fake-token-value");
  });

  test("keeps temporary failures separate from confirmed broken links", async () => {
    const request = mockRequest(503, 429);
    const results = await auditParCandidates(
      request,
      "catalog",
      [{ url: PAR_URL, sources: [{ pageType: "instructions", pageUrl: "https://example.com/lab", label: "Lab" }] }],
      { retries: 1, retryDelayMs: 0, timeoutMs: 100, concurrency: 1 },
    );

    expect(results[0].status).toBe("unverified");
    expect(results[0].attempts).toBe(2);
  });

  test("fails a result when part of the page crawl was not scanned", () => {
    const audit = buildParAuditAttachment("catalog", "Workshop", [], {
      pagesScanned: 2,
      scanErrors: [
        {
          page_type: "preview-instructions",
          page_url: "https://example.com/instructions",
          label: "Lab 2",
          error: "Navigation timed out.",
        },
      ],
    });

    expect(() => assertParAuditPassed(audit)).toThrow(/page scan error/i);
  });

  test("removes PAR tokens, cookies, authorization, and APEX sessions from diagnostics", () => {
    const diagnostic = sanitizeDiagnosticMessage(
      "Call log:\n - cookie: private-cookie-value\n - authorization: Bearer private-auth-value\n - GET " + PAR_URL + "?session=12345",
    );
    const nestedSource = sanitizeSourceUrl(
      "https://example.com/instructions?session=12345&manifest=" + encodeURIComponent(PAR_URL),
    );

    expect(diagnostic).not.toContain("private-cookie-value");
    expect(diagnostic).not.toContain("private-auth-value");
    expect(diagnostic).not.toContain("fake-token-value");
    expect(diagnostic).not.toContain("session=12345");
    expect(nestedSource).not.toContain("fake-token-value");
    expect(nestedSource).not.toContain("session=");
  });
});

function mockRequest(headStatus: number, getStatus: number): APIRequestContext {
  const response = (status: number) => ({
    status: () => status,
    dispose: async () => undefined,
  });

  return {
    head: async () => response(headStatus),
    get: async () => response(getStatus),
  } as unknown as APIRequestContext;
}
