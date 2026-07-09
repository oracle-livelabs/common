# Generated Catalog Data

`livelabs_catalog_index.json` is produced by:

```powershell
npm run catalog:index
```

The generated JSON is intentionally ignored by Git because it reflects the live
catalog at crawl time. The crawler also writes
`livelabs_catalog_index.summary.json` with counts by item type and catalog page.
Run the indexer before the generated Stage 3 suite:

```powershell
npm run catalog:index
npm run test:generated
```

The generated suite uses this index to create isolated tests for each catalog
item:

- workshop overview pages
- LiveStack overview pages
- LiveStack resource workshops and asset actions
- preview instructions, when offered
- Run on your tenancy/environment instructions, when offered

The tenancy test only validates the instructions page that opens from the launch
dialog. It does not provision resources or run anything inside a tenancy.

To see the generated tests without running browsers:

```powershell
node ./scripts/qa.mjs tests/platform/generated --collect-only
```

For a small local slice:

```powershell
$env:QA_CATALOG_INDEX_LIMIT="5"
npm run test:generated
```

To split a full catalog run:

```powershell
$env:QA_CATALOG_INDEX_SHARD="2/4"
npm run test:generated
```

For private items, keep `QA_LIVELABS_USERNAME`, `QA_LIVELABS_PASSWORD`,
`QA_AUTH_TARGET_URL`, and `QA_STORAGE_STATE` in `.env` or CI secrets, then run:

```powershell
npm run auth:storage
npm run test:generated
```
