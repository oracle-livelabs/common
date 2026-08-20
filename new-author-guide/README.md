# Oracle LiveLabs Author Guide

Trimmed LiveLabs delivery payload for the redesigned author guide.

Serve the redesigned guide with `node .codex-author-guide-server.cjs 4190`. The primary routes are `/home`, `/quickstart`, `/cheatsheet`, and `/nodoc`; `/` redirects to `/home`. Legacy hash URLs are converted to the matching clean route by the application.

The visible `Step by Step Guide` actions and the `workshops/author-guide/` and `workshops/livelabs/` compatibility routes open the live original guide, preserving a `?lab=<page-id>` target when one is supplied.

Canonical local guide content lives in `content/author-guide/` and is indexed by `workshops/author-guide/manifest.json` so the redesigned cards can render the same page order without sending users to hidden local fallback pages.
