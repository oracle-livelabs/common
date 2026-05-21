---
name: task-planner
description: "Create and manage durable Codex task plans, PlanOps project folders, plan iterations, execution briefs, validation matrices, QA plans, status/resume files, decision logs, and targeted review questions for complex implementation, architecture, troubleshooting, documentation, cleanup, and research work."
---

# Task Planner

Use this skill to produce Codex-facing planning and execution-readiness artifacts that help Codex handle the user's task better. The output can be inline, a lightweight artifact folder, or a durable PlanOps project folder.

Codex's built-in plan feature is for in-turn progress tracking. This skill goes beyond that when the task needs durable files, review cycles, resume state, execution briefing, validation evidence, or follow-up questions across versions.

## Operating Boundary

Default to plan artifacts first. Move from planning into execution only when the user explicitly asks to proceed, or when the request clearly asks Codex to create/update the planning artifacts themselves.

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
- create PlanOps project folders with status, versioned plan files, validation matrix, execution brief, questions, decisions, resources, and progress logs when the task needs durable planning
- avoid editing target project files while the user is reviewing or approving the plan

Keep Clear Boundaries:

- Treat `EXECUTION_BRIEF.md` as restart guidance, not automatic approval.
- Require explicit user direction before changing production files, creating cloud resources, publishing artifacts, or handling credentials.
- Keep execution coordination inside this PlanOps workflow unless the user asks for a separate executor skill.
- Keep process lightweight and tied to real execution risk, validation, or review value.

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

Use `PlanOps Mode` when:

- the task will likely need more than one review round
- the user wants a root plans directory with individual project folders
- execution may happen in a later Codex turn or after restart
- reviewers need status, assumptions, decisions, validation evidence, and open questions
- the plan should produce an execution-ready brief without requiring a separate executor skill

Artifact root:

```text
<current-working-directory>\Tasks\plans\<YYYYMMDD-HHMMSS>-<task-slug>\
```

Set `CODEX_TASK_PLANS_DIR` or pass `--root` when the plan output must live outside the current workspace.

Artifact files:

- `PLAN.md`: objective, understanding, approach, execution plan, validation, risks, stop points, and immediate next action
- `PLAN_QA.md`: plan self-test, expected output checks, testing technique decider, and post-implementation test proposals
- `resources\`: optional generated planning resources such as source request notes, command matrices, checklists, acceptance criteria, test data notes, or small reference extracts

PlanOps root:

```text
<current-working-directory>\Tasks\plans\<YYYYMMDD-HHMMSS>-<project-slug>\
```

Set `CODEX_TASK_PLANS_DIR` or pass `--root` to keep the root project plans directory somewhere else.

PlanOps files:

- root: `project.yaml`, `status.yaml`, `DECISIONS.md`, `logs\progress.md`, `resources\`
- per version: `versions\vN\PLAN.md`, `PLAN_QA.md`, `EXECUTION_BRIEF.md`, `VALIDATION_MATRIX.md`, `RISKS_AND_STOP_POINTS.md`, and `QUESTIONS.md`

For PlanOps details, read `references/planops_mode.md`.

When creating an artifact folder, use the helper script:

```powershell
python "<task-planner-skill-root>\scripts\create_plan_output.py" --title "<task title>" --plan-mode "<Planning Mode>" --with-resources
```

For PlanOps Mode, run:

```powershell
python "<task-planner-skill-root>\scripts\create_plan_output.py" --title "<task title>" --plan-mode "Deep Plan" --planops --with-resources --notes "<source prompt or short brief>"
```

To add another version to an existing PlanOps project, pass `--project-root "<existing project folder>" --reuse-project --planops`.

Useful helper options:

- `--root "<path>"`: keep task outputs outside the skill folder, for example in a sibling QA or review directory.
- `--prompt-file "<path>"`: copy the source prompt into `resources\REQUEST.md` for traceable QA and review.
- `--notes "<text>"`: add short source-context notes to `resources\REQUEST.md`.
- `--dry-run`: preview the output paths without creating files.
- `--timestamp "<YYYYMMDD-HHMMSS>"`: use only for deterministic tests; omit during normal planning.
- `--planops`: create the durable PlanOps project structure.
- `--project-root "<path>"`: create or continue a specific PlanOps project.
- `--reuse-project`: add the next version under an existing PlanOps project.
- `--version "vN"`: use a specific PlanOps version label.

After creating the folder, fill the generated Markdown files with the final plan and report the paths. If the helper script is unavailable, create the same structure manually.

## Planning Workflow

1. Restate the task as a concrete outcome.
2. Define success evidence: files changed, behavior observed, tests passed, report produced, or decision made.
3. Classify the task type and select the planning depth.
4. Select `Inline Mode`, `Artifact Mode`, or `PlanOps Mode`.
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
15. In PlanOps Mode, write `QUESTIONS.md` with 3 to 5 targeted questions for the next version.
16. End with the immediate next action Codex should take.

## PlanOps Question Loop

Do not front-load a broad questionnaire. Generate a first useful plan version using safe assumptions unless missing information affects destructive changes, credentials, publishing, billing, external systems, or product direction.

After each saved version:

- report the version folder and current status
- summarize the assumptions that most need review
- ask 3 to 5 concrete questions tied to this plan
- propose what v2 should improve
- wait for feedback before creating the next version when the user is expected to review

Use the answers to update the existing PlanOps project with a new `versions\vN` folder. Do not create a separate unrelated project unless the objective changed.

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

For Artifact Mode, write this QA content to `PLAN_QA.md` and summarize it in the final response. For PlanOps Mode, write it to `versions\vN\PLAN_QA.md` and connect the evidence to `VALIDATION_MATRIX.md`.

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
<Inline Mode | Artifact Mode | PlanOps Mode, with folder path if created>

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

For PlanOps Mode, also include:

- `Project Folder`
- `Current Version Folder`
- `Status File`
- `Execution Brief`
- `Validation Matrix`
- `Questions For Next Version`

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
- the output matches the requested mode: inline plan, artifact folder, PlanOps project, or explicitly requested execution-ready update
- no target implementation was performed
- no downstream executor dependency remains
- PlanOps Mode, when used, created one root project folder with versioned plan outputs instead of loose unrelated files
- PlanOps questions are specific enough to drive the next version
- assumptions and stop points are explicit
- validation is concrete
- test proposals match the task type and risk
- Artifact Mode, when used, created only planning files and resources
- artifact QA, when run, kept task output folders separate from the skill package
- the immediate next action is obvious
