# Iteration Workspace Workflow

Use this reference when the user wants a Confluence page generated, refined, versioned, or worked through multiple review rounds.

## Workspace Rule

For page-generation work, create a desktop workspace unless the user asks for chat-only output or gives another directory.

Default root:

```text
%USERPROFILE%\Desktop\Confluence Page Builder Projects\<project-slug>
```

Create:

```text
<project-root>/
  USER_GUIDE.md
  PROJECT_PROMPT.md
  versions/
    v1/
      <slug>_v1_storage.txt
      TASK_REPORT.md
      VALIDATION_REPORT.md
  logs/
  lessons-learned/
    LESSONS.md
  reports/
  resources/
```

Use `scripts/start_confluence_page_project.py` to create this structure and root usage guide.

## Version Loop

For each page version:

1. Create or update `versions/vN/`.
2. Write the storage-format page code.
3. Run `scripts/confluence_storage_audit.py` on the storage file.
4. Run `scripts/confluence_outline_extract.py` on the storage file.
5. Run `scripts/confluence_page_qa_gate.py` on the storage file.
6. Fix any `FAIL` result before delivery.
7. Write `VALIDATION_REPORT.md` with macro/body balance, outline, tabs, expands, QA-gate result, and any content risks.
8. Write `TASK_REPORT.md` with what changed, decisions made, output path, validation status, proposed next improvements, and questions for the user.
9. Append any reusable lessons to `lessons-learned/LESSONS.md`.
10. Report the current version path to the user and ask whether to accept, iterate, or stop.

## Review Questions

Ask direct questions tied to the current version. Prefer 3 to 5 questions.

- Should this page optimize for executives, operators, engineers, or mixed readers?
- Is the current section order right for how the reader will use the page?
- What should stay visible by default?
- What should move into tabs or expandable sections?
- Which table is the source of truth?
- Which facts are missing or not reliable enough?
- Did the QA gate catch any duplicate headings, repeated labels, or redundant FAQ wording?

## PM And Agent Mode

Assess complexity before starting.

Use a simple solo workflow when:

- the page has one audience
- source material is short
- the page has few decisions or status tables
- the request is mainly formatting or cleanup

Use PM mode when the user explicitly asks for agents, delegation, or parallel review and the environment supports it. Possible roles:

- UI/UX Designer: page structure, hierarchy, tabs, expands, scannability
- Content Writer: concise headings, reader flow, plain-language summaries
- Quality Analyst: storage validation, link/table checks, consistency
- Devil's Advocate: duplication, overbuilding, weak assumptions, missing reader actions

If agents are not available or not explicitly authorized, do the same role-based review locally and state that no subagents were spawned.

## Stop Rule

After every version, wait for user direction when the user is expected to review. Continue only when the user accepts the proposal, provides feedback, or asks for the next version.
