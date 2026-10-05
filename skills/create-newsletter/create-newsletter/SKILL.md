---
name: create-newsletter
description: Draft, revise, and render email newsletters in Markdown using emailmd. Use when a user asks to create a newsletter, email campaign, announcement email, internal update email, product/news roundup, or any reusable HTML email where the final deliverables should include both the Markdown source and the rendered HTML. Before rendering, verify the `emailmd` package is available; if not, install it with `npm install emailmd`.
---

# Create Newsletter

Create polished newsletter emails as `emailmd` Markdown, then render them to HTML and plain text.

## Workflow

1. Confirm the audience, tone, and goal from the user request or surrounding context.
2. Draft the newsletter as Markdown with YAML frontmatter for metadata such as `subject`, `preheader`, theme colors, and other `snake_case` theme keys.
3. Prefer `emailmd` features that improve email usability:
   - CTA buttons with `{button}`, `{button.secondary}`, semantic variants, and `fallback`
   - frontmatter theme customization
   - clear section hierarchy with short paragraphs and scannable lists
4. Save the source as a Markdown file. Use `newsletter.md` by default unless the user wants another name.
5. Render the Markdown to HTML and plain text. Use `scripts/render_newsletter.mjs`.
6. Final output must include both:
   - the Markdown source file
   - the rendered HTML file

## Package Check

Before rendering, ensure `emailmd` is available in the working directory.

- Use the bundled render script, which checks for `emailmd` and runs `npm install emailmd` automatically if needed.
- If you are diagnosing render issues or working manually, read `references/emailmd-llms-full.txt`.

## Newsletter Structure

Use this structure unless the user asks for something else:

- frontmatter with `subject` and `preheader`
- strong opening headline
- short intro paragraph
- 2 to 5 content sections with clear subheads
- one or more CTA buttons
- concise footer

Prefer content that reads well in email clients:

- short paragraphs
- short bullets
- one primary CTA per major message
- links with clear labels

## Rendering

Run:

```powershell
node ~/.codex/skills/create-newsletter/scripts/render_newsletter.mjs newsletter.md
```

This writes:

- `newsletter.html`
- `newsletter.txt`

If you need explicit output paths:

```powershell
node ~/.codex/skills/create-newsletter/scripts/render_newsletter.mjs newsletter.md --html out/newsletter.html --text out/newsletter.txt
```

## Deliverables

In the final response:

- point to the Markdown source path
- point to the rendered HTML path
- mention the plain-text fallback path when created

## Reference

For supported syntax and theme options, read:

- `references/emailmd-llms-full.txt`
