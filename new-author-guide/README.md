# Oracle LiveLabs Author Guide

Trimmed LiveLabs delivery payload for the redesigned author guide.

Use `index.html` for the redesigned guide. The visible `Full Guide` actions and the `workshops/author-guide/` and `workshops/livelabs/` compatibility routes open the live original guide, preserving a `?lab=<page-id>` target when one is supplied.

Canonical local guide content lives in `content/author-guide/` and is indexed by `workshops/author-guide/manifest.json` so the redesigned cards can render the same page order without sending users to hidden local fallback pages.
