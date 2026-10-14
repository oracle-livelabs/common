// Quick answers distilled from content/nodoc/nodoc-workshop.html.
// Keep source lab/task references and workflow boundaries aligned with that guide.
(function (root) {
  "use strict";

  var topics = [
    ["access", "Access & navigation"],
    ["creation", "Articles & pages"],
    ["editing", "Editing & metadata"],
    ["drafts", "Draft review"],
    ["history", "Versions & recovery"],
    ["collaboration", "Collaboration"],
    ["orahub", "OraHub exchange"],
    ["vibe", "Vibe Doc-ing"],
    ["ask", "Ingestion & Ask NoDoc"],
    ["mcp", "Codex MCP"],
    ["publishing", "Pre Publish & QA"]
  ].map(function (topic) { return { tag: "nodoc-" + topic[0], label: topic[1] }; });

  var cards = [
    {
      id: "overview", title: "Understand the NoDoc authoring workflow", topic: "access", source: [0],
      short: "Use NoDoc to create, organize, review, improve, and prepare technical content for LiveLabs.",
      steps: ["Start in the LiveLabs Focus Area, create an article and version, and build focused pages.", "Edit and review content with drafts, comments, versions, and validation tools.", "Ingest approved content when it should be available to Ask NoDoc.", "Prepare and review LiveLabs output through Pre Publish, complete QA, then use the separate WMS publishing request."],
      checkpoints: ["NoDoc is an Oracle APEX documentation workbench. Its content hierarchy and selected version keep the authoring target clear."],
      watchFor: ["NoDoc Pre Publish and WMS publishing are separate stages of the author journey."],
      keywords: ["what is NoDoc", "overview", "Oracle APEX", "documentation workbench", "author journey"]
    },
    {
      id: "access", title: "Sign in and confirm access", topic: "access", source: [1, 1],
      short: "Open NoDoc with Oracle SSO and confirm access to the content you need.",
      steps: ["Open https://nodoc.oraclecorp.com/ and sign in with Oracle SSO.", "Choose the NoDoc application, then select the LiveLabs Focus Area.", "Use an approved practice article or page set that your identity can view or change."],
      checkpoints: ["The NoDoc platform opens for your account. Oracle SSO is the access prerequisite; LiveLabs authoring does not require a contributor role."],
      watchFor: ["A successful sign-in does not grant access to every article or action."],
      keywords: ["login", "SSO", "permissions", "contributor role"]
    },
    {
      id: "hierarchy", title: "Find the right article, version, and page", topic: "access", source: [1, 2],
      short: "Follow the workspace hierarchy before editing, reviewing history, or preparing output.",
      steps: ["Select the Focus Area and read its LiveLabs repo table of contents. Use Open All or Close All to inspect the tree.", "Expand the article, then its version when one is displayed, and select the page.", "Keep the complete target with your work: Focus Area → LiveLabs repo → Article → Article version (if shown) → Page."],
      checkpoints: ["An article is the parent of its pages. A page is the item you read, edit, comment on, or draft.", "Here, LiveLabs repo means the NoDoc workspace content location."],
      watchFor: ["Similarly named pages can belong to different articles or versions. Do not invent a version that the tree does not display."],
      keywords: ["navigation", "scope", "tree", "workspace", "table of contents"]
    },
    {
      id: "article-create", title: "Create an article from scratch", topic: "creation", source: [2, 1],
      short: "Create the article and content version before adding its pages.",
      steps: ["In the LiveLabs repo, select + beside the selected Focus Area and choose Article.", "Enter a concise Article Name and the agreed Version Number.", "Choose Create From Scratch, select Create, and confirm the article and version in the intended Focus Area."],
      checkpoints: ["The version follows the Focus Area's content naming convention."],
      watchFor: ["A content version is not necessarily a product release number."],
      keywords: ["new article", "empty article", "create from scratch"]
    },
    {
      id: "article-codex", title: "Draft an article with Codex", topic: "creation", source: [2, 1],
      short: "Prepare a workshop brief and skill plan for the in-product Codex creation route.",
      steps: ["Choose Codex in the article creation dialog. Plan the required livelabs-workshop-author skill and any optional skills with their resources.", "Use the guide's Workshop Prompt Builder to describe the idea, scope, approved sources, and review constraints.", "Copy the prompt into NoDoc Codex and select only skills available in that UI.", "Review the generated pages and every [VERIFY: ...] item before adding the article."],
      checkpoints: ["The draft follows the requested scope and approved sources; unresolved facts remain visible for review."],
      watchFor: ["The guide's prompt builder only prepares text locally. It does not run Codex, verify source URLs, or create NoDoc content."],
      keywords: ["workshop prompt builder", "skills", "AI", "first draft"]
    },
    {
      id: "article-import", title: "Import a published LiveLabs workshop", topic: "creation", source: [2, 1],
      short: "Use an approved published workshop URL as the starting point for an article.",
      steps: ["Confirm the workshop owner has approved the source for reuse.", "Choose Import LiveLabs URL, paste the published workshop URL, and select Import.", "Review the resulting article, page order, metadata, links, code, and images."],
      checkpoints: ["The imported workshop is suitable for the new article and has been reviewed."],
      watchFor: ["Successful import does not verify the technical accuracy or currency of the source."],
      keywords: ["import LiveLabs URL", "published workshop", "migration"]
    },
    {
      id: "article-reuse", title: "Reuse an existing article", topic: "creation", source: [2, 1],
      short: "Choose an approved article and inspect the resulting identity and edit state.",
      steps: ["Choose Reuse Article and select the approved source article.", "Select Reuse, then verify the resulting title, version, page order, and metadata.", "Confirm editing permissions and the resulting content's relationship to its source before changing it."],
      checkpoints: ["The reused article is the intended foundation for the new workshop."],
      watchFor: ["Do not assume reuse creates an independent writable copy."],
      keywords: ["reuse article", "source", "read only"]
    },
    {
      id: "page-empty", title: "Add a blank page under the right parent", topic: "creation", source: [2, 2],
      short: "Use Empty File for a new page and choose its place in the article tree.",
      steps: ["Select + beside the article for a top-level page, or beside a page for an intended child page.", "Choose Page, select Empty File, and enter a descriptive Page Name.", "Select Enter and confirm the new page appears under the intended parent."],
      checkpoints: ["The page name and tree position match the workshop structure."],
      watchFor: ["Selecting the wrong + control can place a page under the wrong parent."],
      keywords: ["empty file", "add page", "child page", "hierarchy"]
    },
    {
      id: "page-orahub", title: "Create a page from OraHub", topic: "creation", source: [2, 2],
      short: "Import an approved repository page into a newly named NoDoc page.",
      steps: ["Open Add Page at the intended parent and choose Import From OraHub.", "Select the branch, Focus Area, article, and source page; enter the new Page Name.", "Select Enter, then review the imported content, links, and images."],
      checkpoints: ["The new page uses the approved branch and source content."],
      watchFor: ["The From OraHub action on an existing page follows a separate overwrite workflow."],
      keywords: ["import from OraHub", "repository", "branch"]
    },
    {
      id: "page-reuse", title: "Reuse page content", topic: "creation", source: [2, 2],
      short: "Select approved content from an existing Focus Area, version, and page.",
      steps: ["At the intended parent, open Add Page and choose Reuse Content.", "Select the Focus Area, source version, and source page.", "Select Enter, then confirm the resulting content and edit state."],
      checkpoints: ["The selected source and version are appropriate for the destination."],
      watchFor: ["Inspect the edit state before making changes; reused content may remain linked to its source."],
      keywords: ["reuse content", "reference", "source page"]
    },
    {
      id: "page-upload", title: "Create a page from a PDF or URL", topic: "creation", source: [2, 2],
      short: "Convert an approved file or URL and review the result before adding the page.",
      steps: ["Choose Upload PDF/URL in the Add Page dialog.", "Use the available upload option, add the approved source, and enter a Page Name.", "Inspect the converted content before selecting Enter."],
      checkpoints: ["The conversion preserves the content needed for this page."],
      watchFor: ["Review converted content before treating it as ready for learners."],
      keywords: ["upload PDF", "URL", "conversion", "file import"]
    },
    {
      id: "architecture", title: "Create an architecture diagram", topic: "creation", source: [2, 2],
      short: "Generate and review a Mermaid diagram based on the documented workshop architecture.",
      steps: ["Choose Architecture Diagram, enter a title, and describe the approved components, services, data flows, and relationships.", "Open Vibe Drawing → Use AI, enter the focused prompt, and select Go.", "Inspect both Mermaid Code and the New diagram preview before selecting Enter.", "Open the new page, revise the diagram or surrounding text as needed, and select Save & Check In."],
      checkpoints: ["Labels, connections, direction, and scope match the workshop or lab."],
      watchFor: ["Enter is unavailable until a diagram is generated. The guide's local prompt helper does not generate Mermaid or call an AI service."],
      keywords: ["architecture diagram", "Mermaid", "Vibe Drawing", "diagram prompt builder"]
    },
    {
      id: "page-codex", title: "Draft a page with Codex Skills", topic: "creation", source: [2, 2],
      short: "Use a page-specific prompt and approved skills to create a focused first draft.",
      steps: ["Choose Codex Skills and supply the page name, purpose, approved content summary, and requested outcome.", "Use the guide's page prompt builder with the required authoring skill and approved resources for each selected skill.", "Copy the prompt into Enter Your Prompt, confirm the selected skills, and select Create Content.", "Review the generated content before selecting Enter."],
      checkpoints: ["The output addresses this page's purpose and preserves technical-review items."],
      watchFor: ["The local builder prepares a prompt; it does not create a page in NoDoc."],
      keywords: ["page prompt builder", "Codex Skills", "AI", "first draft"]
    },
    {
      id: "delete-ui", title: "Delete an article or page in NoDoc", topic: "creation", source: [2, 3],
      short: "Verify ownership and the exact selected content before using the trash control.",
      steps: ["Confirm that you own the article or page and that deletion is authorized.", "Select the exact item in the table of contents and choose the trash bin icon.", "Read the confirmation dialog, verify the target, then select OK and check the remaining tree."],
      checkpoints: ["Only the authorized target is removed."],
      watchFor: ["If the selected article is the last article, cancel unless deletion of the whole Focus Area is explicitly approved."],
      keywords: ["delete", "trash", "remove article", "remove page"]
    },
    {
      id: "autosave", title: "Control Autosave and save state", topic: "editing", source: [3, 1],
      short: "Choose automatic saving and verify the saved state before leaving a page.",
      steps: ["Use the page toolbar's Autosave toggle to turn automatic progress saves ON or OFF.", "With Autosave ON, the documented UI saves every two minutes; OFF disables automatic saves.", "Confirm the saved state before leaving. Owners use Save for the original; non-owners use Save Draft for review."],
      checkpoints: ["The selected save action matches your ownership and intended result."],
      watchFor: ["A visible edit is not proof that the original or draft was saved."],
      keywords: ["autosave", "two minutes", "save draft", "save progress"]
    },
    {
      id: "structured-editing", title: "Edit and check in structured content", topic: "editing", source: [3, 4],
      short: "Use the editor for learner tasks, code, media, tabs, quizzes, and Markdown source.",
      steps: ["Select the page and choose Edit; confirm the toolbar and Save & Check In are visible.", "Build the introduction, objectives, prerequisites, headings, and numbered learner tasks.", "Use code blocks or inline code for runnable details; use tabs, quizzes, notes, tables, lists, links, and approved media where needed. MD Source exposes the Markdown.", "Select Save & Check In, then inspect the rendered content, links, images, alt text, and page position."],
      checkpoints: ["The saved page is readable and the rendered result matches the intended structure."],
      watchFor: ["Check nesting after Indent/Outdent and review links and media after editing."],
      keywords: ["editor", "rich text", "Markdown", "MD Source", "code block", "tabs", "quiz", "Save & Check In"]
    },
    {
      id: "metadata", title: "Apply page metadata", topic: "editing", source: [3, 3],
      short: "Use controlled page labels for organization, filtering, ingestion, and discovery.",
      steps: ["Place metadata at the top of the page using approved Focus Area values.", "Check Product, ReleaseVersion, ReleaseDeprecation, Platform, Licensing, CodeLanguage, TopicType, Language, and Location as applicable.", "Use info-map-feature-number and info-map-label for Information Map order and display labels.", "Recheck metadata after a rename or move."],
      checkpoints: ["TopicType reflects learner intent, such as GetStarted, Concept, SetupInstall, Diagnose, Reference, or Reuse.", "Location identifies the canonical published location when one exists."],
      watchFor: ["Use approved values rather than inventing labels. Metadata and in-page filter tags serve different purposes."],
      keywords: ["metadata tags", "Product", "ReleaseVersion", "ReleaseDeprecation", "Licensing", "CodeLanguage", "TopicType", "info-map"]
    },
    {
      id: "filter-tags", title: "Use in-page filter tags", topic: "editing", source: [3, 3],
      short: "Use filter tags only for intentional, approved variants within a page.",
      steps: ["Identify the approved platform, language, product, license, or version variant.", "Wrap the variant's content in its matching BEGIN and END filter markers, as in the documented Linux example below.", "Keep page metadata at the top of the page and preserve the filter markers when editing."],
      checkpoints: ["Each variant has a clear purpose and the filter markers remain intact."],
      watchFor: ["In-page filter tags are not page metadata or the cheatsheet's navigation tags."],
      keywords: ["filter tags", "conditional content", "variants", "markers"],
      snippetTitle: "Linux content variant", snippetMeta: "Documented NoDoc filter-tag example",
      snippet: "@@@LINUX-BEGIN\nLinux-specific instructions.\n@@@LINUX-END"
    },
    {
      id: "draft-create", title: "Create a page draft in the browser", topic: "drafts", source: [3, 2],
      short: "Propose edits to another author's page while keeping the original unchanged until approval.",
      steps: ["Select the page, choose Edit, and verify the prompt to create or continue a draft.", "Confirm the Edit Draft window, original topic, draft topic, and warning about the original page.", "Make the proposed edits, select Save Draft, and check for Draft Saved Successfully."],
      checkpoints: ["The proposal is saved as a draft for the exact page and version."],
      watchFor: ["Saving a draft does not apply it to the original page."],
      keywords: ["manual draft", "browser", "Edit Draft", "Save Draft", "non-owner"]
    },
    {
      id: "draft-review-ui", title: "Review draft changes in the browser", topic: "drafts", source: [3, 2],
      short: "Use Drafts and View Diff to accept or reject individual changes before approval.",
      steps: ["As an authorized reviewer, select the article, page, and version; open Drafts and inspect the draft details.", "Choose View Diff. Compare original content on the left with the draft on the right using Prev Change and Next Change.", "Accept a difference with the green check or reject it with the red X; select Approve after completing the review.", "Reopen the page and draft history to confirm accepted content and the updated status."],
      checkpoints: ["The live NoDoc page contains the accepted changes. Publishing remains a separate workflow."],
      watchFor: ["The red X rejects one difference. Whole-draft discard is documented in the Codex MCP workflow."],
      keywords: ["manual draft review", "Draft Difference Viewer", "approve", "reject", "View Diff"]
    },
    {
      id: "draft-review-mcp", title: "Approve or discard drafts through MCP", topic: "drafts", also: ["mcp"], source: [8, 8],
      short: "Review draft HTML diffs in Codex, choose one draft, and verify the action through MCP.",
      steps: ["Resolve the exact Focus Area, article, page, and version. Ask Codex to list all drafts with list_page_drafts, following next_offset until null.", "Review the returned draft IDs, details, and bounded HTML diffs against the live page.", "Explicitly choose Approve or Discard for one returned draft ID. If the live revision changed, review a fresh comparison first.", "Have Codex list drafts again and fetch the live page to verify the result."],
      checkpoints: ["Approval applies the selected draft and marks all pending drafts for that page REVIEWED.", "Discard marks only the selected draft REVIEWED, retains it for audit, and leaves the live page and other pending drafts unchanged."],
      watchFor: ["MCP acts on a whole draft; browser per-change acceptance is a separate flow.", "LiveLabs draft review requires an administrator, Focus Area owner, or article author/coauthor. Other content requires an Author of the selected page."],
      keywords: ["Codex draft approval", "list_page_drafts", "approve_page_draft", "discard_page_draft", "HTML diff", "current_last_updated"]
    },
    {
      id: "article-versions", title: "Create or restore an article version", topic: "history", source: [4, 1],
      short: "Create a content snapshot before substantial edits and verify any version you restore.",
      steps: ["As the article owner, select the article, choose Create Version, and enter the agreed version label.", "Select Create Version and confirm the new version appears under the article before editing it.", "When recovery is needed, choose Restore Article Version, select the exact version, verify it, and then select Restore."],
      checkpoints: ["The intended content version is available and selected."],
      watchFor: ["Verify the article and target version before restoring content."],
      keywords: ["create version", "snapshot", "restore article version"]
    },
    {
      id: "page-history", title: "Compare or restore page history", topic: "history", source: [2, 4],
      short: "Inspect retained snapshots for one page before making historical content current.",
      steps: ["Select the individual page, open History, and confirm its Focus Area, article version, and page name.", "In Compare History, choose older base and newer target snapshots, then read the Markdown comparison.", "In Preview and Restore, choose a retained history point and Preview it.", "If restoration is approved, enter a Restore Reason, select Restore History, confirm, and verify the current page."],
      checkpoints: ["The restored historical content becomes the current state for that page and article version."],
      watchFor: ["Page-level history does not restore deleted pages or change sibling pages. MCP history tools provide read-only comparisons."],
      keywords: ["compare history", "retained snapshot", "Preview and Restore", "Restore History"]
    },
    {
      id: "restore-deleted-page", title: "Restore a deleted page", topic: "history", source: [2, 4],
      short: "Use article-level History to find and recover a deleted child page.",
      steps: ["Select the article, choose History, and confirm the Focus Area, article, and version.", "Open Restore Deleted pages and review the exact deleted-page row. Use Preview when needed.", "Enter a clear reason, select Restore Deleted Page, and confirm the dialog.", "Check that the page returns to the intended article version and page order."],
      checkpoints: ["The intended deleted page is restored in the correct location."],
      watchFor: ["Use the article's History dialog for this action; an individual page's retained-version view has a different scope."],
      keywords: ["recover deleted pages", "Restore Deleted Page", "article history"]
    },
    {
      id: "coauthors", title: "Manage article co-authors", topic: "collaboration", source: [4, 2],
      short: "Review and change collaboration access for an article you own.",
      steps: ["Open your article and choose Manage Co-Authors.", "Review the current list before selecting Add Coauthor for approved access.", "Select Remove Coauthor only when that person's access should end."],
      checkpoints: ["The co-author list reflects the approved collaborators."],
      watchFor: ["Only the owner can change co-author access in this documented UI workflow."],
      keywords: ["coauthor", "co-author", "permissions", "owner", "access"]
    },
    {
      id: "comments", title: "Add and manage anchored comments", topic: "collaboration", source: [4, 3],
      short: "Attach feedback to exact page text and return to it for discussion.",
      steps: ["In edit mode, select the relevant text and choose Comment.", "Enter concise feedback and the required Comment Email, then select Save Comment.", "Confirm the saved message and highlighted text. Use My Comments, Show All Comments, or the highlighted passage to reopen the discussion.", "Use Copy URL to share the location, Reply to respond, or Close Comment to return to the page."],
      checkpoints: ["The feedback remains attached to the intended passage."],
      watchFor: ["Delete a comment only when you own it and your role permits the action."],
      keywords: ["comment", "feedback", "highlight", "reply", "Copy URL"]
    },
    {
      id: "orahub-load", title: "Load OraHub content into a selected page", topic: "orahub", source: [5, 1],
      short: "Use From OraHub for an empty or existing page after checking the overwrite target.",
      steps: ["Select the target page and choose From OraHub in the upper action row.", "Choose the approved branch, Focus Area, folder, and file.", "Review the loaded Markdown and retain a recoverable copy or version before replacement.", "Select Overwrite Changes only when replacing that exact page is approved."],
      checkpoints: ["The loaded source and overwrite destination are correct."],
      watchFor: ["For a newly created page, use Add Page → Import From OraHub instead."],
      keywords: ["From OraHub", "overwrite changes", "import", "branch", "repository"]
    },
    {
      id: "orahub-export", title: "Export reviewed content to OraHub", topic: "orahub", source: [5, 2],
      short: "Choose the content scope and approved repository destination before exporting.",
      steps: ["Review and validate the selected content, then choose To OraHub.", "Choose Merged Content for a first article page, Page Only for one page, or Whole Article for the full article.", "Download the Markdown or select the approved branch and choose Upload to OraHub.", "Verify the scope and destination before confirming the export."],
      checkpoints: ["The export contains the intended content at the approved destination."],
      watchFor: ["OraHub exchange is a separate workflow from the standard NoDoc-to-WMS publishing route."],
      keywords: ["To OraHub", "export", "upload", "Merged Content", "Page Only", "Whole Article"]
    },
    {
      id: "vibe-standards", title: "Review writing with Apply Standards", topic: "vibe", source: [6, 1],
      short: "Run the built-in documentation review and inspect its proposed changes.",
      steps: ["Open Vibe Doc-ing from the upper action row on the correct saved page.", "Select Apply Standards, read the displayed prompt, and select Go.", "Inspect the output's headings, links, images, code, metadata, and technical meaning.", "Open Difference; use Overwrite New and save only after accepting the reviewed result."],
      checkpoints: ["Accepted changes fit the writing review and preserve technical content."],
      watchFor: ["Vibe Doc-ing output is a proposal. If the comparison is unsuitable, narrow the review or correct the source and run it again."],
      keywords: ["Apply Standards", "Vibe Doc-ing", "Output", "Difference", "Overwrite New"]
    },
    {
      id: "vibe-persona", title: "Choose a Vibe Doc-ing persona", topic: "vibe", source: [6, 1],
      short: "Use a persona for a defined audience or for LiveLabs Markdown and text checks.",
      steps: ["Open Vibe Doc-ing → Persona Prompt on the selected page.", "Choose LiveLabs-Markdown Check for structure, links, images, and Markdown, or LiveLabs-Text Check for prose and text standards.", "Select Go, inspect Output, then open Difference.", "Save or overwrite only the accepted result and record the persona when review evidence is required."],
      checkpoints: ["The chosen persona made only relevant, reviewed changes."],
      watchFor: ["Keep the original unchanged until comparison is complete."],
      keywords: ["Persona Prompt", "LiveLabs-Markdown Check", "LiveLabs-Text Check", "review"]
    },
    {
      id: "vibe-custom", title: "Write a focused Custom Prompt", topic: "vibe", source: [6, 1],
      short: "Define the exact correction, preserved content, and expected result for a custom review.",
      steps: ["Choose Custom Prompt and name the target, allowed change, content to preserve, and expected result.", "Use the guide's local builder with Focused for a narrow correction or Comprehensive for the selected checks across the page.", "Select Go in NoDoc and review Output for scope and accuracy.", "Open Difference, confirm preservation of unrelated content, and use Overwrite New only after review."],
      checkpoints: ["The accepted result follows the original instruction and protects technical details, metadata, and markers."],
      watchFor: ["The guide's builder only creates a prompt template; it does not submit a review to NoDoc."],
      keywords: ["Custom Prompt", "Focused", "Comprehensive", "prompt template", "technical fidelity"]
    },
    {
      id: "vibe-wordlist", title: "Apply the approved Word-Checklist", topic: "vibe", source: [6, 1],
      short: "Review terminology replacements while preserving all non-target content.",
      steps: ["Select Vibe Doc-ing → Word-Checklist and choose Checklist.", "Review the check-wordlist replacements against the approved Oracle word list.", "Open Difference and verify technical terms, formatting, links, code, and other content.", "Accept only suitable replacements; reject the proposal or correct the source when context requires it."],
      checkpoints: ["Only banned, discouraged, or insensitive terms in the approved replacement scope change."],
      watchFor: ["Terminology review must preserve all non-target content exactly."],
      keywords: ["Word-Checklist", "check-wordlist", "Oracle word list", "terminology"]
    },
    {
      id: "information-map", title: "Generate the Information Map", topic: "vibe", source: [6, 2],
      short: "Summarize completed workshop content at article level for SEO and AI search discovery.",
      steps: ["Save the completed pages and accepted corrections, then select the article and version.", "Enter Edit mode to load the workshop lab titles and content and enable Generate Information Map.", "Generate the map and review lab names and coverage; correct the source and regenerate if needed.", "Select Save & Check In and confirm completion before ingestion or Pre Publish."],
      checkpoints: ["The saved Information Map accurately covers the completed workshop."],
      watchFor: ["The generation control is disabled before entering edit mode."],
      keywords: ["Information Map", "SEO", "AI search", "Generate Information Map"]
    },
    {
      id: "ingest", title: "Ingest approved content for retrieval", topic: "ask", source: [7, 1],
      short: "Make the selected saved page or article available to Ask NoDoc.",
      steps: ["As the owner, confirm the exact page or article is saved, reviewed, and approved for retrieval.", "Select Ingest in the upper action row. NoDoc chunks and vectorizes that content.", "Wait for completion and the success message, then record scope and timestamp.", "Ask a focused question the ingested content should answer."],
      checkpoints: ["Ingestion completed for the intended content and version."],
      watchFor: ["New article versions are not automatically added to retrieval; ingest them when ready.", "Do not ingest confidential or unapproved content, or repeatedly broaden and retry ingestion without checking the cause."],
      keywords: ["ingestion", "chunks", "vectorize", "retrieval", "refresh"]
    },
    {
      id: "ask-workshop", title: "Ask about the selected workshop", topic: "ask", source: [7, 2],
      short: "Open Ask No Doc from the action row to keep the selected article and version in context.",
      steps: ["Confirm ingestion completed, then choose Ask No Doc in the upper action row.", "Check that the assistant heading identifies the selected article and version.", "Ask one focused question and inspect the answer and its source or link context.", "Tighten the question or verify ingestion if the result mixes unintended articles or versions."],
      checkpoints: ["The answer is grounded in the selected workshop's content."],
      watchFor: ["An example answer in a guide screenshot is not source content for your workshop."],
      keywords: ["Ask No Doc", "selected workshop", "article chat", "citations"]
    },
    {
      id: "ask-focus", title: "Set Focus Area chat context", topic: "ask", source: [7, 3],
      short: "Use the separate chat launcher and narrow its Focus before asking a question.",
      steps: ["Open the bottom-right chat launcher and confirm the Focus Area mode heading.", "Open Focus, select NoDoc, and choose the intended Focus Area and article.", "Keep NODOC Without Filters off unless a broad collection search is intentional.", "Ask the question, inspect citations, and record the selected scope. Clear filters or selected articles before an unrelated question."],
      checkpoints: ["The heading and cited sources reflect the intended Focus Area and article."],
      watchFor: ["The bottom-right chat has a broader context than the selected-workshop action-row entry."],
      keywords: ["Focus Area chat", "NODOC Without Filters", "context", "chat launcher"]
    },
    {
      id: "mcp-setup", title: "Connect Codex to NoDoc MCP", topic: "mcp", source: [1, 3],
      short: "Configure a personal access token, Windows user variable, and one NoDoc server entry.",
      steps: ["Open NoDoc MCP Access Tokens from the guide, choose a recognizable label and expiry, and generate a token. Copy it immediately; it is shown once.", "Save it privately in the Windows user variable ASK_NODOC_MCP_TOKEN.", "Add or update one [mcp_servers.nodoc] section in C:\\Users\\<username>\\.codex\\config.toml using the snippet below.", "Fully restart Codex, open a new chat, and make a direct read-only list_focus_areas call.", "After access works, install or refresh the nodoc-mcp usage skill."],
      checkpoints: ["A direct MCP call returns an authorized NoDoc result. The config names the environment variable and contains no secret value."],
      watchFor: ["Never paste the token into chat, source control, email, screenshots, or diagnostic output.", "Configured tools alone do not prove access. An empty authorized result needs an access check before authoring."],
      keywords: ["MCP installation", "setup", "connect", "personal token", "ASK_NODOC_MCP_TOKEN", "config.toml", "list_focus_areas"],
      snippetTitle: "NoDoc MCP configuration", snippetMeta: "config.toml · the token stays in the user variable",
      snippet: '[mcp_servers.nodoc]\nurl = "https://asknodoc.oraclecorp.com/mcp"\nbearer_token_env_var = "ASK_NODOC_MCP_TOKEN"\nenabled = true\nrequired = false',
      resourceLinks: [{ label: "NoDoc MCP Access Tokens", href: "https://asknodoc.oraclecorp.com/mcp-access-tokens", note: "Create or revoke your personal token. Keep its value private." }]
    },
    {
      id: "mcp-skill", title: "Install or refresh the NoDoc usage skill", topic: "mcp", source: [1, 3],
      short: "After connecting, retrieve the versioned nodoc-mcp workflow skill through MCP.",
      steps: ["Verify the NoDoc connection with a read-only call first.", "Ask Codex to call get_nodoc_mcp_usage_skill and install the returned nodoc-mcp skill locally.", "Check the returned version, installed version, and local installation path. Repeat when refreshing the skill."],
      checkpoints: ["Returned and installed versions match. The skill contains no personal token and changes no NoDoc content."],
      watchFor: ["The connection provides tools; the usage skill supplies workflow guidance. Installing the skill does not verify authentication."],
      keywords: ["get_nodoc_mcp_usage_skill", "nodoc-mcp", "install skill", "update skill", "usage skill"]
    },
    {
      id: "mcp-read", title: "Browse and fetch complete content through MCP", topic: "mcp", source: [8, 1],
      short: "Resolve exact content identities and retrieve every list or Markdown chunk.",
      steps: ["List visible Focus Areas, then articles, pages, and saved versions in the chosen area.", "Resolve the exact Focus Area / Article / Page / Version before fetching content.", "Follow next_offset until null for both lists and chunked Markdown.", "Keep the resolved identity and current revision with the result."],
      checkpoints: ["You have the complete page, exact version, and current revision."],
      watchFor: ["The first response chunk or a partial name match is not complete content discovery."],
      keywords: ["MCP browse", "read", "fetch", "pagination", "next_offset", "revision"]
    },
    {
      id: "mcp-create", title: "Create or reuse content through MCP", topic: "mcp", source: [8, 2],
      short: "Prepare a new page or a live reference within an existing authorized destination.",
      steps: ["Choose an existing Focus Area and, for a page, an existing article version and unique page name.", "Ask Codex to show the proposed content and destination, then confirm creation.", "For reuse, specify the exact source and destination; treat the result as a live, read-only reference.", "List the destination again to verify name, version, placement, and ownership."],
      checkpoints: ["The page belongs to the intended existing version. A reused item is identified as a reference."],
      watchFor: ["add_page does not create a version. Change reused content by editing its authorized source."],
      keywords: ["add_page", "MCP create", "reuse", "live reference", "read only"]
    },
    {
      id: "mcp-edit", title: "Edit and organize content through MCP", topic: "mcp", source: [8, 3],
      short: "Review a change against the current revision, then save and read it back.",
      steps: ["Fetch the complete current page and revision before proposing a focused edit.", "Review the diff and authorize the exact change. If the revision changed, fetch again and reconfirm.", "For a rename, identify the exact target and new name. For a merge, identify source and target; the source remains.", "For reorder, read the full order and submit every item exactly once. For coauthors, specify the article, person, and add/remove action.", "Fetch or list the result to verify the approved change."],
      checkpoints: ["The saved result matches the reviewed scope and preserves unrelated content."],
      watchFor: ["Do not force a stale revision. The token determines the acting user's permissions."],
      keywords: ["MCP edit", "rename", "merge pages", "reorder", "coauthors", "revision conflict"]
    },
    {
      id: "mcp-images", title: "Insert an image through MCP", topic: "mcp", source: [8, 3],
      short: "Upload an approved image and verify it renders in the saved NoDoc page.",
      steps: ["Resolve the exact target page and current revision.", "Provide a PNG, JPEG, or GIF, its intended location, and the focused insertion request.", "Ask Codex to use the NoDoc image-upload tool as part of the reviewed change.", "Read back the page and confirm the stored image renders."],
      checkpoints: ["The image is stored for NoDoc and appears at the intended location."],
      watchFor: ["A local file path or temporary data URL is not a usable stored NoDoc image."],
      keywords: ["MCP image upload", "insert image", "PNG", "JPEG", "GIF"]
    },
    {
      id: "mcp-delete", title: "Inspect and confirm deletion through MCP", topic: "mcp", source: [8, 4],
      short: "Review the resolved target and deletion scope before authorizing its removal.",
      steps: ["Fetch the exact page and revision; for an article, inspect current page and version counts too.", "Review the resolved names and scope, then explicitly confirm the exact target.", "After deletion, list the parent and verify the remaining content."],
      checkpoints: ["Only the confirmed target was removed."],
      watchFor: ["Treat MCP deletion as permanent from the MCP user's perspective. MCP history tools cannot undo it; consult the NoDoc History UI for available recovery options."],
      keywords: ["MCP delete", "deletion", "confirmation", "page count", "version count"]
    },
    {
      id: "mcp-history", title: "Find changes and compare history through MCP", topic: "mcp", also: ["history"], source: [8, 5],
      short: "Inspect changed pages and bounded Markdown diffs from retained history.",
      steps: ["Call list_changed_pages for the exact Focus Area, version, and timestamp window with its time zone.", "If truncated is true, narrow the time window.", "Call get_page_history and choose two returned valid_from_timestamp values.", "Use get_page_history_diff for that page and version; inspect the diff and added/removed line counts."],
      checkpoints: ["Both comparison timestamps came from retained history; bounds or missing history are reported."],
      watchFor: ["The change list excludes deleted, unavailable, and reused pages. These tools compare history and do not restore content."],
      keywords: ["list_changed_pages", "get_page_history", "get_page_history_diff", "Markdown diff", "truncated", "timestamps"]
    },
    {
      id: "mcp-prepublish", title: "Prepare a LiveLabs preview and QA through MCP", topic: "mcp", also: ["publishing"], source: [8, 6],
      short: "Keep one request ID through preview readiness, QA, review, and an explicitly authorized push.",
      steps: ["Use start_pre_publish_livelabs for the LiveLabs Focus Area, article, existing version, and content area; retain the request ID.", "Poll get_pre_publish_status until ready or error. Preview, download, and accessibility-report links appear at ready.", "When ready, call run_livelabs_qa and poll that same tool and request ID until completed or error.", "Review page findings, the rendered preview, and accessibility report. After fixes, create and validate a new preview.", "Complete QA and release review before explicitly requesting push_pre_publish_livelabs. Continue the separate WMS publishing handoff."],
      checkpoints: ["The evidence includes the request ID, ready preview, completed QA findings, and review decision."],
      watchFor: ["QA completed does not mean every check passed. Do not start another pre-publish request while QA is running.", "Only the token subject that created the request can access its ID. The LiveLabs push tool rejects OHC and non-ready requests."],
      keywords: ["start_pre_publish_livelabs", "get_pre_publish_status", "run_livelabs_qa", "push_pre_publish_livelabs", "prepublish", "request_id"]
    },
    {
      id: "mcp-ohc", title: "Use OHC publication metadata through MCP", topic: "mcp", source: [8, 6],
      short: "Review metadata for the exact OHC Focus Area and publication version before starting a request.",
      steps: ["Call get_pre_publish_metadata to read the last confirmed metadata and estimate without starting a request.", "To reuse it, review and explicitly confirm start_pre_publish_ohc_using_saved_metadata.", "For changed metadata, use start_pre_publish_ohc with document title, title, content type, part number, description, print month/year, platform, and base URL; author/contributor lists are optional.", "Retain the returned 32-character request_id and poll get_pre_publish_status."],
      checkpoints: ["The metadata belongs to the intended Focus Area and publication version."],
      watchFor: ["Saved OHC metadata is not used for LiveLabs, and push_pre_publish_livelabs cannot push OHC."],
      keywords: ["OHC", "get_pre_publish_metadata", "start_pre_publish_ohc", "start_pre_publish_ohc_using_saved_metadata"]
    },
    {
      id: "mcp-troubleshooting", title: "Troubleshoot NoDoc MCP", topic: "mcp", source: [8, 7],
      short: "Match the symptom to a targeted connection, permission, revision, or completeness check.",
      steps: ["For missing tools, check one server config, the exact user-variable name, and token expiry or revocation; restart Codex and open a new chat.", "For an expired, revoked, or lost token, replace it through the token page, update the user variable, and restart.", "For access errors, verify the exact content target with its owner. For read-only reused content, resolve the authorized source.", "For stale revisions, fetch and review again. For partial results, follow next_offset or narrow a truncated history window.", "For an unavailable request ID, check the ID and creating token subject. For temporary service failures, stop repeated retries and record non-sensitive details for support."],
      checkpoints: ["Repeat the smallest direct read-only check after the issue is corrected."],
      watchFor: ["Never print the token. A token cannot expand content permissions, and a visible tool catalog does not prove authorization."],
      keywords: ["MCP error", "missing tools", "expired token", "not authorized", "conflict", "partial results", "request ID unavailable"]
    },
    {
      id: "prepublish-target", title: "Configure LiveLabs Pre Publish in the browser", topic: "publishing", source: [9, 1],
      short: "Select the saved article's destination and generate the required environment URLs.",
      steps: ["From the saved article, choose Pre Publish and select the LiveLabs tab.", "Set LiveLab, Version, Content Area, and Workshop.", "Select Sandbox, Tenancy, or both in Workshop Types, according to the required environments.", "Select Create URL and retain the generated environment URLs with the review record."],
      checkpoints: ["The selected version, output destination, and environment types are correct."],
      watchFor: ["Keep the generated Sandbox and Tenancy URLs distinct; WMS later uses them in different fields."],
      keywords: ["manual prepublish", "Pre Publish", "Create URL", "Sandbox URL", "Tenancy URL"]
    },
    {
      id: "prepublish-validation", title: "Resolve Markdown and Text Check findings", topic: "publishing", source: [9, 2],
      short: "Run both mandatory validation sets and review each result before continuing.",
      steps: ["Select Run Markdown Validations and inspect severity, page, rule code, message, and status.", "Select Run Text Check Validations and review its results independently.", "For valid findings, correct the affected page using the narrowest Vibe Doc-ing option, inspect Difference, save, and rerun the relevant validation.", "If a Pre Publish warning remains, cancel to keep fixing or confirm only when the exception is understood, approved, and recorded."],
      checkpoints: ["Both validation sets were reviewed and every remaining finding has a recorded disposition."],
      watchFor: ["Markdown success does not cover grammar, protected text, or wording findings. Do not bypass warnings accidentally."],
      keywords: ["Run Markdown Validations", "Run Text Check Validations", "rules", "severity", "exceptions"]
    },
    {
      id: "prepublish-output", title: "Choose Preview, Push, or Download Zip", topic: "publishing", source: [9, 3],
      short: "Inspect the generated workshop and choose the appropriate post-validation output.",
      steps: ["After Pre Publish completes, select Preview and inspect the rendered workshop.", "Use Download Zip to retain the archive for review, handoff, or recovery.", "Complete QA and review before selecting Push with the required authorization.", "Confirm the Push success response before creating the WMS publishing request."],
      checkpoints: ["The selected output and its evidence match the current review or release stage."],
      watchFor: ["An available Push button is not approval. Preview or archive creation alone is not WMS publishing approval."],
      keywords: ["Preview", "Push", "Download Zip", "archive", "output"]
    },
    {
      id: "self-qa", title: "Complete Self Quality Assurance", topic: "publishing", source: [10, 1],
      short: "Review the generated workshop and retain the evidence needed for the QA handoff.",
      steps: ["Open the generated Preview and check title, introduction, objectives, prerequisites, navigation, page order, links, code, images, alt text, metadata, and rendered content.", "Confirm the exact generated Sandbox and Tenancy URLs for the selected environments.", "Use the Quickstart Review & Publish checklist and record the Preview URL, validation status, approved exceptions, and downloaded archive.", "Mark Self Quality Assurance Complete only when findings are resolved or explicitly accepted by the responsible reviewer."],
      checkpoints: ["The completed checklist and evidence describe the current workshop output."],
      watchFor: ["Do not mark QA complete based only on generated files or a successful validation run."],
      keywords: ["self QA", "Self Quality Assurance", "checklist", "rendered preview", "handoff"]
    },
    {
      id: "release-review", title: "Resolve review findings before release", topic: "publishing", source: [10, 2],
      short: "Keep corrections, validation results, and approval aligned with the current preview.",
      steps: ["Share the Preview URL and QA evidence through the approved review route.", "Correct reviewer findings on the affected page or with Vibe Doc-ing; inspect Difference and save accepted corrections.", "Rerun relevant validations and update the preview and QA record after corrections.", "Continue when the reviewer approves and WMS shows Completed. If authorized, return to Push and retain the success response."],
      checkpoints: ["The release decision references current preview and validation evidence."],
      watchFor: ["A preview, Push response, or ZIP archive alone is not WMS approval."],
      keywords: ["release approval", "reviewer", "findings", "WMS Completed", "QA evidence"]
    },
    {
      id: "wms-handoff", title: "Submit the WMS publishing request", topic: "publishing", source: [10, 3],
      short: "Carry the reviewed NoDoc environment URLs into the separate WMS publishing request.",
      steps: ["After QA and review, confirm WMS is Completed, open Publishing, and select Publish to LiveLabs.", "Set LiveLab Type, Publish Type, and estimated completion time. Choose Own Tenancy, LiveLabs Sandbox, or both.", "For Own Tenancy, enter the generated Tenancy URL in Run on your Tenancy URL; review the details and select Create.", "Confirm Publish Requested. A tenancy-only request can be saved at this point.", "For a sandbox, open Sandbox Environment, enter the generated Sandbox URL in Run on LiveLabs Sandbox URL, and choose Sandbox Lite or Run on LiveLabs Sandbox. Follow Open Jira Ticket for a regular sandbox request and save the required configuration."],
      checkpoints: ["The request status and saved environment settings match the approved delivery plan."],
      watchFor: ["Use the exact environment URLs from Pre Publish. Do not substitute the NoDoc preview URL or invent new environment URLs."],
      keywords: ["WMS publishing request", "Publish Requested", "Sandbox Lite", "Own Tenancy", "Open Jira Ticket"]
    }
  ];

  var items = cards.map(function (card) {
    var item = Object.assign({}, card, {
      id: "nodoc-" + card.id,
      title: "NoDoc: " + card.title,
      description: card.short,
      tags: ["nodoc", "nodoc-" + card.topic].concat((card.also || []).map(function (tag) { return "nodoc-" + tag; })),
      keywords: ["nodoc", "no doc", "no-doc"].concat(card.keywords || []),
      sourceRoute: "#nodoc:" + card.source.join(":"),
      sourceLabel: card.source[0] ? "Open NoDoc guide · Lab " + card.source[0] + ", Task " + card.source[1] : "Open NoDoc guide · Introduction",
      updatedAt: "2026-10-07"
    });
    delete item.topic;
    delete item.also;
    delete item.source;
    return item;
  });

  var api = { items: items, tagGroup: { tag: "nodoc", label: "NoDoc", children: topics } };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.authorGuideContent.explorerItems = root.authorGuideContent.explorerItems.concat(items);
    root.authorGuideContent.tagGroups = (root.authorGuideContent.tagGroups || []).concat(api.tagGroup);
  }
}(typeof window !== "undefined" ? window : this));
