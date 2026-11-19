# Admin Missing contact page — design

## Intent

Give administrators a compact, private queue for inventory records missing the main WMS author email. Support and technical contact emails are a secondary, combined coverage dimension; either email counts as an available additional contact.

## Coverage rules

- Preserve the inventory row grain and every `livelabs_id`; a `wms_id` groups records but does not replace record identity.
- The default queue includes records with a missing WMS author email only. Users can broaden the author filter and inspect rows missing an additional contact.
- Additional contact is present when either a support contact email or a technical contact email is present. The two fields do not create separate queue rows or filters.
- GitHub acknowledgement author/contributor fields do not determine missing-contact coverage.
- `Owner Group` is not a substitute for a main author email.
- Keep all results behind the authenticated Admin route and inventory API. The queue is read-only and does not modify source records.

## Current source counts

The bundled inventory metadata reports snapshot `2026-09-28` with 2,293 records. At row grain, the author/additional-contact combinations are:

| Main author | Additional contact | Records |
| --- | --- | ---: |
| Missing | Missing | 303 |
| Missing | Available | 0 |
| Present | Missing | 1,989 |
| Present | Available | 1 |

The default queue therefore contains 303 rows. Additional contact means at least one support or technical email. These counts describe the bundled snapshot; they do not certify that its source data is the newest available.

## Filters and table

- Keep Search, Main author, Additional contact, and Content type in one compact primary row; default Main author to Missing and Additional contact to Any status.
- Put category, publishing, workflow, owner group, and repository filters under a collapsed `More filters` disclosure.
- Show the four full-inventory coverage combinations in a compact summary strip.
- Use one additional-contact filter and one table column listing available Support and Technical emails. Use `N/A` when neither exists.
- Keep the table focused on row number, LiveLabs ID, WMS ID, title, coverage, main author email, additional contact emails, type, category/council, and WMS update.
- Use synchronized top and bottom pagination with 10, 25, 50, and 100 rows per page, matching Portfolio Inventory. Export the filtered result set as CSV, XLSX, or JSON.
- Do not add these details to the public Dashboard or Views table.

## Readiness review

Keep source freshness, completeness, privacy, identity, and deployment gates separate from this page’s local UI validation. Do not claim object-storage readiness from the coverage page or from a passing browser test alone.
