# Generated LiveStack tests

The LiveLabs catalog filtered to `Type=LiveStack` showed 13 bundle titles on
2026-10-15. The title-to-slug snapshot lives in
[`tests/data/livestack-bundle-targets.json`](../../data/livestack-bundle-targets.json).
Each bundle has one folder and one spec for each browser surface:

```text
tests/generated/livestacks/<bundle-slug>/
  bundle-page.generated.spec.ts
  demos.generated.spec.ts
  workshops.generated.spec.ts
```

The bundle-page spec checks the landing page and its content. The demos spec
checks that demo entry points are present and have useful labels and
destinations. The workshops spec opens every workshop resource linked from the
bundle and checks its overview content. The generated specs register their own
Playwright tests so collection and reports retain the bundle-specific file path.

Each spec resolves its slug against the generated catalog index at collection
time. A missing index or missing slug creates a visible failing test. This
prevents a collected placeholder from being reported as successful coverage.
These specs provide 13 x 3 = 39 bundle/component targets once the index maps
all 13 titles to canonical LiveLabs catalog records. The index and catalog ID
manifest are not currently reconciled; catalog discovery alone is not evidence
that browser tests passed.

The shared generated overview and resource-drilldown specs remain in this
directory for cross-catalog checks. They complement the bundle-specific checks
and do not replace the 13-target denominator enforced by the all-13 coverage
manifest.
