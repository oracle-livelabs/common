# Task Planner Installation And Use Guide

## What The Skill Can Do

- turn rough or complex requests into practical Codex execution plans
- help Codex plan a new project before implementation starts
- create optional durable plan folders with `PLAN.md`, `PLAN_QA.md`, and resources
- choose validation and QA techniques without executing the target task

## Core Rules

- planning only: do not implement the target task
- define completion evidence and stop points
- call out missing information and risks
- use `CODEX_TASK_PLANS_DIR` when a portable output root is needed

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

## Common Pitfalls

- expecting implementation from a planning-only skill
- omitting constraints that affect sequencing
- creating artifacts without a useful title or prompt
- placing plan outputs inside the skill package

## Expected Output From Codex

- ordered plan
- project milestones and deliverables when the request is project planning
- completion evidence
- inspection list
- QA and validation approach
- risks, assumptions, and stop points
- artifact folder path when requested

## Quick Checklist

- embedded name is `task-planner`
- request is planning-only
- artifact output root is portable
- project plan includes deliverables, milestones, validation, and risks

## Versioning History

- version 1.1 - 05/11/26
- version 1.0 - 05/11/26
