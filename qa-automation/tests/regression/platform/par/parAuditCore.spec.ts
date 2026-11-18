import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { auditParCandidates } from "../../../support/parAudit.js";
import { catalogRouteFailure } from "../../../support/indexedCatalogNavigation.js";

const PAR_URL =
  "https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/fake-token-value/n/example/b/qa/o/assets/demo.zip";

test.describe("PAR audit integration core", { tag: ["@par", "@regression"] }, () => {
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
      catalogRouteFailure("https://livelabs.oracle.com/ords/r/dbpm/livelabs/view-workshop?wid=3794"),
    ).toBeUndefined();
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
