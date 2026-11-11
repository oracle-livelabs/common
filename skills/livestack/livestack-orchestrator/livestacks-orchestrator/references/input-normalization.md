# Input Normalization

Normalize user input into persisted source artifacts plus one compact working PRD before any specialist work begins.

## Accepted Forms

- Full PRD
- Partial PRD plus notes
- Workbook-style headings
- Bullet lists
- Free-form paragraphs
- Mixed notes copied from workshops, emails, or demos

## Input Modes

- `PRD`: the user provides a full PRD
- `Merge`: the user provides a partial PRD plus notes or source material
- `Bootstrap`: the user provides only a brief and the skill must synthesize a working PRD before delegation

## Minimum Required Fields

For `Bootstrap` mode, require:

- `industry`
- `pain_point`

## Pre-Delegation Artifacts

Always persist these artifacts before the specialist wave starts:

- `input/business-input.md`
- `input/product-requirements.md`
- `input/working-prd.md`

Rules:

- Preserve raw user language in `input/business-input.md`.
- Preserve the source PRD in `input/product-requirements.md` when provided.
- If no source PRD exists, say so explicitly in `input/product-requirements.md`.
- Use `input/working-prd.md` as the only build contract for delegation.

## Canonical Brief

Use this shape inside the working PRD or as an intermediate normalization aid:

```yaml
industry:
category:
pain_point:
target_users:
business_outcomes:
oracle_feature_mapping:
implementation_notes:
limitations_risks:
desired_demo_outcome:
deployment_target:
optional_services:
assumptions:
open_questions:
```

## Conservative Assumptions

When fields are missing, add only conservative assumptions and label them explicitly as `Assumption:`.

- Default `category` to `Operational` if the pain point is process, workflow, throughput, or controls oriented.
- Default `deployment_target` to `portable compose bundle for local Podman and cloud VM environments`.
- Default `desired_demo_outcome` to `one working golden path, observability, and customer rebuild guidance`.
- Default `optional_services` to `none` unless the pain point clearly needs CDC, replication, streaming, or another supporting service.
- Derive `business_outcomes` from the pain point with measurable language when possible.
- Do not invent compliance requirements, source systems, or enterprise identities unless the user states them.

## Normalization Rules

- Preserve the user's terms for the pain point and translate them into technical requirements later.
- Keep Oracle feature mapping separate from implementation notes.
- Keep limitations or risks as constraints, not as reasons to stop.
- If the user provides several pain points, choose one primary pain point and mark the rest as secondary scope.
- If the user provides a PRD plus notes, reconcile them into one working PRD rather than splitting requirements across files.
- Do not delegate from raw notes. Synthesize the working PRD first.

## Working PRD Threshold

Do not start the specialist wave until `input/working-prd.md` is good enough to answer:

- who the primary personas are
- what the core workflow is
- why Oracle AI Database 26ai is the protagonist
- which Oracle capabilities are in scope
- what the data onboarding pattern is
- what the runtime assumptions are
- what the current acceptance bar is

## Example

Input:

```text
Finance
Category: Operational
Pain Point: Fragmented processing across payments, lending, and reconciliations drives delays and manual controls
Oracle feature mapping: Autonomous scaling and concurrency; GoldenGate change data capture
Implementation notes: CDC from core systems; unify process events; publish process health KPIs
Limitations / risks: CDC design complexity; unclear ownership without governance
```

Working PRD excerpt:

```markdown
# Working PRD

## Input Mode

Bootstrap

## Business Scenario

Industry: Finance
Pain point: Fragmented processing across payments, lending, and reconciliations drives delays and manual controls.
Business outcomes:
- Reduce cycle delays by consolidating process events into one operating view.
- Surface health KPIs and exception hotspots in near real time.

## Oracle Capability Mapping

- Autonomous scaling and concurrency
- GoldenGate change data capture

## Assumptions

- Assumption: target personas are operations analyst, process manager, and platform administrator.
- Assumption: the deployment target is a portable compose bundle for local Podman and cloud VM environments.
```
