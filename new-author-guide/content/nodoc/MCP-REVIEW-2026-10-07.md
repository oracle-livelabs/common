# NoDoc MCP documentation review — 7 October 2026

## Goal and implementation plan

Update the local author guide from the current Oracle NoDoc MCP reference. Help a first-time Windows author connect Codex, verify access, and complete a supported workflow with a clear result at each step. Leave the result on a local server for review; publication follows the user's review.

1. Compare the Oracle UAT reference, published author guide, and local content. Record feature gaps and source provenance.
2. Rewrite Lab 1 Task 3 as a five-step setup journey: token, user variable, configuration, read-only verification, and versioned usage skill.
3. Rework Lab 8 into a compact capability index and task recipes. Preserve existing task links; add draft review. Explain revision checks, image upload, retained history, OHC metadata, asynchronous pre-publish, and LiveLabs QA.
4. Add original architecture and lifecycle diagrams, actual token-form screenshots, and relevant existing product screenshots. Label explanatory illustrations and older UI companions accurately. Never capture a token.
5. Verify source/asset integrity, existing regression tests, rendered navigation, deep links, search, prompt copying, image expansion, and responsive layouts. Keep live service verification separate from documentation validation.
6. Record results, grade the documentation against a stated rubric, prioritize remaining work, and leave the local preview running.

## Baseline findings

- The published guide and local MCP lab cover the same seven tasks. Setup is compressed into one list without installation visuals or a result after each step.
- The Oracle reference additionally documents `get_nodoc_mcp_usage_skill`, `list_page_drafts`, `approve_page_draft`, `discard_page_draft`, and `run_livelabs_qa`.
- Existing editing guidance conflates merge and reorder requirements and does not explain that merging retains the source page.
- The token form currently labels its action **Generate access token**, shows expiry in UTC, and offers tomorrow through 90 days. Its empty inventory was inspected without creating a credential.
- The Oracle reference and published guide loaded in the browser. The generic web reader could not fetch them; PowerShell HTTPS requests failed certificate validation. No certificate checks were disabled.

## Source and evidence boundaries

- [Oracle NoDoc MCP User Guide](https://docs-uat.us.oracle.com/en/sptest/test-suite/test-product/test-release/nodoc/formal-nodoc-functionalities-and-usage/nodoc-mcp.html): primary source for NoDoc features, retrieved in the browser on 7 October 2026.
- [Published author guide](https://oracle-livelabs.github.io/common/new-author-guide/nodoc/): baseline navigation/content inspected in the browser.
- [NoDoc token form](https://asknodoc.oraclecorp.com/mcp-access-tokens): actual form screenshots; no token generated.
- [OpenAI MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli): cross-check for Codex MCP configuration. NoDoc-specific behavior comes from Oracle.

The Windows environment-variable and config illustrations explain the documented procedure; they are not screenshots of a completed installation. Existing NoDoc UI captures are visual companions, not evidence of a live MCP call in this review.

## Implementation outcome

The local documentation update is ready for review. The Oracle UAT page was used as a reference; that externally hosted page was not edited or published.

| Planned work | Result |
| --- | --- |
| Review sources | Completed. Current Oracle reference, published author guide, token form, and Codex MCP configuration documentation inspected. |
| Rewrite setup | Completed. Five numbered steps, explicit prerequisites, exact configuration, copy controls, verification signals, and skill installation/refresh. |
| Expand features | Completed. Eight task recipes cover browse, creation/reuse, edits/images/order/coauthors, deletion, history, preview/QA/push, troubleshooting, and draft decisions. OHC metadata is a secondary reference. |
| Add visuals | Completed within available evidence. Two new real token-form screenshots, four original diagrams, and two labeled existing draft UI screenshots. Actual Windows dialogs and successful MCP responses remain future capture work. |
| Test as a reader | Completed locally. Desktop and phone-width walkthrough, navigation, search, reload, keyboard image controls, and layout inspected. Credential creation and authenticated MCP execution were not performed. |
| Assess and hand off | Completed. Findings and grade below; server left on loopback for the user's review. No deployment. |

The existing core recipes in Lab 8 Tasks 1–5 decreased from **897 to 817 words (about 9%)** using a consistent visible-text token count. The full lab grew from **1,379 to 2,062 words** because it now includes draft review, QA, a workflow selector, visual captions, and fuller OHC/troubleshooting coverage. This is a shorter core path with a broader reference, not a claim that the entire page became shorter. Commands and labels are included in these counts.

Two usability problems found during the walkthrough were repaired centrally: asynchronously loaded NoDoc figures now receive keyboard-accessible zoom controls, and the image viewer keeps its caption within the dialog while allowing the image area to scroll.

## Validation evidence

| Evidence class | Result | Scope and limitation |
| --- | --- | --- |
| Existing automated regression suite | **66 passed, 0 failed** | `node --test tests/livestack.test.cjs`; covers the existing shared guide contracts. It is not a NoDoc service test. |
| Static documentation validation | **13 passed, 0 failed** | Balanced HTML; unique IDs; all 100 NoDoc image references/alternatives; 15 copy targets; 29 in-content deep links; TOML parse; four accessible SVGs; critical feature coverage; preserved task routes. Script/results are in local output. |
| JavaScript syntax and patch hygiene | Passed | Both changed scripts pass `node --check`; `git diff --check` reports no whitespace errors. |
| Rendered browser checks | **21 passed, 1 partial, 0 failed** | All eight MCP task links, workflow card, browser Back, reload, search, open/close all, image Enter/Escape behavior, caption visibility, and 390px layout checked. No console errors observed. |
| Clipboard | Partial | Copy shows “Copied,” and the exact configuration text parses as TOML. The automation's virtual clipboard cannot read native page clipboard writes, so actual paste fidelity still needs a manual check. |
| Local preview | HTTP 200 and rendered | `http://127.0.0.1:4190/nodoc/`; loopback only. HTTP success is reported separately from rendered checks. |
| Live NoDoc | Form only | Token page rendered and accepted an unsaved sample label. No credential generated, no NoDoc content mutated, and no MCP success claimed. |

Browser evidence uses a 1280 × 720 desktop viewport and a temporary 390 × 844 phone viewport. The phone override was reset after testing. The source/token screenshots are full-page captures at 1264 × 801 pixels.

The user journey was simulated by the authoring agent; this is not an independent usability study or a clean-machine installation test.

Local evidence:

- `output/nodoc-mcp-review-2026-10-07/static-validation.json`
- `output/nodoc-mcp-review-2026-10-07/browser-validation.json`
- `output/nodoc-mcp-review-2026-10-07/regression-tests.txt`
- `output/nodoc-mcp-review-2026-10-07/oracle-source.txt`
- `output/screenshots/nodoc-mcp-2026-10-07/manifest.md`

## Documentation grade

**86/100 — B: ready for local review; live installation evidence remains incomplete.** This is an editorial self-assessment, not an independently certified score. Scale: A = 90–100, B = 80–89, C = 70–79, D = below 70.

| Criterion | Score | Reason |
| --- | ---: | --- |
| Source accuracy | 23/25 | Current source-backed behavior; clear revision, authorization, draft, history, and push boundaries. No independent service execution. |
| Feature coverage | 19/20 | New skill, draft, and QA features included alongside existing capabilities. Version-specific response examples would make the reference stronger. |
| Clarity and navigation | 17/20 | Action index, shorter core recipes, preserved links, numbered setup, and outcome checks. Setup still involves a long scroll; an approved corporate Codex-install prerequisite link would help. |
| Visual guidance | 12/15 | Six new visuals plus two relevant companions. Windows dialogs and MCP success are illustrated/described rather than newly captured. |
| Validation and usability evidence | 10/15 | Static and rendered checks pass. Manual paste, clean-machine setup, and authenticated workflows remain unverified. |
| Maintainability | 5/5 | Shared renderer fix, source traceability, visual manifest, date, existing task URLs, and explicit follow-up list. |
| **Total** | **86/100** | |

## Task performance assessment

The strongest result is coverage with clear decision points: authors can reach setup or a specific workflow directly and distinguish a configured connection, an authorized read, a ready preview, completed QA, and an approved push. Draft approval's effect on all pending drafts is explicit. The first five recipes are measurably shorter, and existing task URLs remain valid.

The implementation stayed scoped to the NoDoc guide and shared image behavior. Unrelated QA Hub changes were preserved. Source-access failures were resolved through browser reading without disabling certificate checks. No package installation or external publication was needed.

The main shortfall is end-to-end evidence. Form inspection, a correct config snippet, and browser tests cannot prove a new author can finish authenticated setup. The clipboard tooling limitation also prevents a full paste assertion. These limits are reflected in the grade instead of being counted as passing live tests.

## Improvements and next steps, after user review

1. **First priority — clean Windows installation pilot.** Follow the five steps with an approved test identity, verify a direct read and installed skill version, and capture the actual user-variable dialog, configuration, and successful read with all secret values excluded. Add the approved corporate Codex installation link.
2. **First priority — authenticated practice workflow.** On a designated practice article, verify draft listing/approval/discard semantics, image insertion, a revision conflict, and a ready preview followed by QA. Capture real response/status examples. Keep push a separate reviewed action.
3. **Second priority — manual clipboard and novice-reader check.** Paste the config into a scratch editor and parse it; ask a first-time reader to follow setup without assistance. Record where they hesitate and how long tasks take before claiming a usability improvement.
4. **Second priority — screenshot refresh.** Replace or supplement the older draft UI companions with current screenshots and add a real QA findings example. Keep dates, feature/skill version, and secret-redaction boundaries in the manifest.
5. **Then reconcile and publish.** Apply the user's review, confirm the intended public/internal audience for Oracle UAT references and screenshots, and prepare the approved publication change. The Oracle-hosted reference requires its own publishing workflow; this local update does not modify it.

## Local review

- [MCP workflow index](http://127.0.0.1:4190/nodoc/#nodoc:8)
- [Five-step connection setup](http://127.0.0.1:4190/nodoc/#nodoc:1:3)
- [Draft review](http://127.0.0.1:4190/nodoc/#nodoc:8:8)
- [Preview and QA](http://127.0.0.1:4190/nodoc/#nodoc:8:6)

Server command from the guide root: `python -m http.server 4190 --bind 127.0.0.1`. The foreground server session is left running for review. No files are committed or pushed by this task.

## Architecture refinement after visual review

Replaced the crossing-arrow architecture with a numbered Codex → NoDoc MCP → content flow. Separate return arrows now show results passing back through MCP. Local configuration, the Windows token variable, and the skill have distinct roles. The wording states that the token identifies the user and does not extend permissions.

The wide and compact illustrations use the guide's Oracle Sans fonts, warm neutrals, teal connectors, and Redwood red step markers. Icons, short text blocks, and separate local/NoDoc regions establish hierarchy. A responsive picture selects the vertical version at widths up to 900 pixels; the shared image viewer expands the selected version.

Validation: 66 existing regression tests passed after the shared renderer changes; all 14 static checks passed. Rendered geometry checks on both SVGs found no text overflow, text collisions, icon collisions, or connector/text intersections. Browser review covered the wide guide at 1280 × 720, the 641 × 579 review panel, and a 390 × 844 mobile viewport. The correct responsive source loaded, captions remained visible, and no horizontal page overflow occurred. The final mobile test logged no browser errors or warnings. Small phone screens still benefit from browser zoom for fine print.

Evidence: `output/nodoc-mcp-review-2026-10-07/architecture-geometry-checks.json`, `refined-regression.txt`, `refined-validation.txt`, and `output/screenshots/nodoc-architecture-refined/`. The current diagram generator is `output/nodoc-mcp-review-2026-10-07/refine-architecture.cjs`; the earlier diagram generator predates this visual revision.

Assessment: the requested visual and logical corrections are complete and locally verified. This refinement improves hierarchy and removes crossing routes; it does not change the overall 86/100 documentation grade because the remaining clean-installation and authenticated-workflow evidence gaps are unchanged.

## Separate manual draft review from Codex MCP

The manual workflow is consolidated in Lab 3, Task 2, next to draft creation. Its Draft Version and Difference Viewer screenshots remain there; duplicate copies are removed from Lab 8. The UI task now separates creation from review, verifies the saved outcome, and distinguishes rejecting one difference from discarding a whole draft. No unsupported whole-draft Discard button is invented from the per-change red X.

Lab 8, Task 8 is rewritten as a Codex chat workflow: retrieve and compare existing drafts, explicitly approve or discard one reviewed draft, then verify the saved state through fresh MCP reads. It includes three copyable prompts, expected results, approval/discard effects, prerequisites, and an expandable tool reference. The author decides in chat; Codex handles the MCP calls without requiring NoDoc browser actions. Both tasks link to each other and retain their existing task URLs.

The Oracle MCP guide's draft section was reread in the browser on 7 October 2026. It confirms role restrictions, pagination, bounded HTML differences, draft confirmation IDs, approval revision checks, approval marking all pending page drafts REVIEWED, and discard retaining the selected draft for audit. Evidence is saved locally in `output/nodoc-mcp-review-2026-10-07/draft-reference-2026-10-07.txt`. This remains documentation and local UI validation; no live draft was approved or discarded.

Validation for this separation: all 14 static checks passed, including markup, IDs, copy targets, assets, and task links. Browser checks confirmed three prompt blocks and no UI screenshots in the MCP task, five loaded screenshots in the manual task, an expandable MCP reference, cross-navigation by keyboard and native click, no horizontal overflow at 390 pixels, and no browser errors. Copy feedback displayed success, but the tooling's clipboard read-back did not match the prompt, so manual paste verification remains open. Evidence: `draft-workflow-validation.txt`, `draft-workflow-browser-checks.json`, and `output/screenshots/nodoc-draft-separation/`. No application JavaScript or CSS changed in this follow-up.
