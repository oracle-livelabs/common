# How To Add A New Test

Use this flow for new Playwright specs.

## 1. Pick The Lane

- Use `tests/platform/smoke` for fast local confidence checks.
- Use `tests/platform/regression` for focused edge cases or previously fragile behavior.
- Use `tests/platform/auth` only when the test requires a storage-state file or authenticated target URL.

## 2. Add The Spec

Import the shared fixture:

```ts
import { expect, test } from "../../../support/test.js";
```

Use tags on `test.describe`:

```ts
const TAGS = ["@smoke", "@platform", "@search", "@ui"];

test.describe("LiveLabs search", { tag: TAGS }, () => {
  test("opens results for a known term", async ({ environmentConfig, homePage, workshopCardsPage }) => {
    await test.step("Open the home page", async () => {
      await homePage.goto(environmentConfig.base_url);
    });

    await test.step("Search", async () => {
      await homePage.searchFor("OCI");
    });

    await test.step("Verify results", async () => {
      await workshopCardsPage.assertLoaded("OCI");
    });
  });
});
```

## 3. Keep Logic In The Right Place

- Page selectors and navigation behavior belong in `pages/platform`.
- Shared fixtures belong in `tests/support/test.ts`.
- Shared data belongs in `tests/data`.
- Reusable case parsing belongs in `tests/support`.
- Spec files should stay behavior-focused.
- Do not add future-only page objects, API helpers, fixtures, or interfaces.
- Prefer editing an existing page object or support helper before creating a new one.

## 4. Validate Locally

Run these before committing:

```powershell
npm run typecheck
npm run test:collect
node ./scripts/qa.mjs tests/platform/smoke/public/yourSpec.spec.ts
```

Run the broader lane when the new test changes shared page objects or support code:

```powershell
node ./scripts/qa.mjs tests/platform/smoke
node ./scripts/qa.mjs tests/platform/regression
```
