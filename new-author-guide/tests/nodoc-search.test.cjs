const { test } = require("node:test");
const assert = require("node:assert/strict");
const search = require("../assets/js/nodoc-search.js");

// Deliberately overlapping terms: cross-references must not outrank the task
// whose title and description describe the requested workflow.
const entries = [
  { panel: 3, task: 2, title: "Create and review page drafts in the NoDoc UI", summary: "Manual browser review: accept or reject changes.", keywords: "manual drafts", path: "Lab 3 / Task 2", text: "For Codex MCP approval and discard, see Lab 8." },
  { panel: 8, task: 8, title: "Review, approve, or discard drafts through Codex MCP", summary: "Codex MCP: review existing drafts in chat.", keywords: "list_page_drafts approve_page_draft discard_page_draft", path: "Lab 8 / Task 8", text: "For the manual browser workflow see Lab 3." },
  { panel: 1, task: 3, title: "Connect Codex to NoDoc through MCP", summary: "Set up config.toml and the Windows token variable.", keywords: "installation setup ASK_NODOC_MCP_TOKEN", path: "Lab 1 / Task 3", text: "Install the usage skill." },
  { panel: 8, task: 6, title: "Start, review, and push a pre-publish request", summary: "Create a ready preview and run LiveLabs QA.", keywords: "run_livelabs_qa prepublish", path: "Lab 8 / Task 6", text: "Review QA findings before an explicit push." }
];

for (const [query, panel, task] of [
  ["manual draft review", 3, 2],
  ["Codex drafts", 8, 8],
  ["MCP draft approval", 8, 8],
  ["discard_page_draft", 8, 8],
  ["MCP installation", 1, 3],
  ["ASK_NODOC_MCP_TOKEN", 1, 3],
  ["config.toml", 1, 3],
  ["run_livelabs_qa", 8, 6],
  ["pre-publish QA", 8, 6],
  ["Lab 8 Task 8", 8, 8]
]) {
  test(`NoDoc search resolves ${query}`, () => {
    const [match] = search.find(entries, query);
    assert.ok(match, "Expected a result");
    assert.deepEqual([match.panel, match.task], [panel, task]);
  });
}

test("NoDoc search requires every term and rejects punctuation-only queries", () => {
  for (const query of ["discard impossibleword", "!!!", ""]) {
    assert.deepEqual(search.find(entries, query), []);
  }
});

test("NoDoc search handles singular/plural draft terminology consistently", () => {
  assert.deepEqual(search.find(entries, "draft"), search.find(entries, "drafts"));
});

test("NoDoc search retains all matching records for an accurate result count", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ ...entries[0], panel: i }));
  assert.equal(search.find(many, "draft").length, 12);
});
