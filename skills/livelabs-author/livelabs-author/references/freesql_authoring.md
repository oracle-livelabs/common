# FreeSQL Authoring For LiveLabs

Use this reference when a workshop should include runnable SQL, PL/SQL, Quick SQL, or JavaScript examples through FreeSQL.

## When To Use FreeSQL

Use FreeSQL when learners benefit from executing code rather than only reading it. Typical cases:

- SQL query walkthroughs
- PL/SQL exercises
- Quick SQL generation examples
- JavaScript database examples in supported contexts

Do not force FreeSQL into every lab. Plain code blocks are often enough when the learner does not need a runnable environment.

If the user tries to use FreeSQL for vector embedding generation, warn that FreeSQL does not support it and move that step to another environment or keep it non-runnable.

## Default Output Choice

Choose the simplest option that fits the lab:

1. Plain code block: best when the lab only needs readable code.
2. Embedded editor: best default when raw HTML is allowed and the workshop is meant to keep the learner in-page.
3. Share link: use when raw HTML is blocked or the user explicitly wants a launch link.
4. `Run in FreeSQL` button: use only when HTML is allowed and the user explicitly wants a visible launch control.

When the user asks for FreeSQL in a LiveLabs workshop, assume they want the embedded editor unless they explicitly ask for a link, button, or external launch flow.
When the renderer strips or blocks raw HTML, fall back to a share link and state why the embed was not used.

## Authoring Workflow

1. Open FreeSQL in a real browser.
2. Clear blockers such as cookie consent and tours before interacting with the editor.
3. Enter the SQL or PL/SQL code.
4. Execute the statement or script.
5. Confirm the result pane changed or an error is visible.
6. Generate the required share artifact only after the code is confirmed.

If execution fails, keep the lab honest about the gap instead of implying the run succeeded.

## Sharing Modes

FreeSQL supports:

- `Share Link`
- `Run in FreeSQL Button`
- `Embedded Editor`

Use them this way:

- `Embedded Editor`: best default for LiveLabs when the target renderer supports raw HTML and the lab benefits from keeping the learner on the page.
- `Share Link`: best when markdown must stay HTML-free or the renderer blocks embeds.
- `Run in FreeSQL Button`: best when the target renderer supports HTML and the user explicitly wants a stronger visual call-to-action.

For LiveLabs, the canonical embedded form is:

```html
<iframe
            class="freesql-embed"
            data-freesql-src="<embedded FreeSQL URL>"
            height="460px"
            width="100%"
            scrolling="no"
            frameborder="0"
            allowfullscreen="true"
            name="FreeSQL Embedded Playground"
            title="FreeSQL"
            style="width: 100%; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;"
        >FreeSQL Embedded Playground</iframe>
```

## LiveLabs Guidance

- Prefer the canonical embedded editor in LiveLabs when raw HTML is allowed.
- Do not assume every LiveLabs rendering path will allow iframe embeds.
- Keep code examples aligned with the task sequence in the lab.
- If a FreeSQL artifact is too large or the share payload fails, fall back to a code block plus learner instructions.
- If the user asks for FreeSQL but does not specify the display mode, use an embed first and downgrade only when the renderer blocks raw HTML.
- If the user explicitly asks for an embed, do not silently downgrade to a link or button. Either provide the embed or state why it is blocked.
- Prefer the native `<freesql-button src="...">` form over arbitrary HTML button wrappers when a button is requested.

## Validation Checks

- The executed code is visible in the editor or output area.
- The result pane changed or showed a meaningful error.
- The generated share link, button code, or iframe snippet matches the requested output type.

Use `freesql_site_observations.md` for current entry points, known UI blockers, and share behavior.
