# LiveStack guide: page split and content review

## Development boundary

These are direct-link development pages. There is no LiveStack item in the primary menu.
All four pages retain noindex/nofollow metadata, but have no visible development badge.
The metadata is not access control.
No content was published, pushed, or submitted to WMS during this work.

## Page responsibilities

| Route | Reader goal | Excluded material |
| --- | --- | --- |
| /livestack/ | Understand the package, value, journey, example, and runtime model | WMS form instructions |
| /livestack/use/ | LiveStacks on LiveLabs: discover, subscribe, demo, workshop, assets, resume, share | Authoring and event forms |
| /livestack/create/ | Create the WMS bundle, add entries/assets, request publication | Building the demo application; event creation |
| /livestack/events/ | Request an event for an existing bundle and verify generated entry events | Bundle publication |

Shared presentation and behavior live in assets/css/livestack-reference.css and
assets/js/livestack-reference.js. Each route contains its own static content and works without
client-side content loading. Relative sibling links preserve deployment prefixes.
The old #create-event, #create-livestack, #publish, #bundle, and #use-on-livelabs
bookmarks redirect to their new page. The introduction retains #journey and #quick-example.

## Sources and asset selection

Reviewed on 2026-09-25, including the preceding initial-draft research.

- Public authoring source:
  https://oracle-livelabs.github.io/common/sample-livelabs-templates/create-labs/labs/workshops/livelabs/?lab=create-a-livestack
  Local authoritative copy: ../sample-livelabs-templates/create-labs/labs/15-livestack/create-a-livestack.md.
  Reused five annotated WMS screenshots already in assets/media/guide/author-guide/15-livestack/images/.
  Added ls-landing-page-example.png from that source for the real bundle anatomy and retail example.
- WMS event walkthrough supplied by the user: Desktop/Create Livestack Events.
  assets/media/guide/author-guide/16-livestack-events/images/ preserves the 13 source images.
  Seven selected images explain navigation, population, dates/capacity, inclusion,
  generated event IDs, workshop-specific overrides, and Save Changes.
  The other source images remain available for future revisions.
- LiveLabs catalog and an actual PeakGear bundle were inspected:
  https://livelabs.oracle.com/ords/r/dbpm/livelabs/livelabs-workshop-cards?clear=100
  https://livelabs.oracle.com/ords/r/dbpm/livelabs/livestack-landing-page?p400_id=101
  This confirms ordered entries, prerequisites, Assets, Share, subscription state, and
  the fact that a bundle may currently have no supporting assets.
- https://github.com/oracle-livelabs/livestack
  Used for the distinction between bundle, demo, workshops, and solution-specific deployment guidance.
- https://confluence.oraclecorp.com/confluence/display/DCS/LiveLabs+LiveStack
  Imported the existing LiveLabs LiveStack Confluence Banner.png as
  assets/media/livestack/livestack-banner.png and Untitled design (2).png as
  assets/media/livestack/container-architecture.png.
  The overview GIF was inspected but not embedded: dense text and broad deployment claims
  would work against the concise introduction. The four-stage journey is accessible HTML instead.
- https://confluence.oraclecorp.com/confluence/display/DCS/26ai+Industry+LiveStacks
- https://confluence.oraclecorp.com/confluence/display/DCS/LiveStack+-+AI+Lakehouse+-+The+PeakGear+Demo+Experience
  Background material informed industry context. Planning/status tables, team details, customer
  names, and roadmap claims were not copied into the author-facing pages.

The Confluence source is Oracle Restricted. The two illustrations are used only in this
local development draft at the user's request. Review their suitability for the intended
publication audience before release. Removing the menu link or using noindex does not make
an otherwise public deployment private. Public-source WMS screenshots retain their original
annotations and sample values; the supplied event screenshots already mask user details.

### LiveLabs platform walkthrough expansion

The platform guide now has eight bookmarkable chapters, four linked LiveStack examples,
and seven new unmodified screenshots in assets/media/livestack/platform/.
The previous #find, #bundle, #start, and #assets anchors still resolve.
All sibling navigation and overview cards use “LiveStacks on LiveLabs” and “Create a LiveStack”.

Live sources checked on September 25, 2026:

- Retail bundle: https://livelabs.oracle.com/ords/r/dbpm/livelabs/livestack-landing-page?p400_id=41
- Learner dashboard: https://livelabs.oracle.com/ords/r/dbpm/livelabs/my-livestacks
- Retail demo: https://livelabs.oracle.com/ords/r/dbpm/livelabs/view-workshop?wid=4412
- Retail companion workshop: https://livelabs.oracle.com/ords/r/dbpm/livelabs/view-workshop?wid=4414
- Demo scene: https://oracle-livelabs.github.io/livestack/aidatabaseindustrylivestack/retail/workshops/sandbox/?lab=scene-3-retail-command-center

The capture manifest records each source, state, dimensions, UTC time, and limitations.
Raw captures and local QA evidence are under output/screenshots/livestacks-platform-20260925/.
The screenshot API returned JPEG bytes; embedded files use .jpg and the matching MIME type.
Some signed-in screenshots contain the account name and existing progress/subscriptions.
These are local development assets only: recapture with an approved documentation account
or sanitize them before any public release. Nothing was published or uploaded.

Research opened Start menus, Preview Sandbox Instructions, and the read-only Edit dialog.
It did not subscribe/unsubscribe, choose a progress action, reserve resources, or run the app.
The guide therefore distinguishes instruction previews from working environments, subscriptions
from reservations, and progress records from environment lifecycle. Live entry run choices were
inspected, but OCI provisioning and end-to-end execution were not tested.
Do not copy the bundle's Object Storage access URLs: point readers to its current Assets panel.
The displayed Retail workshop duration differs from the bundle total; it is not repeated as
an authoritative estimate in the prose. The catalog inventory is dated, not a fixed product limit.

## Editorial decisions

- Keep the introduction around 370 words with three source visuals.
- Distinguish the full LiveStack from its demo entry.
- Do not promise identical run options, deployment assets, or automatic environments for all entries.
- Explain the business journey before the runtime architecture; label the architecture a reference model.
- Present WMS instructions beside large, uncropped images, not a hidden thumbnail gallery.
- Preserve visibility and published-edit warnings from the public guide.
- Treat a Submitted event and generated event IDs as separate from ready-to-share event codes.
- Name Populate Empty Fields exactly as shown. Review copied workshop descriptions and overrides
  instead of assuming the bundle title makes them correct.
- Match existing Redwood guide tokens, Oracle Sans, bark primary navigation, teal panel accents,
  solid Oracle-red current-page state, and accessible focus treatment.
- Keep source artwork intact; no generated substitute illustrations.

### Shared Redwood banner and guide-wide search

The opening banner on every LiveStack route now uses the same assets/images/color-strip.png
20 px decoration as Quickstart, Cheatsheet, and NoDoc, with their white panel, Oracle Sans,
serif title, and existing palette. Page navigation follows the banner. The overview artwork
remains enlargeable without the removed caption or enlargement hint.

Every page exposes the same search across the introduction, LiveLabs platform guide, WMS
creation guide, and WMS event guide. assets/js/livestack-search.js defines the shared corpus:
the four static HTML pages are fetched once per page visit, on first use, and parsed for their
current sections. There is no second copy of the documentation to maintain. If any guide fails
to load, search reports the failure and offers retry rather than silently searching one page.

Search is case-insensitive, requires all words, and ranks matching section titles first.
Results show the source page, a short excerpt, and a link to the matching section. The q URL
parameter preserves the query across sibling navigation, search-result navigation, reloads,
and bookmarks. Cross-page results restore the query and focus the destination after results
load, so inserting results above the article does not displace the requested section.
Matching details panels open when a result is selected. Clear and Escape remove the query;
Enter focuses the first result. Search uses text nodes, not query-generated HTML.
Documentation remains readable without JS.
The image preview supports captionless artwork without a null-reference error.

## Validation

Run: node --test tests/livestack.test.cjs

The 66 automated checks cover static route content, unique IDs, local links/assets/anchors,
intrinsic image dimensions, no main-menu entry, noindex metadata, and root resolution
for nested routes, index.html URLs, and deployment prefixes (including a route-name collision).
They also check the revised labels, all eight journey chapters, the seven image sources,
retained bookmarks, correct screenshot file encoding, the Redwood strip, removed badges and
artwork caption, and search matching, ranking, excerpts, punctuation, and empty states.
Shared-search checks cover all four source pages, source labels, cross-page concepts,
deployment-prefixed result URLs, incomplete-corpus failures, consistent controls, browser
module initialization, and readable extraction without duplicated nested text.

Browser checks cover desktop and mobile layout, active-page styling, chapter links,
image-preview centering, backdrop blur, Escape dismissal and focus return, and menu toggling.
The Redwood/search pass also checked all four routes: container concepts on the overview,
collapsed troubleshooting on the platform guide, Publish Requested in the author guide,
and capacity in the event guide. Search result selection updates the section hash and
focuses the target; matching details expand. Empty results, Clear, Escape, and Enter were
checked. The captionless overview image still enlarges without console errors. Layouts at
390 px, 1024 px, and the desktop viewport have no horizontal overflow; temporary viewport
overrides were reset after testing.
The shared-search pass verified capacity from the platform guide into the event guide,
publication from the introduction into the author guide, and progress from the author guide
into the platform guide. Query persistence, destination focus, sibling navigation, Back,
no-match results, Clear, Escape, and Enter were checked. Desktop and 390 px search results
retain source labels and have no horizontal overflow.
These are local static/UI checks—not a live event submission, publication approval, or
proof that a deployment package is ready in an OCI tenancy.
