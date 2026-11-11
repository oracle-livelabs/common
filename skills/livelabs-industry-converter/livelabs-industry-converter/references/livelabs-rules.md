# LiveLabs Rules

Apply these rules to every conversion before delivery.

## File Structure
- Treat the source workshop layout as canonical unless the source is already broken.
- Preserve lab order, manifest flow, and shared asset structure.
- Keep existing folder relationships unless the conversion requires equivalent renamed targets.
- Ensure every manifest target resolves to a real file or an approved URL.
- Preserve source image folders and asset coverage. If the source lab has screenshots or images, the converted lab should retain corresponding image coverage.

## Markdown Rules
- The first non-empty line in each markdown file is a single H1.
- Only one H1 appears per markdown file.
- Every markdown file includes `## Acknowledgements`.
- `introduction.md` includes `Estimated Workshop Time:`.
- Other instructional labs include `Estimated Time:`.
- Labs with tasks include `## Introduction`.
- Labs with tasks include `### Objectives` or `## Objectives`.
- Keep one canonical intro metadata block. Do not duplicate time lines or objective sections.
- Validator-required repairs must be merged into existing sections, not appended as extra sections.
- Task headers use `## Task N: Description`.
- Each task contains numbered steps.
- Content inside numbered steps, including code blocks, images, tables, and notes, is indented correctly.
- Image references include alt text.
- Image filenames are lowercase.
- HTML anchors are absent unless the source workshop already depends on them for a validated reason.
- YouTube embeds use approved LiveLabs syntax.
- `<copy>` tags are balanced and correctly nested.

## Conversion Rules
- Rewrite all source-domain labels that appear in titles, headings, filenames, paths, IDs, statuses, code samples, JSON payloads, dashboards, reports, and screenshots references.
- Preserve instructional intent. Each rewritten lab must still teach the same concept as the source lab.
- Preserve artifact type. If the source outputs a dashboard, report, notebook, email, or PDF, keep the same artifact category in the target domain unless the source clearly supports an equivalent rename.
- Preserve technical progression. Do not flatten a multi-step build into a summary.
- Preserve source section order, task order, and step order unless the source is broken.
- Preserve source screenshots, image positions, and visual walkthroughs unless they are invalid or technically inconsistent with the converted content.
- Preserve generic product or tooling wording with minimal edits. Do not paraphrase for style alone.
- When adding validator-required intro headings, merge them into the existing intro instead of appending a second intro fragment.
- After any validator-driven edit, rerun the source comparison for the touched file before declaring it done.

## Completion Rule
The workshop is not done until:
- file structure is valid,
- markdown formatting is valid,
- manifest targets resolve,
- launch files are coherent,
- source-fidelity checks pass,
- duplicate-content checks pass,
- prose passes the prose gate,
- obvious source-domain residue is removed.
