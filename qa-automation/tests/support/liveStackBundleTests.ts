import type { Page, TestInfo } from "@playwright/test";
import type { EnvironmentConfig } from "../../config/projectConfig.js";
import type { LiveStackLandingPage } from "../../pages/platform/liveStackLandingPage.js";
import type { WorkshopLandingPage } from "../../pages/platform/workshopLandingPage.js";
import {
  attachCatalogItem,
  catalogItemTestTitle,
  expectedTermsForCatalogItem,
  expectedTermsForText,
  loadCatalogIndex,
  type CatalogIndexItem,
} from "./catalogIndex.js";
import { assertContentQuality } from "./contentQuality.js";
import { openIndexedCatalogItem } from "./indexedCatalogNavigation.js";
import { signInIfRequired } from "./authenticatedNavigation.js";
import { expect, test } from "./test.js";

export type LiveStackBundleComponent = "bundle-page" | "demos" | "workshops";

export type LiveStackBundleResolution =
  | { status: "missing-index"; message: string }
  | { status: "loaded"; item?: CatalogIndexItem };

export interface LiveStackBundleFixtures {
  authRuntime: Parameters<typeof openIndexedCatalogItem>[1];
  environmentConfig: EnvironmentConfig;
  liveStackLandingPage: LiveStackLandingPage;
  page: Page;
  targetEnvironment: string;
  workshopLandingPage: WorkshopLandingPage;
}

export function resolveLiveStackBundle(slug: string): LiveStackBundleResolution {
  const loadResult = loadCatalogIndex();
  if (loadResult.status === "missing") {
    return { status: "missing-index", message: loadResult.message };
  }

  return {
    status: "loaded",
    item: loadResult.index.items.find((candidate) => candidate.type === "livestack" && candidate.slug === slug),
  };
}

export async function runLiveStackBundleTest(
  component: LiveStackBundleComponent,
  item: CatalogIndexItem,
  fixtures: LiveStackBundleFixtures,
  testInfo: TestInfo,
): Promise<void> {
  const { authRuntime, environmentConfig, liveStackLandingPage, page, targetEnvironment } = fixtures;
  await annotateBundle(item, targetEnvironment, environmentConfig.base_url, testInfo);

  if (component === "bundle-page") {
    await openBundle(page, authRuntime, environmentConfig.base_url, item, liveStackLandingPage, "bundle page");
    await assertContentQuality(page, {
      contextName: `LiveStack bundle page: ${item.title}`,
      expectedTerms: expectedTermsForCatalogItem(item),
      expectedTermsMode: "any",
    });
    return;
  }

  if (component === "demos") {
    await openBundle(page, authRuntime, environmentConfig.base_url, item, liveStackLandingPage, "demo links");
    const demos = await liveStackLandingPage.demoRecords();
    expect(demos, `${item.title} should expose a demo link or demo asset`).not.toEqual([]);
    await testInfo.attach("livestack-demo-items.json", {
      body: JSON.stringify(demos, null, 2),
      contentType: "application/json",
    });

    for (const demo of demos) {
      expect(demo.title, "demo entries should have a readable label").not.toBe("");
      if (demo.tagName === "a") expect(demo.href, `${demo.title} should have a destination`).toMatch(/\S/);
    }
    return;
  }

  const openBundlePage = () =>
    openBundle(page, authRuntime, environmentConfig.base_url, item, liveStackLandingPage, "workshop links");
  await openBundlePage();
  const workshops = await liveStackLandingPage.workshopResourceRecords();
  expect(workshops, `${item.title} should list at least one workshop`).not.toEqual([]);
  await testInfo.attach("livestack-workshop-items.json", {
    body: JSON.stringify(workshops, null, 2),
    contentType: "application/json",
  });

  for (const workshop of workshops) {
    await test.step(`Open workshop: ${workshop.title}`, async () => {
      await openBundlePage();
      await liveStackLandingPage.openWorkshopResource(workshop);
      await signInIfRequired(page, authRuntime, `LiveStack workshop: ${workshop.title}`);
      await fixtures.workshopLandingPage.assertLoaded(workshop.title);
      await assertContentQuality(page, {
        contextName: `LiveStack workshop: ${workshop.title}`,
        expectedTerms: expectedTermsForText(workshop.title),
        expectedTermsMode: "any",
      });
    });
  }
}

export function liveStackBundleTestTitle(component: LiveStackBundleComponent, item: CatalogIndexItem): string {
  const itemTitle = catalogItemTestTitle(item);
  if (component === "bundle-page") return `loads the bundle page for ${itemTitle}`;
  if (component === "demos") return `exposes demo entry points for ${itemTitle}`;
  return `opens bundle workshops for ${itemTitle}`;
}

async function openBundle(
  page: Page,
  authRuntime: LiveStackBundleFixtures["authRuntime"],
  baseUrl: string,
  item: CatalogIndexItem,
  liveStackLandingPage: LiveStackLandingPage,
  contextName: string,
): Promise<void> {
  await openIndexedCatalogItem(page, authRuntime, baseUrl, item, `LiveStack ${contextName}: ${item.title}`);
  await liveStackLandingPage.assertLoaded(item.title);
}

async function annotateBundle(
  item: CatalogIndexItem,
  targetEnvironment: string,
  baseUrl: string,
  testInfo: TestInfo,
): Promise<void> {
  testInfo.annotations.push({ type: "environment", description: `${targetEnvironment} -> ${baseUrl}` });
  testInfo.annotations.push({ type: "catalog-item", description: `${item.id} -> ${item.normalized_href}` });
  await attachCatalogItem(testInfo, item);
}

