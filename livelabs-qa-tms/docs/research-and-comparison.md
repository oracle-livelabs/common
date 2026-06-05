# LiveLabs TMS Research And Comparison

Date: 2026-05-26
Status: implementation reference for local prototype

## Source Scope

- TestLink open-source project and user-documentation references for requirements, test specifications, test cases, test plans, builds, execution, and reports.
- TestLink deployment references for PHP/Apache/MySQL-style installation and containerized deployment.
- Xray official documentation/product references for Jira-native tests, preconditions, test sets, test plans, test executions/runs, traceability, reports, automation imports, APIs, and Jira integration.

This document is a product and implementation synthesis, not a claim that the prototype embeds or redistributes TestLink or Xray code.

## TestLink-Inspired Capabilities

TestLink-style concepts to reuse:

- Test Project as the top-level quality scope.
- Requirement specifications linked to test cases.
- Test Specification tree with test suites and test cases.
- Test Plans used as the basis for execution.
- Builds as execution targets.
- Assignment of test cases to testers.
- Test execution status and execution history.
- Reports for plan execution, result matrix, failed/blocked/not-run cases, charts, and export.

Useful implementation lessons:

- Keep the repository model explicit: requirements, suites, cases, plans, builds, executions.
- Treat builds as execution targets, not just labels.
- Preserve execution history per case and plan.
- Keep reports close to execution status and coverage.
- Avoid forcing all QA workflows into Jira if the QA team needs an independent repository.

## Xray-Inspired Capabilities

Xray-style concepts to reuse:

- Jira-native issue mapping for Tests, Preconditions, Test Sets, Test Plans, Test Executions, and Test Runs.
- Requirements-to-tests-to-defects traceability.
- Automation import and CI/CD alignment.
- BDD/manual/automated test types.
- Reporting by coverage, execution, readiness, and defects.
- API-oriented integration model for CI/CD and future Jira synchronization.

Useful implementation lessons:

- Use traceability as a first-class view, not an afterthought.
- Keep requirement, test, execution, and defect links visible on every release decision path.
- Make automation import a supported path from the start, even if V1 only models the data.
- Let Jira remain the system of record for defects and delivery work if the team chooses that direction.

## LiveLabs TMS Direction

LiveLabs TMS should combine:

- TestLink's clear test repository, plan, build, and execution workflow.
- Xray's Jira-native traceability and development workflow alignment.
- QA Hub integration for alerts, GitHub PRs, knowledge sources, and operational reporting.

## Comparison Matrix

| Area | TestLink Pattern | Xray Pattern | LiveLabs TMS V1 Choice |
| --- | --- | --- | --- |
| Top-level scope | Test Project | Jira project | LiveLabs QA workspace |
| Requirements | Requirement specifications | Jira requirements/stories linked to tests | Requirements imported from QA Hub knowledge and operations |
| Test design | Test suites and test cases | Test issue types, preconditions, test sets | Repository page with requirements, suites, and cases |
| Planning | Test plans and builds | Test Plans and Test Executions | Plans and builds with execution board |
| Execution | Manual execution and result history | Test Runs under Test Executions | Execution board with status updates and evidence |
| Traceability | Requirement-to-case coverage | Jira issue traceability and reports | Coverage matrix across requirements, cases, executions, and defects |
| Defects | External bug tracker links | Jira-native defects | Jira/Xray-ready local defect links |
| Automation | Import possible through integrations/scripts | Strong CI/CD import/API model | Modeled as automation field and future import backlog |
| Reporting | Execution and result reports | Jira/Xray reports and coverage | Local Markdown report preview |

## V1 Local Prototype Boundaries

- No Jira writes.
- No real GitHub API calls.
- No production source claims.
- No external notifications.
- No credential handling.
- Local seeded demo state only.

## Implementation Notes

- The prototype is a separate project: `Projects\LiveLabs TMS`.
- The local app runs on `http://127.0.0.1:4193`.
- The QA Hub links to the TMS from its Test Management page.
- Current V1 includes local persistence, requirement creation, test case creation, execution status updates, derived coverage, defect links, and report preview.

## Next Research Items

- Confirm whether LiveLabs wants an independent TMS, Jira/Xray alignment, or a hybrid path.
- Identify which LiveLabs QA requirements should be seeded from current authoritative sources.
- Decide whether TestLink itself is useful as an installed reference instance for workflow discovery only.
- Define import formats for Playwright/JUnit/Cucumber results.
- Define the lowest-risk Jira/Xray integration mode: read-only first, then controlled writeback later.
