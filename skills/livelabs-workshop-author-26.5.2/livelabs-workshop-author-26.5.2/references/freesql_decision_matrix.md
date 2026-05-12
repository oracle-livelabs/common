# FreeSQL Decision Matrix

Use this file to choose the right FreeSQL format for a lab.

## Choose the Simplest Format That Works

### Plain SQL or PL/SQL code block

Use when:
- the learner mainly needs to read or copy the code,
- the renderer should stay simple,
- you do not need a runnable call-to-action.

### Share link

Use when:
- the learner should open runnable SQL in FreeSQL,
- markdown output should stay clean,
- raw HTML is blocked or explicitly unwanted.

### Run in FreeSQL button

Use when:
- the renderer allows raw HTML,
- a strong call-to-action helps,
- the user explicitly wants a launch control,
- the workshop benefits from a visible launch affordance.

### Embedded editor

Use when:
- raw HTML is allowed,
- the user asks for FreeSQL and does not ask for a different display mode,
- inline execution materially improves the lab,
- extra complexity is justified.

## Decision Rules

- For standard LiveLabs markdown, prefer an embedded editor unless raw HTML is blocked or the user explicitly wants a link or button.
- For authoring demos and polished how-to guides, a button can help if rendering supports it.
- Use a share link when the renderer blocks raw HTML or when the user explicitly asks for a plain launch link.
- Use a button only when the user explicitly asks for a visible launch control.
- Use an embed by default when the workshop environment supports raw HTML.
- Treat these phrases as a direct embed request: `embedded`, `in the workshop`, `inline`, `in-frame`, `inside the lab`, `do not make me leave the page`.
- If the user asks for an embed, do not return a launch link, launch button, or separate FreeSQL step as the primary answer.
- For LiveLabs markdown, a button request should render as `<freesql-button src="...">`, not a generic HTML anchor wrapper.
- For LiveLabs markdown, an embed request should render as the canonical `iframe.freesql-embed` block with `data-freesql-src`.
- If the user tries to use FreeSQL for vector embedding generation, do not use FreeSQL as the runnable target. State that FreeSQL does not support vector embedding generation and move that step elsewhere.

## Evidence Rule

If the lab uses FreeSQL and you claim the example works:

- run it when feasible,
- capture the result,
- keep that screenshot as supporting evidence.
