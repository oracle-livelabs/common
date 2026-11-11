# Launch Check

Run this check before delivery, even if the user did not ask for QA detail.

## Manifest And Entry Checks
- Confirm the top-level manifest still points to real files.
- Confirm renamed labs, introduction files, and variant folders match manifest entries.
- Confirm workshop entrypoints resolve after any industry-specific renaming.
- Confirm shared assets and referenced images still exist at the rewritten paths.
- Confirm source screenshots and image folders were not silently dropped during conversion.

## Cross-File Checks
- Confirm headings, task numbers, and file names align with manifest order.
- Confirm links between labs still work.
- Confirm screenshots and asset references use the rewritten domain names where required.
- Confirm code snippets, object names, and sample outputs align with the converted domain.
- Confirm generic setup labs and tooling labs were not unnecessarily rewritten away from the source.
- Confirm source and converted labs have comparable section coverage and task coverage.

## Launch Readiness
- The workshop should be able to launch without missing file targets.
- No manifest entry should point to deleted source-domain paths.
- No launch file should mix old and new folder names.

## QA Summary Minimum

Report at least:
- whether manifests resolve,
- whether launch targets are coherent,
- whether source screenshots and assets were preserved,
- whether source section and task coverage was preserved,
- whether leftover source-domain residue was found,
- whether any unresolved SME gap remains.
