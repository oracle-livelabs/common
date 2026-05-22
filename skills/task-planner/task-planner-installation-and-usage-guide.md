# Task Planner Installation And Use Guide

## What The Skill Can Do

- turn rough or complex requests into practical Codex execution plans
- help Codex plan a new project before implementation starts
- create optional durable plan folders with `PLAN.md`, `PLAN_QA.md`, and resources
- create PlanOps project folders with status, versioned plan outputs, execution briefs, validation matrices, decisions, logs, and review questions
- choose validation and QA techniques before execution begins

## Core Rules

- plan artifacts first, then move into execution only when the user explicitly asks
- define completion evidence and stop points
- call out missing information and risks
- use `CODEX_TASK_PLANS_DIR` when a portable output root is needed
- use PlanOps Mode when the plan must survive review, restart, or later execution

## Installation Process

Give Codex this prompt:

```text
Install the `task-planner` skill folder into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `task-planner` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$task-planner` and give Codex the target path or content.

## What To Include In Your Request

- goal or rough request
- project idea, desired deliverables, milestones, and success criteria
- known constraints and target files or systems
- whether output should stay in chat or create artifacts
- whether the task needs a PlanOps project with versions and review questions
- validation expectations and review gates

## Recommended Prompt Patterns

### Plan A Project Before Implementation

```text
$task-planner help me plan a new project before implementation. Define the objective, milestones, deliverables, risks, validation checks, QA strategy, and immediate next actions. Create durable plan artifacts if the project is large enough.
```

### Plan Only In Chat

```text
$task-planner plan how to migrate this service to a new database without executing the migration
```

### Create Plan Artifacts

```text
$task-planner create a durable plan folder for a security review task. Title: API auth cleanup. Include QA strategy and resources.
```

### Create A PlanOps Project

```text
$task-planner create a PlanOps project for putting a fullstack application on Oracle architecture with Autonomous AI Database. Create v1 with PLAN.md, PLAN_QA.md, EXECUTION_BRIEF.md, VALIDATION_MATRIX.md, RISKS_AND_STOP_POINTS.md, status.yaml, decisions, logs, resources, and targeted questions for v2.
```

## Common Pitfalls

- expecting execution to start before the plan, approval points, and validation evidence are clear
- omitting constraints that affect sequencing
- creating artifacts without a useful title or prompt
- placing plan outputs inside the skill package
- creating a new unrelated project folder when the user only wanted the next version in an existing PlanOps project

## Expected Output From Codex

- ordered plan
- project milestones and deliverables when the request is project planning
- completion evidence
- inspection list
- QA and validation approach
- risks, assumptions, and stop points
- artifact folder path when requested
- PlanOps project path, current version path, status file, execution brief, validation matrix, and questions when PlanOps Mode is used

## Quick Checklist

- embedded name is `task-planner`
- request has a clear plan, artifact, PlanOps, or execution-readiness scope
- artifact output root is portable
- project plan includes deliverables, milestones, validation, and risks
- PlanOps projects keep all versions under one project folder

## Versioning History

- version 1.2 - 05/22/26
- version 1.1 - 05/11/26
- version 1.0 - 05/11/26
