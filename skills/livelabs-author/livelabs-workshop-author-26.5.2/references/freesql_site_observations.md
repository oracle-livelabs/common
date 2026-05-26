# FreeSQL Site Observations

Observed live on 2026-03-20 while validating the FreeSQL workflow.

## Entry Points

- `https://freesql.com/landing/` is the landing page and routes into the modern worksheet.
- `https://freesql.com/` is the working application.
- The main top-level areas are `Worksheet` and `Library`.

## Editor And Execution

- The worksheet exposes an editor textbox labeled `Editor content;Press Alt+F1 for Accessibility Options.`
- `Ctrl+Enter` or `Cmd+Enter` runs the current statement.
- `F5` runs the script.
- Query results appear under `Query result`.
- Script output and DBMS output use their own tabs.

Validated example on 2026-03-20:

- `select * from hr.employees fetch first 5 rows only;`
- returned 5 rows in the `Query result` grid.

## Blockers

- Cookie consent is rendered by TrustArc and can block clicks from a shadow-root host attached to the page.
- The in-product tour uses Hopscotch and can block toolbar clicks until closed.

## Share Drawer

- FreeSQL exposes a share drawer titled `Share Code`.
- The drawer modes are:
  - `Share Link`
  - `Run in FreeSQL Button`
  - `Embedded Editor`
- Embedded mode generates an `/embedded/` URL with parameters including:
  - `layout=vertical`
  - `compressed_code=...`
  - `code_language=...`
  - `code_format=...`
- The iframe template defaults include:
  - `height="460px"`
  - `width="100%"`
  - `scrolling="no"`
  - `frameborder="0"`
  - `allowfullscreen="true"`
  - `name="FreeSQL Embedded Playground"`
  - `title="FreeSQL"`

## Limits And Caveats

- The share drawer reports `Your code block exceeds the 4000-character limit.` when the payload is too large.
- The language selector includes `PL/SQL` and `QuickSQL` by default.
- `JavaScript` is also supported in the 23ai context.
- In anonymous scratch mode, the visible share button host may be `#code-editor-generate-run-btn`.
- In some sessions the share button can appear disabled until blockers are cleared or a fresh worksheet is used.

## Fallback Guidance

- Prefer normal UI interactions first.
- If the share control stays disabled after blockers are cleared, retry in a fresh worksheet or tutorial context before concluding that sharing is unavailable.
