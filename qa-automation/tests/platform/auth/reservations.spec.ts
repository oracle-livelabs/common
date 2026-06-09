import { test } from "../../support/test.js";

const RESERVATIONS_TAGS = ["@auth", "@platform", "@reservations", "@smoke"];

test.describe("LiveLabs reservations smoke", { tag: RESERVATIONS_TAGS }, () => {
  test("loads the configured reservations page for an authenticated user", async ({ authRuntime, reservationsPage }) => {
    const reservationsUrl = process.env.QA_RESERVATIONS_URL?.trim() ?? "";

    test.skip(!authRuntime.hasStorageState, "requires QA_STORAGE_STATE pointing to a Playwright storage-state file");
    test.skip(!reservationsUrl, "requires QA_RESERVATIONS_URL pointing to the reservations page");

    await reservationsPage.goto(reservationsUrl);
    await reservationsPage.assertLoaded();
  });
});
