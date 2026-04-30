# How To Add A New Test

1. Create a spec under `tests/platform/<smoke|regression>/<area>/`.
2. Reuse or extend the active page objects under `pages/platform/...`.
3. Keep assertions close to the user behavior the spec validates.
4. Move shared setup into `tests/support/...` only when more than one spec needs it.
5. Import the canonical fixture from `tests/support/test.ts`.
6. Use `test.step(...)` for the major user actions so the HTML report stays readable.
7. Use `testInfo.annotations` for runtime details that help explain the scenario in reports.
8. Use `qaArtifacts.captureCheckpoint(...)` only when a named screenshot is genuinely useful beyond the default failure artifacts.

Rule:

- use `smoke` for high-signal coverage that should fail fast
- use `regression` for specific edge cases or known-risk behavior
