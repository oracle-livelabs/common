# LiveLabs Markdown Validation Rules

Use these checks on every workshop markdown file. Mirror the official LiveLabs markdown validator behavior so the skill does not rely on external scripts.

1. **Single H1** - First non-empty line must be an H1 (`# Title`). Only one H1 per file (ignore fenced code blocks).
2. **Acknowledgements** - Each file ends with a `## Acknowledgements` section.
3. **Alt Text** - Image syntax must include alt text (`![alt](images/foo.png)`). Empty brackets are invalid except for `[](youtube:VIDEO_ID)` embeds.
4. **No HTML Anchors** - Replace `<a href=...>` with Markdown links.
5. **YouTube Syntax** - Embed videos with `[](youtube:VIDEO_ID)`; linked text before the parentheses is not allowed.
6. **Task Headers** - Format as `## Task N: Description` with numeric sequence.
7. **Copy Tags** - `<copy>` tags must have closing partners within the same file.
8. **Lab Anatomy** - Labs containing tasks must include `## Introduction`, `### Objectives` (or `## Objectives`), and an `Estimated Time:` line (use `Estimated Workshop Time` in `introduction.md`).
9. **Image Filenames** - Paths under `images/` use lowercase characters and dashes.
10. **Task Body Rules** - Task sections need numbered steps and any embedded code blocks or images indented at least four spaces to remain inside the numbered list item.
11. **Estimated Time Everywhere Else** - Non-introduction files still need an `Estimated Time:` string (case-insensitive).
12. **Optional Learn More** - Mention when the `## Learn More` section appears, but do not fail if absent.

Document every violation with the file path and line numbers so the final report can quote exact fixes.
