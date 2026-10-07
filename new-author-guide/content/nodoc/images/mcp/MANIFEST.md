# NoDoc MCP visual provenance

Created for the local author-guide refresh on 7 October 2026.

| Asset | Type | Source / purpose | Capture details |
| --- | --- | --- | --- |
| `01-token-form.jpg` | Actual product screenshot | `https://asknodoc.oraclecorp.com/mcp-access-tokens`; empty form and empty inventory | Browser full-page JPEG, 1264 × 801 pixels. No token created. |
| `02-token-label.jpg` | Actual product screenshot | Same page with the sample label **Windows laptop** | Browser full-page JPEG, 1264 × 801 pixels. Example expiry only; Generate access token was not selected. |
| `windows-variable.svg` | Original explanatory illustration | Oracle-documented Windows dialog sequence | 1120 × 610 viewBox; secret value omitted. Not a screenshot. |
| `config-map.svg` | Original explanatory illustration | Config references a named user variable | 1120 × 500 viewBox; token value omitted. Not a screenshot. |
| `architecture.svg` | Original conceptual diagram, revised after visual review | Numbered Codex → NoDoc MCP → authorized-content flow, separate result routes, local configuration and skill | 1440 × 680 viewBox; embedded Oracle Sans from the page assets, page-matched Redwood palette, outline pictograms; logical responsibilities only. |
| `architecture-compact.svg` | Responsive version of the conceptual diagram | Same responsibilities and permissions, arranged vertically for viewports up to 900 pixels wide | 760 × 1144 viewBox; embedded Oracle Sans; selected by the HTML picture element and preserved by the expanded-image viewer. |
| `publish-lifecycle.svg` | Original workflow diagram | LiveLabs preview, status, QA, review, explicit push | 1120 × 650 viewBox; no real request or status implied. |

The manual NoDoc Draft Version and Difference Viewer screenshots now appear only in Lab 3, Task 2. Their duplicate UI-companion figures were removed from Lab 8, Task 8 when the manual and Codex MCP draft workflows were separated. The MCP task uses chat prompts and expected results; it does not present browser controls as required MCP steps.

All illustrations include SVG titles/descriptions and HTML alternative text. All figures use the shared keyboard-accessible image viewer. Local browser QA screenshots and their manifest are in `output/screenshots/nodoc-mcp-2026-10-07/` from the guide root; that output folder is intentionally ignored by Git.

Architecture refinement evidence is in `output/screenshots/nodoc-architecture-refined/`. Both layouts return content results through NoDoc MCP to Codex, distinguish token identity from authorization, and identify the local skill as workflow guidance. Rendered geometry checks found no text overflow or collisions between text, icons, and connectors. The illustrations describe the logical flow; they do not claim a live authenticated test or document internal service deployment.
