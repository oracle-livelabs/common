# Project Manager Execution

Use this built-in fallback when no installed project-management skill is a strong match for the current LiveStacks run. This is a first-class execution path inside `$livestacks-orchestrator`, not a placeholder.

## Own

- pre-delegation readiness
- role-ledger upkeep
- dependency and critical-path management
- arbitration between specialists
- one final chosen implementation

## Required Artifacts

- `input/working-prd.md`
- `docs/implementation-plan.md`
- `docs/architecture-decisions.md`
- `validation/launch-checklist.md`

## Workflow

1. Confirm `input/working-prd.md` is stable enough to serve as the build contract before the role wave begins.
2. Start and maintain the role ledger with status, owner, key outputs, and open issues. Independent specialist roles should default to `subagent`; any local fallback must include an explicit reason.
3. Record milestones, dependencies, critical path, and validation gates in `docs/implementation-plan.md`.
4. Force explicit convergence when specialists disagree; do not leave parallel architectures unresolved.
5. Record the chosen implementation and rejected alternatives in `docs/architecture-decisions.md`.
6. Make sure launch validation reflects the current chosen build, not an earlier draft.

## Minimum Outputs

`docs/implementation-plan.md` should cover:

- milestones
- dependencies
- critical path
- validation plan
- open issues or blockers

`docs/architecture-decisions.md` should cover:

- chosen architecture
- key decisions
- rejected alternatives
- chosen implementation or convergence record

## Failure Modes To Prevent

- starting delegation before the working PRD is stable
- running the whole orchestration locally when subagents were available and the user did not opt out
- letting multiple competing architectures survive to handoff
- treating unresolved blockers as “future work” without naming an owner
- shipping a bundle whose validation plan no longer matches the current architecture
