const { test, expect } = require("@playwright/test");

test("public cohort and Jenkins score overlay use one public-only data boundary", async ({ request }) => {
  const inventoryResponse = await request.get("/inventory/data/public_portfolio_inventory.json");
  expect(inventoryResponse.ok()).toBe(true);
  const inventory = await inventoryResponse.json();
  const publicIds = new Set(inventory.records.map((record) => String(record.livelabsId || "").trim()).filter(Boolean));
  expect(inventory.metadata.data_scope).toBe("public_published");
  expect(inventory.records.length).toBeGreaterThan(0);
  expect(publicIds.size).toBe(inventory.records.length);
  expect(inventory.records.every((record) => record.publishType === "Public" && record.publishStatus === "Published")).toBe(true);
  for (const record of inventory.records) {
    for (const sibling of record.family?.siblings || []) {
      expect(sibling.publishType).toBe("Public");
      expect(sibling.publishStatus).toBe("Published");
    }
  }

  const stateResponse = await request.get("/api/dashboard-admin-state");
  expect(stateResponse.ok()).toBe(true);
  const state = await stateResponse.json();
  const merge = state.qaReportMerge;
  const matchedCount = Object.keys(merge.overlay).length;
  expect(merge.summary.publicScope).toEqual({
    eligibleItems: inventory.records.length, matchedItems: matchedCount,
    unmatchedItems: inventory.records.length-matchedCount,
    coveragePercent: Math.round(1000*matchedCount/inventory.records.length)/10
  });
  const overlays = Object.entries(merge.overlay);
  expect(overlays.length).toBeGreaterThan(0);
  expect(overlays.every(([id]) => publicIds.has(id))).toBe(true);
  const unmatchedRecords = inventory.records.filter((record) => !Object.hasOwn(merge.overlay, String(record.livelabsId)));
  expect(unmatchedRecords).toHaveLength(inventory.records.length-matchedCount);
  expect(unmatchedRecords.every((record) => record.type === "Workshop")).toBe(true);

  let p1Rows = 0;
  let p2Occurrences = 0;
  let p3Occurrences = 0;
  let scored = 0;
  for (const [, overlay] of overlays) {
    const counts = overlay.priorityCounts;
    p1Rows += Number(counts.p1 || 0) + Number(counts.p1Verification || 0);
    p2Occurrences += Number(counts.p2Occurrences || 0);
    p3Occurrences += Number(counts.p3Occurrences || 0);
    expect(overlay.scoreState).toMatch(/^(scored|unmapped-priority|inspection-unavailable|no-completed-checks|invalid-check-counts|incomplete-checks|unexplained-failure)$/);
    if (overlay.jenkinsErrorScore !== null) {
      scored++;
      const burden = 2 * Number(counts.p2Occurrences || 0) + Number(counts.p3Occurrences || 0);
      const expected = Math.round((100 * burden / (burden + 20)) * 100) / 100;
      expect(overlay.jenkinsErrorScore).toBe(expected);
      expect(overlay.scoreState).toBe("scored");
    } else {
      expect(overlay.scoreState).not.toBe("scored");
    }
  }
  expect(p1Rows).toBeGreaterThanOrEqual(0);
  expect(p2Occurrences).toBeGreaterThan(0);
  expect(p3Occurrences).toBeGreaterThanOrEqual(0);
  expect(scored).toBeGreaterThan(0);
});

test("full Inventory and Admin pages stay behind the sign-in boundary", async ({ page, request }) => {
  const adminInventory = await request.get("/api/admin/inventory");
  expect(adminInventory.status()).toBe(401);
  const privateAsset = await request.get("/inventory/data/portfolio_inventory.json");
  expect(privateAsset.status()).toBe(404);

  const oldInventoryRoute = await request.get("/inventory/", { maxRedirects: 0 });
  expect(oldInventoryRoute.status()).toBe(302);
  expect(oldInventoryRoute.headers().location).toBe("/admin/inventory");

  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const routes = [
    "/admin", "/admin/dashboard-management", "/admin/data-merge",
    "/admin/governance", "/admin/inventory", "/admin/user-settings"
  ];
  for (const route of routes) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response.ok(), `${route} should serve the sign-in gate`).toBe(true);
    await expect(page.locator("body")).toHaveClass(/admin-login-page/);
    await expect(page.getByRole("heading", { level: 1, name: "Admin sign in" })).toBeVisible();
    await expect(page.locator('link[rel="stylesheet"][href*="admin-login.css"]')).toHaveCount(1);
  }
  expect(pageErrors).toEqual([]);
});
