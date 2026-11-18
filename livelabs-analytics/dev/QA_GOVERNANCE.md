# Phase 1: Jenkins evidence in Analytics

This file-based pilot adds severity-weighted QA evidence to an isolated Analytics candidate. It does not execute Jenkins, synchronize remote Analytics, change publication state, or deploy a site. Run Jenkins first and finish the existing Analytics snapshot preparation process before building a production candidate.

## Build and inspect

From the Analytics project root, using Python 3.10+:

```powershell
python dev/scripts/integrate-qa-governance.py --jenkins "C:/path/results.csv" --inventory "C:/path/refreshed/portfolio_inventory.json" --output .private/governance/pilot-001 --as-of 2026-10-13
python dev/scripts/validate-qa-candidate.py .private/governance/pilot-001
python -m unittest discover -s dev/tests -p test_qa_governance.py -v
node dev/scripts/test-qa-candidate.mjs .private/governance/pilot-001
python -m http.server 4186 --bind 127.0.0.1 --directory .private/governance/pilot-001/site
```

Use a new output directory every time. `--as-of` records the evaluation date; omit it to use the current UTC date. The browser runner uses the project's existing Playwright installation. Set `PLAYWRIGHT_BROWSERS_PATH` when its browser cache is outside the default profile. Serve only `site/`; private inputs and operational reports are adjacent directories, outside the served root.

| Output | Purpose |
|---|---|
| `inputs/analytics-export.csv` | Item-level Analytics export: stable identity, family, lifecycle, ownership and demand inputs. |
| `inputs/analytics-inventory.json`, `jenkins-results.csv`, `qa-policy.json`, `analytics-fragments/` | Frozen source inputs and historical ranking fragments. |
| `reports/governance.csv` | One row for every Analytics record, including explicit unknown/unobserved evidence. |
| `reports/governance.json` | Machine-readable report, policy and all normalized Jenkins findings. |
| `reports/reconciliation.csv` | One row per Jenkins type/ID, including quarantined and unsupported identities. |
| `reports/findings.csv` | Deduplicated finding groups, severity, occurrence basis, original CSV row numbers and test sections. |
| `reports/ranking-comparison.csv` and `.json` | Baseline and adjusted score/rank, original table position, QA applicability and displayed membership. |
| `manifest.json` | Source/output hashes, dates, policy, population accounting, promotion gaps and per-table comparison counts. |
| `site/` | Enriched Inventory/Search payload, all five ranking sections (nine tables), and the shared Analytics UI. |

For a reproducible replay, use the earlier candidate's `inputs/jenkins-results.csv`, `inputs/analytics-inventory.json`, `--policy inputs/qa-policy.json`, `--fragments inputs/analytics-fragments`, and the same `--as-of`, with a new output directory and the same implementation revision. Penalties always start from frozen baseline inputs, not previously adjusted table fragments.

## Identity and evidence

Join Workshop/Sprint `item_id` to Analytics `livelabsId`. WMS ID groups families and must never spread QA findings to siblings. Conflicting types keep a diagnostic score but cannot adjust rankings. LiveStacks are quarantined as a separate, unsupported population until their identity contract is provided. Duplicate Analytics IDs, mixed runs and malformed CSV input fail the build.

`issue_count` repeats the item's aggregate on each CSV finding row; never sum it. Normalize item/code/message, collapse repeated unavailable/authentication root causes across sections, and retain source row numbers. Supported explicit aggregate counts are used for grammar, typos, visible links/images, PARs and Markdown. Unrecognized formats contribute one reported finding. These summary messages cannot prove that every reported occurrence is a distinct underlying resource.

Incomplete scans, authentication, unverified PAR links, timeout, blocked and skipped checks are evidence gaps, not content penalties. Policy qa-governance-v1.1 adds PAR_LINK_UNVERIFIED after confirming the producer defines it as a timeout or temporary response after retries; severity weights and scoring formulas are unchanged. Unknown issue codes or severities and inconsistent summaries are held for review. Null means unknown. A legacy reported pass can have a score of zero while check completeness remains unverified.

## Versioned score and table policy

Policy lives in `dev/config/qa-governance-policy.json`. Initial weights: blocker/critical 10, major 3, minor 1, informational 0. Weighted burden is the sum of weight times supported reported occurrences. `E = round(100 * burden / (burden + 20), 2)`; lower is better. This is an error burden score, **not a measured check-failure percentage**. The weights and half-score parameter are pilot choices requiring calibration with content owners, particularly for long workshops and noisy grammar findings.

- Top Performers: recompute the existing 45% 12-month demand percentile + 35% 90-day demand percentile + 20% freshness baseline across the full eligible population; multiply by `1 - E/100`, then take the top 100 per type.
- At-Risk: historical candidate list and score retained; review score = `base + (100 - base) * E/100`.
- Retire-Now: historical candidate list retained; review score = `base + (100 - base) * 0.25 * E/100`. QA alone creates no retirement candidates.
- Replacement: recompute the five existing similarity components when available; multiply by the **target's** quality factor. Source QA is separate context. Unknown target QA does not certify suitability.
- Disabled: preserve membership and publication state; prioritize review by applicable QA score.

The At-Risk/Retire-Now factor inputs are absent from the canonical inventory. This pilot cannot regenerate their base populations from current source data. Obtain a governed factor/eligibility export before enabling a full refresh. Historical table type conflicts also suppress adjustments. Unknown QA leaves the baseline unchanged and remains visibly unknown; untested content is not certified by appearing high in a table.

## Strict candidate gates

`--mode strict --run-manifest <file>` requires a completed, correctly hashed run, a post-run Analytics snapshot within the configured skew, and matching per-item expected/completed checks with no blocked/skipped checks or evidence gaps. Default run age is at most 14 days and snapshot lag at most 2 days. Every selected Workshop/Sprint must join with compatible type and valid evidence. The manifest item population must exactly match the Workshop/Sprint CSV population. These gates check the declared producer contract; they do not independently prove that a producer declared every required business check.

Expected manifest shape (illustrative values; do not fabricate one for an old run):

```json
{
  "run_id": "same-as-csv",
  "complete": true,
  "ended_at": "2026-10-13T10:00:00Z",
  "csv_sha256": "actual-sha256-of-export",
  "build_url": "producer-build-reference",
  "source_revision": "producer-commit",
  "environment": "selected-environment",
  "catalog_snapshot_id": "selected-catalog-identity",
  "items": {
    "workshop:123": {
      "expected_checks": 5,
      "completed_checks": 5,
      "blocked_checks": 0,
      "skipped_checks": 0
    }
  }
}
```

The current Jenkins `root-summary-reporter.mjs` writes summary JSON/CSV and captures run completion/configured tests; it does not yet export this per-item expected-check contract. Do not infer expected checks from observed findings, collected browser instances, or a successful Jenkins job. Keep report completion separate from coverage completeness.

Strict mode also requires Analytics `metadata.sources_synced_at` with the actual source-sync timestamp. Its date must match `snapshot_date`, and its timestamp must be at or after run completion. A same-day snapshot date alone cannot establish the run-then-sync sequence. Strict run provenance requires a build reference, source revision, environment and catalog snapshot identity.

## Review before promotion

Review identity/type conflicts, check the normalized findings against Jenkins evidence, calibrate severity/occurrence policy, compare rank movement and new top-100 entrants, and inspect Workshop/Sprint examples in the UI and exports. Obtain a fresh run-then-sync pair and the missing governance factors before moving beyond the local pilot. The QA Hub is not required for this process. Deployment, owner notifications and retirement decisions remain separate human actions.
