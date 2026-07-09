# LiveLabs Analytics Documentation

This folder keeps non-runtime notes and references out of the dashboard root.

- `reports/` contains historical validation and review notes.
- `reference/standalone-pages-workflow.yml` preserves the standalone GitHub Pages workflow that used to live under `.github/workflows/`. In the `common` repository, that nested workflow does not run; GitHub Actions reads workflows from the repository root `.github/workflows`.
- `reference/static-bundle-object-storage-handoff.md` records the static bundle contents, exclusions, and validation commands for the pre-Object Storage copy.

Runtime dashboard files stay at the project root or in `data/`, `assets/`, and `content/`.
