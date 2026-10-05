# PlanOps Mode

Use PlanOps Mode when a plan needs to survive review cycles, restarts, execution handoff, or later validation.

## Why It Exists

Codex's built-in plan is best for in-turn progress tracking. PlanOps is for durable planning:

- one root plans directory
- one folder per task or project
- versioned plan iterations
- status and resume state
- execution brief
- validation matrix
- risks and stop points
- decisions and progress logs
- review questions after every version

## Directory Shape

Default root:

```text
%CODEX_TASK_PLANS_DIR%
```

If `CODEX_TASK_PLANS_DIR` is not set, use:

```text
<current-working-directory>\Tasks\plans
```

Each project should live below the root:

```text
<plans-root>\<timestamp>-<project-slug>\
  project.yaml
  status.yaml
  DECISIONS.md
  logs\
    progress.md
  resources\
    README.md
    REQUEST.md
  versions\
    v1\
      PLAN.md
      PLAN_QA.md
      EXECUTION_BRIEF.md
      VALIDATION_MATRIX.md
      RISKS_AND_STOP_POINTS.md
      QUESTIONS.md
```

## Status Model

Use simple lifecycle states:

- `draft`
- `planned`
- `ready_for_execution`
- `blocked`
- `in_progress`
- `validated`
- `closed`

The initial state is `draft`. Move to `ready_for_execution` only when open questions and stop points are resolved enough for Codex to act safely.

## Question Loop

Generate the first version before asking broad questions unless missing information would make the plan risky. After each version, ask 3 to 5 questions tied to:

- wrong or weak assumptions
- missing completion evidence
- stop points that need user approval
- validation checks that would build trust
- process that should be removed because it adds clutter

The next version should update the existing project folder instead of creating a separate unrelated plan.

## Execution Brief

`EXECUTION_BRIEF.md` is not a separate executor contract. It is a concise restart file for Codex or a human reviewer. It should state:

- approved plan version
- target paths and source material
- first execution actions
- non-negotiable stop points
- what not to do without approval

## Validation Matrix

Use `VALIDATION_MATRIX.md` to connect requirements to proof:

```text
Requirement | Evidence Needed | Command Or Check | Owner | Status
```

This matrix should be concrete enough that an execution run can prove the task was handled without re-planning.
