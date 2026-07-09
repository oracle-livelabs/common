import { catalogIndexItems, loadCatalogIndex } from "../../support/catalogIndex.js";
import { expect, test } from "../../support/test.js";

const GENERATED_INDEX_TAGS = ["@generated", "@platform", "@catalog-index"];

const loadResult = loadCatalogIndex();

test.describe("LiveLabs generated catalog index", { tag: GENERATED_INDEX_TAGS }, () => {
  if (loadResult.status === "missing") {
    test("catalog index is not generated", async () => {
      test.skip(true, loadResult.message);
    });
  } else {
    test("contains unique workshop and LiveStack entries", async () => {
      const items = catalogIndexItems();
      const ids = new Set(items.map((item) => item.id));
      const hrefs = new Set(items.map((item) => `${item.type}|${item.normalized_href}`));

      const workshopCount = items.filter((item) => item.type === "workshop").length;
      const liveStackCount = items.filter((item) => item.type === "livestack").length;

      expect(items.length, "generated catalog index should contain catalog cards").toBeGreaterThan(0);
      expect(ids.size, "generated catalog item IDs should be unique").toBe(items.length);
      expect(hrefs.size, "generated catalog item hrefs should be unique per type").toBe(items.length);
      expect(workshopCount + liveStackCount, "generated catalog type counts should match indexed items").toBe(items.length);
    });
  }
});
