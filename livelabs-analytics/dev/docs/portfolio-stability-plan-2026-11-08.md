# Portfolio stability implementation

Goal: make cleanup recommendations defensible, explain their evidence limits, and prepare a repeatable data refresh and release.

Approved scope: the portfolio audit recommendations accepted by Lucian. New WMS/LiveLabs exports and Jenkins report are not yet available; their integration and the final Object Storage publication remain pending.

Architecture: shared Python evidence and review rules drive API, generated public artifacts and Admin. Browser fallback must preserve unknown evidence. Existing weights and separate Workshop/Sprint thresholds remain provisional until calibrated against reviewed decisions.

Constraints: preserve the existing working tree and administrative decisions. No production publication with the old snapshot. Changes continue in this working tree because it contains the integrated, uncommitted application under review. No automatic retirement or invented input data.

## Execution ledger

- [x] 1. QA validity: prevent unavailable/incomplete checks from earning a clean-score bonus; align preview, applied data, API and browser; regression tests.
- [x] 2. Retirement readiness: separate provisional, evidence-checked and approved decisions; cover both removal-request fields and missing demand; regression tests.
- [x] 3. Score transparency and calibration: effective weights, source confidence, P1 visibility, content-hygiene scope; type-specific sensitivity report without changing thresholds.
- [x] 4. Full portfolio cleanup: Admin queues across all source records; distinguish approval from source-confirmed retirement.
- [x] 5. Refresh/release readiness: data diagnostics, staged import checks, reproducible public release and pending-input instructions.
- [x] 6. Stability verification and independent review; grade implementation and release readiness separately.

Review focus: partial QA coverage, legacy overlays, proxy dates, shared title demand, unknown-versus-zero semantics, source lifecycle state, public/private boundary and rollback. Verify the actual local UI plus meaningful automated regressions; report limitations explicitly.

Implementation ruling: preserve thresholds/weights until reviewed outcomes exist. Require verified content/publication dates and attributable demand for evidence-checked retirement, retaining provisional rows in evidence review. Current snapshot and QA remain dated September 28 and October 15 respectively. New data integration and publication are pending.

Final verification: 79 Python tests, 11 browser scenarios, 80 application checks, Node evidence/adapter checks and 6 exact-static-package browser checks passed. Packaged Admin imports and full inventory/calibration verified. Independent review findings were corrected with RED→GREEN regressions. Strict preflight retains three expected new-data/verification blockers. See portfolio-stability-assessment-2026-11-08.md and snapshot-refresh-and-release.md. No commit, cleanup of unrelated changes or production publication.

## Objectives

Record the portfolio stability implementation ledger, verification evidence, and release blockers.

## Estimated Time

Estimated Time: About 10 minutes to review the implementation record.

## Acknowledgements

The recorded checks are local project evidence; new source integration and publication were not completed.
