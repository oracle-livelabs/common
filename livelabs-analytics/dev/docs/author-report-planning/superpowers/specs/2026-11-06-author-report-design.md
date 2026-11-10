# Analytics author report redesign

Status: design for user review. The independent builder check found no important unanswered implementation questions. Product code has not been changed for this request.

## Intent and agreed scope

Make the dashboard, search results and individual records easier for authors to use. Follow the supplied Jenkins report examples: compact identity and actions, clear priority, and findings that explain what failed and where to fix it. Keep existing Analytics branding and one combined table per dashboard tab.

The user explicitly chose to keep existing Analytics + Jenkins blends and simplify their display. No score weights, direction, eligibility, manual decisions or source snapshot changes are authorized by this redesign. A higher performance score means stronger performance; a higher risk/retirement score means greater review priority.

## Approach

Rework the existing shared renderer and report projection. This is the approach that fits the requested Jenkins-style report within Analytics, retaining the existing search, pagination, exports and Admin service. A new report application would fragment navigation; CSS-only restyling would leave the missing evidence and incorrect metric meaning unresolved. These implementation choices are recommendations, not a separate user selection.

## Dashboard and shared navigation

- Start with the left menu hidden on dashboard, search results and record pages. A labelled Menu button opens it; Close, Escape and backdrop dismiss it. Maintain focus correctly and prevent the closed drawer from receiving keyboard focus. Do not require hover. Avoid shrinking the content into an unnecessarily narrow column.
- Keep the dashboard's four existing tabs and their combined tables. All help, table, filter and row disclosures remain closed until the user opens them.
- Order summary cards: Public and published, P1 findings to review, Items with errors.
- Items with errors counts distinct eligible LiveLabs IDs with at least one reported P1/P2/P3 finding, including findings awaiting verification. It does not count every matched report or count one item several times. Current saved data yields 470; the old 861 measured report coverage. Five additional items have only unclassified findings and stay in Admin's evidence review instead of being called confirmed errors. P1 remains a finding count, currently 91 across 77 items; its help explains that distinction.
- Use the single public label **Score** for the existing final blend. Remove the standalone Jenkins score column, its filter/sort option and duplicate score cards; retain its underlying value for calculation and Admin diagnostics.
- Remove Review focus from public table columns. Keep the useful existing focus filter within the closed Apply filters panel; no scoring or governance fields are deleted from the data. Remove the repeated focus badges from the record title area to reduce clutter.
- Make author email approximately 160–190 px wide, with controlled wrapping or truncation and an accessible full value/copy action. Prevent email strings from widening the page.
- Replace Open record text links with consistent red action buttons. Preserve real links for navigation and keyboard behavior. Do not nest a button/link inside another clickable result button.

## Search results

Use a compact list with title, Type, LiveLabs ID, short owner information, priority counts and one Score. Provide a red Open record action and an Open workshop/Open sprint action. Keep the search field and result count visible; move long metadata into the record. Preserve existing query behavior and identity rules; this change does not silently expand or reduce the search result set.

Global search uses the performance blend. When arriving from At-risk or Retirement, carry an explicit score context into the record URL so the displayed score matches the originating table. A direct record URL defaults to performance. If its required inputs are unavailable, show N/A; never substitute the Jenkins error score or zero. Label the score meaning in a short caption or accessible help, not by showing another numeric score.

## Record page

Use a restrained header rather than a large decorated hero: Type, title, LiveLabs ID and concise owner/status information. Primary actions are Open workshop/Open sprint and Back to dashboard; Copy link and Export remain secondary. Show the existing combined Score once.

Place an author-focused findings summary next: P1, P2, P3 and the saved test result counts. Group issues by priority and category while retaining each recorded location/check beneath its group. Each finding group starts closed, with a short summary that helps the author choose what to open. Do not pre-expand Full report details as the old view did.

Expanded findings contain, when the source supplies them:

1. **What failed** — the reported problem, without claiming a fresh verification.
2. **Where** — lab/step/section and source file/line or affected page.
3. **How to reproduce** — the saved report's steps.
4. **What to change** — the saved suggestion, labelled as a suggested action.
5. Affected link/image/text, HTTP status, source excerpt and safe Open lab/Open page action.

For a finding that lacks detail, say exactly what is missing. A test harness file such as `previewInstructions.generated.spec.ts:31` is labelled **QA check source**, never presented as the author's Markdown source location. Keep run metadata, raw source fields, ownership/publishing and related records in compact closed disclosures below the findings. Do not render dozens of sibling cards before the author asks for them. Related records remain grouped only by exact WMS ID, with distinct LiveLabs IDs preserved.

LiveLabs actions use the record's verified catalog destination or its public LiveLabs identity. Only safe HTTP(S) URLs are links; no guessed lab path or manufactured source-line link. Open external content in a separate tab with appropriate relationship attributes. Existing protected links and token redaction rules remain in force.

## Recoverable Jenkins evidence

The original export is available locally at `C:\Users\Lucian Brinzei\Desktop\jenkins reports\livelabs-qa-catalog-results-20261015T121124Z.json`. It contains 918 catalog records; 494 have detailed issues. Its run ID matches the applied run `2026-10-15T12-11-24-208Z`.

The export includes `problem`, `reproduction`, `action`, `location`, `affectedItems`, structured `details` and per-item `checks`. Detailed fields include broken destinations, HTTP status, page/source URLs, source line, lab title, lab number, section, reported text and suggestions. Analytics' applied QA snapshot contains 924 records and no issue `details`; its normalized overlay also omits these richer fields. Therefore changing the renderer alone cannot restore them.

Use an additive, bounded evidence projection matched by run ID + LiveLabs ID + issue code + section + QA check file/line, with a unique match required. Do not merge by title or WMS family. Preserve the saved priorities, occurrence counts, score inputs and finding rows; store the enrichment's source hash and matching provenance separately. Ambiguous or unmatched cases retain their original finding and an honest missing-evidence state.

A read-only match audit found 786 unique finding matches across 464 eligible items, 49 unmatched findings and no ambiguous matches. This establishes identity matches, not that every matched issue supplies every desired detail. The original export SHA-256 is `86d394e624482533111788f842ca439725cff3d1b39b30f9f7ccf348134c8bd0`.

Concrete examples:

- **3427:** all four imported issue identities have matching detailed entries: broken link, Markdown formatting, grammar and possible typo. The export supplies the lab/source detail missing from Analytics.
- **1036:** the Preview Instructions finding has a matching detailed entry. The imported Tenancy Instructions finding has no matching detailed entry in this export. Do not copy Preview evidence into Tenancy or remove the unmatched finding. Preserve both and label the evidence gap.

For existing saved data, create a separate reversible evidence sidecar rather than overwriting the applied QA snapshot or its counts. The service exposes only the allowlisted, sanitized projection for eligible public records; raw exports and private state remain protected. Future imports preserve the same normalized fields. A static release must explicitly include the reviewed projection or use its approved same-origin API; do not rely on a developer Desktop path at runtime.

## Constraints and acceptance

- No additional report scores, giant metadata card rows, repeated boilerplate, dense timestamp blocks or automatically opened panels.
- No new QA execution, WMS refresh, Git publication or Object Storage deployment as part of this UI change.
- No claim that archived findings or suggested fixes were verified now. Do not invent screenshots, traces, source lines, URLs or lab names when absent.
- Preserve source/public inventory and policy hashes; compare all table membership, score, priority and occurrence counts before/after. The renamed error card is the deliberate metric-definition change.
- Test drawer keyboard/focus behavior; all closed defaults; visible columns/filter/sort options; compact email cells; URL context; search and detail Score parity; working navigation/export controls; missing-score behavior; and small-screen containment.
- Test evidence matching with 3427 and 1036, including no cross-check transfer, no ambiguous match, safe URLs, redacted access-bearing values and bounded payloads. Check no-match, clean report, missing report, unclassified finding and P1-only cases.
- Verify the rendered dashboard, search list and records. Leave the local server running and provide the checked URL. The full report reconstruction and final Object Storage promotion remain separate release tasks.

## Builder choices

Use the existing plain JavaScript/Python implementation and current Oracle styling; no new UI framework or dependency. Exact spacing, CSS breakpoints, focus-management details, enrichment file organization and test fixture structure are implementation choices within this design. Keep export contents aligned with what the public report displays, including added evidence but excluding removed diagnostic score surfaces.

## Objectives

Specify the Analytics author report redesign, evidence hierarchy, constraints, and acceptance criteria.

## Estimated Time

Estimated Time: About 10 minutes to review this design specification.

## Acknowledgements

The design keeps the existing JavaScript and Python stack and documents the approved scope and implementation choices.
