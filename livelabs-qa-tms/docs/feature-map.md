# LiveLabs TMS Feature Map

## Core Pages

| Page | Purpose |
| --- | --- |
| Overview | Quality program snapshot, progress, blockers, and links back to QA Hub. |
| Projects | Feature/project scopes used as parents for requirements, suites, plans, tests, and executions. |
| Requirements | Requirement documents, requirements, review status, and requirement traceability matrix. |
| Test Repository | Suites, test cases, steps, expected results, type, priority, automation, and status. |
| Test Plans | Test plans, builds, owner, suite links, and tests inside each plan. |
| Test Execution | Manual/automated execution creation and result status by test case and build. |
| Traceability | Requirement-document and requirement-to-tests-to-defects coverage views. |
| Defects | Jira/Xray-style defect and issue mapping. |
| Execution Reports | Local summary, execution, and coverage report previews. |

## Implemented V1 Controls

| Control | Role In Prototype |
| --- | --- |
| Add Requirement | Creates a local requirement from a QA Hub source or manual source note. |
| Add Requirement Document | Creates a project-level requirement document for a feature or release scope. |
| Add Test Suite | Creates a project-level suite that can be linked to one or more plans. |
| Add Test Case | Creates a local test case linked to a suite and requirement. |
| Create Test Plan | Creates a plan linked to project, requirement document, and build. |
| Link Suite To Plan | Adds a suite to the selected test plan. |
| Add Test To Plan | Adds a test case into the selected plan scope. |
| Create Execution | Creates an execution run for plan, test case, build, assignee, status, and evidence. |
| Execution Status Selector | Updates local execution status to Passed, Failed, Blocked, or Not Run. |
| Generate Report | Produces a Markdown summary from current local state. |
| Back To QA Hub | Returns to the QA Hub command layer on port `4192`. |

## Data Entities

| Entity | Purpose |
| --- | --- |
| Requirement | Business or QA requirement under test. |
| Requirement Document | Feature/project requirement source document and review unit. |
| Test Suite | Hierarchical grouping of test cases. |
| Test Case | Manual, automated, or BDD test definition. |
| Test Plan | Release/sprint testing scope. |
| Build | Execution target or version. |
| Test Execution | Result record for a test case in a build/plan. |
| Defect Link | Jira/Xray-compatible defect or issue association. |
| Evidence | Screenshot, CI log, GitHub PR, QA Hub alert, or source note. |
| Audit Event | Local trace of requirement, test case, and execution-status changes. |
