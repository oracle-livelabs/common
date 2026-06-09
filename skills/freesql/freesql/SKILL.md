---
name: freesql
description: "Use when working with `freesql.com` / Oracle FreeSQL in a real browser: writing or running SQL, PL/SQL, Quick SQL, or JavaScript; exploring schemas and tutorials; capturing result screenshots; generating share links, 'Run in FreeSQL' buttons, or embedded editor iframe code; or troubleshooting FreeSQL UI behavior."
---

# FreeSQL

## Overview

Use FreeSQL through a real browser, not raw HTTP requests. Prefer Chrome DevTools browser controls when they are available in the session; otherwise fall back to `$playwright` and drive the site from the terminal.

Always take a screenshot immediately after every successful SQL or PL/SQL execution before navigating away, clearing the editor, or opening share dialogs.

## Browser Strategy

Prefer this order:

1. Chrome DevTools browser tools (`new_page`, `navigate_page`, `take_snapshot`, `click`, `fill`, `take_screenshot`, `evaluate_script`)
2. `$playwright` if an installed Playwright skill is available in the current Codex environment

Use browser automation, not `curl`, because the site is a dynamic application and blockers such as cookie consent and tours can intercept clicks.

## Session Start

1. Open `https://freesql.com/landing/` and use `Start Coding`, or open a known worksheet/tutorial URL directly.
2. Clear blockers before touching the editor:
   - Accept the cookie prompt if it intercepts clicks.
   - Close the guided tour if it appears.
3. Re-snapshot after any navigation, modal, slider, or significant layout change.

Read `references/site-observations.md` when you need the exact blocker selectors, share modes, or embed details.

## Core Worksheet Loop

1. Find the worksheet editor and place the caret in the code area.
2. Enter SQL or PL/SQL.
3. Execute code:
   - Use `Run Statement` or `Ctrl+Enter` / `Cmd+Enter` for a single statement.
   - Use `Run Script` or `F5` for multi-statement scripts.
4. Wait for output in `Query result`, `Script output`, or `DBMS output`.
5. Take a screenshot immediately.
6. Only after the screenshot, inspect results, download output, or continue editing.

If execution fails, capture the visible error state as a screenshot too.

## Screenshot Rule

Treat screenshots as mandatory evidence, not optional decoration.

- Take one screenshot after every successful execution.
- Take another screenshot if you materially change the visible result state.
- Save browser artifacts under `output/playwright/` when using `$playwright`.
- Do not clear the worksheet before capturing proof of the run.

## Sharing And Embedding

Use the toolbar control labeled `Generate "Run in FreeSQL" Button` after code is present. The resulting drawer is titled `Share Code`.

The share drawer supports these display modes:

- `Share Link`
- `Run in FreeSQL Button`
- `Embedded Editor`

Use them this way:

- `Share Link`: best for plain links in docs, chat, or markdown.
- `Run in FreeSQL Button`: best when the user wants a styled HTML call-to-action.
- `Embedded Editor`: best when the user wants iframe-based embedding on a website or markdown renderer that allows raw HTML.

When the user asks for markdown, prefer the share link unless they explicitly want embeddable HTML. Use the iframe snippet only where raw HTML is allowed.

## Known UI Quirks

- The cookie dialog can live inside a shadow-root host and block all clicks until accepted.
- The guided tour overlay can block toolbar actions until closed.
- The anonymous scratch worksheet can intermittently leave the share button disabled even when code exists. Do not conclude that sharing is unavailable until you have ruled out blockers and retried in a fresh worksheet or tutorial context.

If the share button still appears disabled after blockers are cleared, inspect the page module noted in `references/site-observations.md` before giving up.

## Validation

When using this skill for real work:

1. Confirm the executed code is visible in the editor or output area.
2. Confirm the result pane changed or produced an error message.
3. Capture the screenshot.
4. If share/embed code is requested, confirm the generated link, HTML button code, or iframe snippet before reporting success.
