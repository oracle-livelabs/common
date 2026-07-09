# LiveLabs Markdown Rules (Validator-Aligned)

Use these checks on every workshop markdown file. This reference combines the authoring checklist with the validator-facing rules so one file can drive both drafting and repair.

## Required Sections and Headers

1. First non-empty line must be an H1: `# Title`.
2. Allow only one H1 per file, excluding fenced code blocks.
3. Every markdown file must include `## Acknowledgements`.
4. Labs with tasks must include `## Introduction`.
5. Use `### Objectives` or `## Objectives`.
6. Time labels:
   - `introduction.md` must include `Estimated Workshop Time:`
   - other lab files must include `Estimated Time:` or another `Estimated ... Time:` label

## Task and Step Format

1. Format task headings as `## Task N: Description`.
2. Keep task numbers in numeric sequence.
3. Numbered list items must use exactly one space after the period:
   - valid: `1. Step`
   - invalid: `1.\tStep`
   - invalid: `1.  Step`
4. Task sections should guide the learner through concrete actions, not high-level commentary only.

## Ordered-List Indentation Rules

Inside numbered steps, indent nested content by at least four spaces so it stays inside the list item:

- paragraphs
- images
- sub-lists
- fenced code blocks

Validator edge cases:

- raw HTML element lines may remain unindented
- a trailing unindented transition line is allowed only when no later numbered step exists
- top-level headings terminate ordered-list indentation scope

## Images and Links

1. Every image reference needs alt text:
   - valid: `![Alt text](images/example.png)`
   - invalid: `![](images/example.png)`
2. Image paths under `images/` should use lowercase filenames and dashes.
3. Replace HTML anchors with Markdown links:
   - invalid: `<a href="...">`
   - valid: `[Link text](https://...)`

## Embedded Media and Custom Tags

1. YouTube embeds must use `[](youtube:VIDEO_ID)` or `[](youtube:VIDEO_ID:size)`.
2. Do not place linked text before the YouTube target.
3. Keep `<copy>` and `</copy>` tags balanced within the same file.

## Optional but Recommended

- Add `## Learn More` when source material or product docs would help the learner continue.
- Record violations with file paths and line numbers during review so fixes are fast to apply.
