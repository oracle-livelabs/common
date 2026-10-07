# NoDoc content traceability

This record covers the NoDoc additions in `nodoc-workshop.html`.

| Workshop area | Source | Source class | Evidence used | Notes |
| --- | --- | --- | --- | --- |
| Introduction, Lab 1, and MCP task | [NoDoc MCP User Guide](https://docs-uat.us.oracle.com/en/sptest/test-suite/test-product/test-release/nodoc/formal-nodoc-functionalities-and-usage/nodoc-mcp.html) | Oracle-owned/internal | Browser-reviewed product documentation | Supports personal-token authentication, Windows user-variable setup, `config.toml`, direct tool verification, authorization boundaries, read-only history tools, and LiveLabs pre-publish status/push behavior. |
| Lab 8 dedicated MCP lab | [NoDoc MCP User Guide](https://docs-uat.us.oracle.com/en/sptest/test-suite/test-product/test-release/nodoc/formal-nodoc-functionalities-and-usage/nodoc-mcp.html) | Oracle-owned/internal | Browser-reviewed product documentation | Supports browse and fetch, create and reuse, edit and organize, collaborators, delete, read-only history and diff, OHC and LiveLabs pre-publish, authorization boundaries, and troubleshooting. |
| Lab 1 workspace hierarchy | [NoDoc Repo Application](https://docs-uat.us.oracle.com/en/sptest/test-suite/test-product/test-release/nodoc/formal-nodoc-functionalities-and-usage/nodoc-repo-application.html) and [Formal NoDoc Functionalities and Usage](https://docs-uat.us.oracle.com/en/sptest/test-suite/test-product/test-release/nodoc/formal-nodoc-functionalities-and-usage.html) | Oracle-owned/internal | Browser-reviewed product documentation | Supports Focus Area selection, the left table of contents, Open All/Close All navigation, article and page placement, optional article versions, and page-level actions. |
| Lab 1 workspace hierarchy | `content/nodoc/images/workspace-hierarchy.svg` | Original local diagram | Authored from the verified NoDoc hierarchy and the supplied UI screenshots | Makes the navigation path visible as nested scope instead of presenting it as a text-only arrow chain. |
| MCP token setup | [NoDoc MCP Access Tokens](https://asknodoc.oraclecorp.com/mcp-access-tokens) | Oracle-owned/internal | Linked source workflow | The guide tells authors to create and store a token without exposing the token in content, chat, screenshots, or source control. |
| Lab 2 history task | `C:\Users\Lucian Brinzei\Desktop\img\page_history_*.png` | Oracle-owned/internal, user-supplied | Supplied NoDoc UI screenshots | Supports article-level History and Restore Deleted pages, page-level Compare History, Preview and Restore, restore reason, and confirmation flows. Copied into `images/` for the local guide. |
| Lab 2 history task | `C:\Users\Lucian Brinzei\Desktop\img\restore_deleted_pages_*.png` | Oracle-owned/internal, user-supplied | Supplied NoDoc UI screenshots | Supports review and restoration of deleted article pages. |

## MCP refresh — 7 October 2026

| Change | Source and evidence | Boundary |
| --- | --- | --- |
| Five-step Windows setup and updated feature recipes | Browser read of the Oracle NoDoc MCP User Guide linked above | Documentation verification; no authenticated MCP call was performed. |
| Versioned usage skill | Oracle reference: Install and update the NoDoc skill | Covers `get_nodoc_mcp_usage_skill`, returned/installed versions, and refresh. No skill was installed as part of this documentation edit. |
| Draft review | Oracle reference: Review and manage page drafts | Preserves pagination, reviewer authorization, matching draft confirmation IDs, unchanged revision, approval of the selected draft, and the effect on all pending drafts. |
| LiveLabs QA | Oracle reference: LiveLabs QA validation | Ready preview precedes QA; poll `run_livelabs_qa` with the same request ID; completed QA requires findings review. Push remains explicit. |
| `images/mcp/01-token-form.jpg`, `02-token-label.jpg` | Current token page, captured 7 October 2026 | Actual product screenshots before token creation. Only a sample label was entered; no credential was generated or captured. |
| `images/mcp/architecture.svg`, `windows-variable.svg`, `config-map.svg`, `publish-lifecycle.svg` | Original illustrations derived from the documented flows | Conceptual diagrams, not screenshots or proof of a completed installation. Architecture shows logical responsibilities, not undocumented deployment internals. |
| Manual draft review in Lab 3, Task 2 | Existing user-supplied Draft Version and Difference Viewer screenshots, inspected again on 7 October 2026 | Screenshots support Drafts, View Diff, per-change accept/reject, and Approve. They do not establish a whole-draft Discard button. Duplicate figures removed from the MCP lab. |
| Codex draft workflow in Lab 8, Task 8 | Oracle MCP guide, Review and manage page drafts, reread in the browser on 7 October 2026 | Direct MCP listing, approval, and discard; user reviews and decides in chat. Preserves pagination, bounded HTML diff, role checks, confirmation IDs, unchanged revision, and status effects. No authenticated mutation was tested. |
| Architecture visual refinement, including `architecture-compact.svg` | Same Oracle reference and configuration semantics; rendered wide, narrow-panel, and mobile checks | Numbered logical flow, results routed through MCP, explicit token/access distinction, and separate local skill guidance. No live service behavior was tested. |
| Codex configuration syntax | [Official OpenAI MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), fetched 7 October 2026 | Cross-check of named server configuration, bearer-token environment-variable reference, enabled, and required flags. NoDoc endpoint and workflow remain Oracle-sourced. |

The UAT link requires the reader's approved access. All changes are local pending review. See [the implementation plan and assessment](MCP-REVIEW-2026-10-07.md) and [the image provenance manifest](images/mcp/MANIFEST.md).

Search was refreshed after the documentation rework. Both search surfaces now use the canonical lab/task content and shared metadata parser. Descriptions distinguish manual UI and Codex MCP workflows; keywords cover current setup, tools, QA, history, and publishing tasks. See [search maintenance and validation](SEARCH.md).
