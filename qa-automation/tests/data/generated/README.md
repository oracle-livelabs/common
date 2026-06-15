# Generated Catalog Data

`livelabs_catalog_index.json` is produced by:

```powershell
npm run catalog:index
```

The generated JSON is intentionally ignored by Git because it reflects the live
catalog at crawl time. Run the indexer before the generated Stage 3 suite:

```powershell
npm run catalog:index
npm run test:generated
```

The generated suite uses this index to create isolated tests for each catalog
item:

- workshop overview pages
- LiveStack overview pages
- preview instructions, when offered
- Run on your tenancy/environment instructions, when offered

The tenancy test only validates the instructions page that opens from the launch
dialog. It does not provision resources or run anything inside a tenancy.

For a small local slice:

```powershell
$env:QA_CATALOG_INDEX_LIMIT="5"
npm run test:generated
```
