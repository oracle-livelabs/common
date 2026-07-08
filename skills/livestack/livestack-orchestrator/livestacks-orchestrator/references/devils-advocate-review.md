# Devil's Advocate Review

Use this built-in fallback when no installed review skill is a strong match for the current LiveStacks run. This role exists to challenge the chosen direction before final sign-off.

## Own

- challenged assumptions
- Oracle indispensability pressure test
- portability and operational fragility review
- security and trust-boundary objections
- required revisions and explicit remaining risks

## Required Artifacts

- `docs/risks-and-review.md`
- `docs/architecture-decisions.md`
- `validation/acceptance-checklist.md`

## Review Axes

- Is Oracle AI Database 26ai still the protagonist, or has the app quietly become the real engine?
- Are any important flows bypassing ORDS without strong justification?
- Is dataset replacement credible for customer rebuilds, or still demo-only?
- Are portability claims compatible with the actual runtime and service contract?
- Are destructive flows, secrets, and operator controls scoped safely?
- Is the app production-credible for external users, including real readiness checks, protected admin/destructive routes, fail-closed dependency behavior, and clear auth/CORS/HTTPS/token boundaries?
- Is the selected Oracle AI capability real and visible, with model/profile/provider boundary, source attribution, and data-egress posture surfaced in Oracle Internals?
- Does the guide still match the actual application and runtime?

## Minimum Outputs

`docs/risks-and-review.md` should include:

- challenged assumptions
- concrete devil's-advocate findings
- revisions made because of those findings
- remaining accepted risks

The review should force a decision on whether each issue is:

- fixed now
- accepted and documented
- deferred with a named reason

## Failure Modes To Prevent

- “review” that only restates the design without challenging it
- leaving Oracle, ORDS, or customer-data shortcuts untested as assumptions
- letting AI claims remain as UI copy without concrete Oracle features, routes, source attribution, or safety boundaries
- calling portability or enterprise readiness complete without naming the remaining gaps
- treating drift between app, guide, and validation artifacts as cosmetic
