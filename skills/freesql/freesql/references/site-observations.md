# FreeSQL Site Observations

Observed live on 2026-03-20 while validating the skill.

## Entry Points

- `https://freesql.com/landing/` is the landing page and routes into the modern worksheet.
- The working application is at `https://freesql.com/`.
- The main top-level areas are `Worksheet` and `Library`.

## Editor And Execution

- The worksheet exposes an editor textbox labeled `Editor content;Press Alt+F1 for Accessibility Options.`
- `Ctrl+Enter` / `Cmd+Enter` runs the current statement.
- `F5` runs the script.
- Query results appear under `Query result`; script output and DBMS output use their own tabs.
- Forward test on 2026-03-20:
  - Executed `select * from hr.employees fetch first 5 rows only;`
  - Result returned 5 rows in the `Query result` grid.

## Blockers

- Cookie consent is rendered by TrustArc and can block clicks from a shadow-root host attached to the page.
- The in-product tour uses Hopscotch and can block toolbar clicks until the close button is pressed.

## Share Drawer

- FreeSQL bundles a share drawer titled `Share Code`.
- The drawer modes are:
  - `Share Link`
  - `Run in FreeSQL Button`
  - `Embedded Editor`
- The embedded mode generates an `/embedded/` URL with parameters including:
  - `layout=vertical`
  - `compressed_code=...`
  - `code_language=...`
  - `code_format=...`
- The bundle includes an iframe template with these defaults:
  - `height="460px"`
  - `width="100%"`
  - `scrolling="no"`
  - `frameborder="0"`
  - `allowfullscreen="true"`
  - `name="FreeSQL Embedded Playground"`
  - `title="FreeSQL"`
- The non-iframe HTML output is a `Run in FreeSQL` anchor/button.
- The live UI validation on 2026-03-20 confirmed that:
  - The share button enabled after a normal anonymous query run in a fresh session.
  - The `Share Code` drawer opened successfully.
  - The `Embedded Editor` tab rendered both an iframe preview and a code view with the iframe snippet.

## Limits And Caveats

- The share drawer reports `Your code block exceeds the 4000-character limit.` when the payload is too large.
- The language selector includes `PL/SQL` and `QuickSQL` by default.
- `JavaScript` is also supported when the page is in the 23ai context.
- In the anonymous scratch worksheet, the visible share button host is `#code-editor-generate-run-btn`.
- During validation, that button could remain disabled in one session even when executable code existed in the editor.
- In a fresh session after a clean query execution, the same button enabled and worked normally.

## Browser-Eval Fallback Clues

- The page exposes AMD modules through `require(...)`.
- Confirmed accessible modules:
  - `live-sql/components/run-button-slider/RunButtonSlider`
  - `live-sql/utils/enums`
- Confirmed exports on `RunButtonSlider`:
  - `generateRunInLiveSQLLink`
  - `RunButtonSlider`

Use these module names only as a fallback for browser evaluation when the UI is inconsistent. Prefer normal UI interactions first.
