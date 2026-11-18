# QA Hub redesign prototype v1

Review date: 4 November 2026.

Local review: http://127.0.0.1:4192/prototype.html

## Purpose and scope

Create a working first design for review using the five supplied visual references. The references inform layout and interaction, not source facts or instructions. Preserve the current QA Hub's areas and read-only data readers. The separate planning prototype uses 16 explicit synthetic tasks; task names reflect the existing requirements, while dates, assignments, and completion states are examples.

The deliverable is a local, reviewable UI with Board, List, Roadmap, and Overview views. Production integration, shared task persistence, authentication, external writes, deployment, and publication are outside this iteration.

## Research and design decisions

Primary sources consulted:

- [Asana project views](https://asana.com/features/project-management/project-views): shared tasks presented as cards, lists, and schedules; visible assignees, due dates, and subtasks; drag-and-drop work stages.
- [Asana custom fields, filtering, and sorting](https://help.asana.com/s/article/filtering-and-sorting-custom-fields?language=en_US): view-specific displayed fields, filtering, and sorting.
- Local `README.md`, `docs/requirements.md`, and `app/public/state.mjs`: current QA areas, source boundaries, and navigation. The prototype does not revive retired TMS, Knowledge Base, or QA Operations sections.

Applied patterns:

| Reference | Prototype decision |
| --- | --- |
| Warm monthly planning board | Neutral canvas, white task cards, restrained category colors, month columns in Roadmap |
| Asana board and project header | Persistent workspace shell, local search, view tabs, action toolbar, compact status columns |
| Asana list | Task table grouped by status or QA area, sharing the board's data |
| Asana task details | Side panel with owner, due date, area, status, priority, description, subtasks, and local notes |
| Redwood resources | Packaged Oracle Sans fonts, Oracle Bark, neutral surfaces, documented accent colors |

This follows the user's Asana direction. It is a plain HTML/CSS/JavaScript prototype in the existing stack, not an Oracle JET component implementation or a claim of full JET compliance. No new runtime dependencies, generated illustrations, or third-party UI framework were needed.

## Implemented behavior

- Board groups by status or QA area. Dragging changes the corresponding field.
- Roadmap groups by due month. Moving a task preserves its day where possible and clamps it to the destination month's final day.
- Search, owner/status/priority/month filters, due-date/priority/title sort, and empty states.
- Detail panel edits task title, description, owner, due date, status, priority, and blocker flag. Status fields offer a keyboard and touch alternative to dragging.
- Task creation, completion/reopening, subtask creation/checking, and local notes.
- Browser-local task persistence in `livelabs-qa-design-prototype-v1`, isolated from existing Hub data. Failed storage writes show an in-memory-only message.
- View-specific display preferences and compact cards.
- JSON export of the current filtered view; explicit reset of prototype data only.
- Keyboard opening, Escape dismissal, focus return, search shortcut, and native dialog focus containment.
- Mobile navigation, full-width task details, and board scrolling contained within the workspace.

## Validation

Scope and plan review: use existing server and fonts, add a separate entry point, validate stateful interactions and responsive rendering, leave the local review server running. No permission-dependent production action is part of this prototype.

Checks completed:

- JavaScript syntax checks for both new modules.
- 33 browser interaction and layout checks in `app/scripts/prototype-review.mjs`.
- No browser console/runtime or asset errors during those checks.
- Existing unit suite: 34 tests passed.
- Static build and existing project validator passed.
- Desktop visual review at 1440 × 1000; mobile at 390 × 844. Seven screenshots cover Board, List, Roadmap, Overview, and task details.
- HTTP 200 from the local prototype.

Evidence: `output/screenshots/asana-redesign-v1/manifest.md` and `results.json`. The test browser uses a fresh isolated context. Screenshots after interaction checks may show edited sample values. These checks establish local behavior only; they do not validate production integration or a full accessibility audit.

## Suggested review path

1. Review the Board's spacing, typography, and QA-area navigation.
2. Open a task and try status, priority, subtasks, and a local note.
3. Switch to List and Roadmap without losing the task changes.
4. Decide whether status or month should be the default planning view, and whether this planning layer should become the main Hub entry point.

The existing Hub remains available through **Open current Hub** for comparison.

## Objectives

Describe the QA Hub redesign prototype, implemented interactions, and suggested review path.

## Estimated Time

Estimated Time: About 10 minutes to review the prototype report.

## Acknowledgements

The prototype uses synthetic sample data in an isolated browser context; the current Hub remains available for comparison.
