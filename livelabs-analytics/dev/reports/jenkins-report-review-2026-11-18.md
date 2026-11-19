# Jenkins report review — 2026-11-18

## Source and run

- Source file: livelabs-qa-catalog-results-20261117T105742Z.json, found in the 18 November Jenkins intake folder under analytics_update_directory.
- SHA-256: 2f7d110e984acf1822e157c65bd3fc5b4f3d72687f559932e98db2501a479162
- Size: 74,422,887 bytes. Schema version: 2.
- Run: 2026-11-17T10-57-42-021Z, regression, completed with failed status; 17 November 10:57:42–18:01:47 UTC.
- 922 catalog items and 922 distinct LiveLabs IDs: 622 Workshops, 286 Sprints, and 14 LiveStacks.
- Item status: 443 passed and 479 failed. Check totals: 3,131 passed and 614 failed, 3,745 total.
- Embedded detail: 831 item-grouped issue rows; their `findingCount` values sum to 2,653, matching the item-level total. Per-item test totals sum to 3,744, one below the run total of 3,745. The run has 877 check-level category entries, so the embedded grouped issues are not a reconciled per-finding table.
- Source quality is location-only; the report does not provide replacement text or fix advice. No companion findings CSV was present.

## Identity reconciliation

Compared by exact LiveLabs ID against the current canonical inventory and public projection:

- 889 report IDs match a unique record in the 2,293-record canonical inventory.
- 853 matched IDs are in the current 889-record public projection.
- 36 matched IDs are outside that public projection; they must stay out of a public static overlay.
- 33 report IDs are absent from the canonical inventory. Together with the 36 full-inventory-only records, 69 report items do not match the public cohort.
- There are no duplicate report IDs or ambiguous canonical ID matches. Two matched records have a type-label difference, and 11 matched records have a title difference; ID remains the match key.

## Integration state

The protected Jenkins report archive now contains this run as version `2bc82ee2ea66ce2c2ef65f25a42073987b66ea4c9f00baced2cf94cac9e24493`. It was built from the saved export without running new checks. The Admin report page can serve the full run and its detail files.

The dashboard merge was not applied. Data Merge rejects this single-file import because four entries carry more than one LiveLabs ID. The 18 November intake contains no matching findings CSV, and the embedded grouped issue summaries do not reconcile to the run's 877 check-level category entries. Removing aliases or generating a synthetic findings table would risk assigning findings to the wrong item. Obtain the run's per-ID summary or its reconciled JSON/findings CSV pair, then re-run mapping by exact LiveLabs ID.

The current public cohort has 853 exact matches. Keep the 36 full-inventory-only IDs and 33 IDs absent from canonical inventory out of the public overlay. The 15 October 2026 QA merge remains active; its history was preserved.

This Jenkins report does not refresh WMS, dashboard-view, or GitHub source snapshots and does not clear the project's existing Object Storage readiness gates. Treat it as the latest QA evidence for its 922 reported IDs, not as a clean/pass release result.
