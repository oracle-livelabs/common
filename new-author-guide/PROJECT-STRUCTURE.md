# Project Structure

## Intent

This repo has one canonical content tree and two presentation layers:

1. a redesigned app route for Guided Path, Toolkit, Full Guide, and search
2. a markdown-first fallback route for the full original guide

The old section-based source model is no longer the active authoring source of truth.

## Parent Access Points

* `index.html`
  Parent application shell and redesigned guide home.
  Child routes live inside the same page as modes: Home, Guided Path, Toolkit, Full Guide, and Search.
* `workshops/author-guide/index.html`
  Parent markdown fallback entry for the full author guide.
  Child pages are selected through `?lab=<page-id>` and are ordered by `workshops/author-guide/manifest.json`.
* `workshops/variants/compute/index.html`
  Parent markdown entry for the focused compute-image workflow subset.
* `workshops/variants/marketplace/index.html`
  Parent markdown entry for the focused Marketplace-image workflow subset.

## Canonical Source

* `content/author-guide/`
  Flat canonical markdown, images, helper scripts, and variables for the author guide.
  This is the first place to update when the guide content changes.
* `workshops/author-guide/manifest.json`
  Canonical page order for the full guide.
  The redesigned Full Guide reads this same flat order at runtime.
  Anything not listed here stays outside the active Full Guide and markdown navigation even if legacy files still exist elsewhere in the repo.
  If the local source mirror lags the live upstream guide, this manifest can carry a small explicit delta such as the active AI Developer Hub page.

## Presentation Layer Files

* `assets/js/guide-content.js`
  Guided Path and Toolkit source data for the redesigned app.
  This file is no longer the canonical source for the full guide route.
* `assets/js/author-guide-app.js`
  Redesigned app behavior, routing, search, and manifest-driven Full Guide rendering.
* `assets/js/markdown-guide-shell.js`
  Shared markdown shell enhancements, page-local search, image lightbox, and `embed=1` behavior for the redesigned Full Guide preview.
* `assets/css/markdown-guide-shell.css`
  Shared shell styling for the full-page markdown route and embedded markdown preview.

## Workshop Folder Map

* `workshops/author-guide/`
  Active full-page markdown fallback.
* `workshops/variants/`
  Active child entrypoints for focused subsets:
  `compute/`
  `marketplace/`
* `workshops/livelabs/`
  Compatibility shim that redirects to `workshops/author-guide/`.
* `workshops/compute/`
  Compatibility shim that redirects to `workshops/variants/compute/`.
* `workshops/marketplace/`
  Compatibility shim that redirects to `workshops/variants/marketplace/`.
The legacy section-based wrappers were removed from the LiveLabs payload. The active markdown route is `workshops/author-guide/`; focused entry points live under `workshops/variants/`.

## Supporting Folders

* `sample-workshops/`
  Applied demo workshop surfaces.
* Local-only workbench files, archived references, generated QA output, and validation artifacts are intentionally excluded by `.gitignore`.

## Editing Guidance

* If guide content changes, update `content/author-guide/` first.
* If page order changes, update `workshops/author-guide/manifest.json`.
* If the redesigned Full Guide needs to reflect the new order or metadata, update the manifest-driven behavior in `assets/js/author-guide-app.js`.
* If Guided Path or Toolkit copy changes, update `assets/js/guide-content.js`.
* If the markdown fallback shell changes, update `assets/js/markdown-guide-shell.js` and `assets/css/markdown-guide-shell.css`.
* Leave compatibility shims in place unless you are explicitly removing old URLs.
