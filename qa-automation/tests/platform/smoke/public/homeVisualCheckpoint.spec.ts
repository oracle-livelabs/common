import { test } from "../../../support/test.js";

const HOME_VISUAL_TAGS = ["@smoke", "@platform", "@home", "@visual", "@ui"];

test.describe("LiveLabs home visual checkpoint", { tag: HOME_VISUAL_TAGS }, () => {
  test("captures the current public home UI for report review", async ({ environmentConfig, homePage, qaArtifacts }) => {
    await homePage.goto(environmentConfig.base_url);
    await homePage.assertLoaded();
    await qaArtifacts.captureCheckpoint("home-current-ui", { fullPage: true });
  });
});
