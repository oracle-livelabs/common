---
name: task-planner
description: "Planning-only skill for turning rough goals, vague requests, implementation work, troubleshooting, documentation tasks, research needs, cleanup work, or complex multi-step requests into a practical Codex execution plan. Use when the user asks for a plan, durable planning output, QA planning, or when the correct response is planning-only: clarify scope, define completion evidence, identify what to inspect, choose an approach, order the work, define validation, propose appropriate tests, and call out risks and stop points. Can optionally create a plan output folder with PLAN.md, PLAN_QA.md, and resources when requested. Do not execute the target task, create planner/executor handoff artifacts, or depend on a task-executor skill."
---

# Task Planner

Use this skill to produce a Codex-facing plan that helps Codex achieve the user's task better. The output is the plan itself, either inline or in a lightweight planning artifact folder. It is not a package for a separate executor.

## Operating Boundary

Stay in planning mode when this skill is the requested response.

Do:

- define the real objective and what "done" means
- classify the work so the plan fits the task type
- inspect local context only when needed for a reliable plan
- separate confirmed facts from assumptions
- choose the simplest practical route
- order discovery, implementation, validation, and cleanup steps
- include concrete verification checks
- add a QA step that tests the plan and expected outputs
- propose tests Codex or the user can run after implementation
- identify risks, blockers, and user-confirmation points
- make the next Codex action obvious

Allowed planning artifacts:

- create a planning output folder only when the user asks for persistent output, files, a folder, reviewable artifacts, or a larger plan that should be saved
- write `PLAN.md`, `PLAN_QA.md`, and optional generated planning resources
- do not edit target project files while planning

Do not:

- implement the target task while planning
- edit production files as part of planning
- create production deliverables
- create planner/executor task-flow folders
- emit formal handoff blocks or machine contracts
- route work to a separate executor skill
- add process ceremony that does not help Codex act

## Planning Depth

Pick the lightest planning depth that can handle the task.

- `Quick Plan`: use for small, low-risk tasks. Return objective, 3-5 steps, validation, and a short QA/test proposal.
- `Standard Plan`: default for ordinary code, docs, skill, cleanup, and workflow tasks.
- `Deep Plan`: use when the task is risky, ambiguous, cross-module, destructive, security-sensitive, or likely to need staged validation.
- `Recovery Plan`: use when the task starts from an error, failed build, broken workflow, regression, or unclear current state.
- `Review Plan`: use when the user asks for audit/review/assessment before changes.

## Output Mode

Default to inline output unless the user asks for saved artifacts or the plan is large enough to benefit from reviewable files.

Use `Inline Mode` when:

- the task is small or exploratory
- the user asked only for advice or a quick plan
- no durable planning artifact is needed

Use `Artifact Mode` when:

- the user asks for a folder, file, saved plan, output, resources, report, or reviewable planning artifact
- the plan needs separate QA/test proposals
- the task is large enough that Codex should preserve the plan for later continuation

Artifact root:

```text
<current-working-directory>\Tasks\plans\<YYYYMMDD-HHMMSS>-<task-slug>\
```

Set `CODEX_TASK_PLANS_DIR` or pass `--root` when the plan output must live outside the current workspace.

Artifact files:

- `PLAN.md`: objective, understanding, approach, execution plan, validation, risks, stop points, and immediate next action
- `PLAN_QA.md`: plan self-test, expected output checks, testing technique decider, and post-implementation test proposals
- `resources\`: optional generated planning resources such as source request notes, command matrices, checklists, acceptance criteria, test data notes, or small reference extracts

When creating an artifact folder, use the helper script:

```powershell
python "<task-planner-skill-root>\scripts\create_plan_output.py" --title "<task title>" --plan-mode "<Planning Mode>" --with-resources
```

Useful helper options:

- `--root "<path>"`: keep task outputs outside the skill folder, for example in a sibling QA or review directory.
- `--prompt-file "<path>"`: copy the source prompt into `resources\REQUEST.md` for traceable QA and review.
- `--notes "<text>"`: add short source-context notes to `resources\REQUEST.md`.
- `--dry-run`: preview the output paths without creating files.
- `--timestamp "<YYYYMMDD-HHMMSS>"`: use only for deterministic tests; omit during normal planning.

After creating the folder, fill the generated Markdown files with the final plan and report the paths. If the helper script is unavailable, create the same structure manually.

## Planning Workflow

1. Restate the task as a concrete outcome.
2. Define success evidence: files changed, behavior observed, tests passed, report produced, or decision made.
3. Classify the task type and select the planning depth.
4. Select `Inline Mode` or `Artifact Mode`.
5. Identify the minimum context Codex should inspect before acting.
6. Record confirmed facts and assumptions separately.
7. Choose the practical approach that fits the existing project and constraints.
8. Put blocking discovery before edits or irreversible actions.
9. Break the work into ordered steps small enough for Codex to execute.
10. Define validation checks, including commands when they are discoverable.
11. Add QA checks that test the plan itself and the expected outputs.
12. Choose appropriate testing techniques using the decider below.
13. Add rollback, cleanup, or recovery steps only when they reduce real risk.
14. Mark stop points where Codex should ask the user before continuing.
15. End with the immediate next action Codex should take.

## Context Inspection Rules

Inspect only what changes the plan.

Prefer:

- workspace instructions such as `AGENTS.md`
- existing project structure and scripts
- relevant configuration, tests, docs, or logs
- current installed/source paths when planning skill work
- recent local memory only when prior decisions affect the plan

Avoid:

- broad repository scans before defining what is needed
- reading large generated outputs unless the task depends on them
- asking the user questions that local files can answer
- assuming a framework, command, or install path without checking when it matters

## Testing Technique Decider

Use this decider to propose tests that fit the task. Include only techniques that apply.

- `Bug fix`: reproduce the bug first, add regression test, run targeted tests, then run broader affected-suite checks.
- `CLI or script`: argument parsing tests, temp-directory integration tests, dry-run/no-write checks, exit-code checks, stderr/stdout assertions.
- `API or backend`: unit tests, contract tests, integration tests, auth/permission checks, negative tests, idempotency checks, migration checks.
- `UI or frontend`: component tests, interaction tests, accessibility checks, responsive checks, visual/screenshot checks, end-to-end smoke tests.
- `Data or reporting`: schema checks, fixture/golden-file tests, boundary data tests, aggregation accuracy checks, export/render checks.
- `Refactor`: typecheck/static analysis, existing regression suite, golden/snapshot checks, behavior parity checks.
- `Documentation or content`: markdown/storage-format validation, link/reference checks, render checks, screenshot or preview review, terminology checks.
- `Skill or workflow`: `quick_validate.py`, reference resolution checks, dry-run command checks, source/installed hash comparison, smoke prompt test.
- `Performance-sensitive change`: baseline measurement, focused performance test, size/runtime comparison, memory or query-plan check.
- `Security or destructive operation`: permission tests, deny-path tests, dry-run checks, audit/log checks, rollback verification.

Common techniques list:

- static analysis and typecheck
- unit tests
- integration tests
- end-to-end or smoke tests
- regression tests
- boundary and edge-case tests
- negative/error-path tests
- contract/API tests
- accessibility tests
- visual/screenshot tests
- performance tests
- security/permission tests
- migration/rollback tests
- documentation render/link checks
- manual exploratory checklist

## QA Step

Always include a final QA section. It should test three things:

- `Plan QA`: whether the plan has a clear objective, correct scope, ordered steps, explicit assumptions, validation, risks, stop points, and an immediate next action
- `Output QA`: what files, resources, behavior, reports, or user-visible outputs should exist after implementation, and how Codex should inspect them
- `Post-Implementation Tests`: the specific tests or commands Codex should run after the user or Codex completes the implementation

For Artifact Mode, write this QA content to `PLAN_QA.md` and summarize it in the final response.

## Missing Information

Make safe assumptions when the uncertainty does not change the objective or risk profile. Ask the user only when missing information affects:

- destructive changes
- credentials, secrets, billing, publishing, or external systems
- irreversible actions
- product or content direction
- which project/path is authoritative
- whether to create persistent planning artifacts
- whether to stop at a plan or proceed later with implementation

When planning around uncertainty, include:

- `Assumption`: what Codex should assume for now
- `Risk`: what could be wrong
- `Stop Point`: exactly when Codex should pause

## Plan Quality Rules

- Keep the plan specific to the user's task and workspace.
- Fit the output length to the task size.
- Prefer existing project conventions over new workflow.
- Put the riskiest or most blocking discovery first.
- Make each step actionable, not aspirational.
- Include validation that proves the task was handled.
- Include test proposals that match the task type and risk.
- Include file paths only when known or intentionally proposed.
- Avoid broad roadmaps, generic advice, and speculative extras.
- Preserve user constraints verbatim when they are important.
- Do not leave Codex needing to re-plan before it can start.

## Output Format

Use this structure unless the user requests a different format.

```markdown
**Objective**
<one-sentence outcome>

**Planning Mode**
<Quick Plan | Standard Plan | Deep Plan | Recovery Plan | Review Plan>

**Output Mode**
<Inline Mode | Artifact Mode, with folder path if created>

**Current Understanding**
- <confirmed fact>
- Assumption: <only if needed>

**Recommended Approach**
<short explanation of the chosen route>

**Execution Plan**
1. <first concrete step>
2. <next concrete step>
3. <continue in order>

**Validation**
- <command, inspection, test, report, or review that proves implementation success>
- <additional check if needed>

**Plan QA And Test Proposals**
- Plan QA: <how to inspect the plan for completeness and sequencing>
- Output QA: <how to verify expected files/resources/behavior after implementation>
- Testing Decider: <which testing techniques apply and why>
- Post-Implementation Tests: <specific tests or commands Codex should run after implementation>

**Risks And Stop Points**
- Risk: <specific risk, if any>
- Stop Point: <when Codex should ask before continuing>

**Immediate Next Action**
<the first action Codex should take after this plan>
```

## Optional Sections

Add these only when they help the task:

- `Files To Inspect First`
- `Files Likely To Change`
- `Inputs Needed`
- `Rollback Plan`
- `Acceptance Criteria`
- `Parallelizable Work`
- `Open Questions`
- `Follow-Up Improvements`

## Final Self-Check

Before returning the plan, verify:

- the plan answers the user's actual request
- the output is planning-only except for optional planning artifacts
- no target implementation was performed
- no downstream executor dependency remains
- assumptions and stop points are explicit
- validation is concrete
- test proposals match the task type and risk
- Artifact Mode, when used, created only planning files and resources
- artifact QA, when run, kept task output folders separate from the skill package
- the immediate next action is obvious
