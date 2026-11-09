// Deliberate design fixtures. These are not imported operational records or Jira issues.
export const areas = [
  { id: 'automation', name: 'QA Automation', color: 'teal', icon: 'play', description: 'Test coverage, execution profiles, and regression follow-up.' },
  { id: 'on-call', name: 'On-Call', color: 'plum', icon: 'headphones', description: 'Support review, learner issues, and clear handoffs.' },
  { id: 'jenkins', name: 'Jenkins Reports', color: 'ocean', icon: 'report', description: 'Run history, outcomes, and evidence worth reviewing.' },
  { id: 'par-links', name: 'PAR Links', color: 'sienna', icon: 'link', description: 'Link findings, coverage gaps, and repair verification.' },
  { id: 'repositories', name: 'Repositories', color: 'green', icon: 'branch', description: 'Repository inventory, content checks, and review follow-up.' }
]
export const owners = [
  { id: '', name: 'Unassigned', initials: '–', color: 'neutral' },
  { id: 'qa', name: 'QA team', initials: 'QA', color: 'teal' },
  { id: 'content', name: 'Content team', initials: 'CT', color: 'sienna' },
  { id: 'platform', name: 'Platform team', initials: 'PT', color: 'plum' }
]
export const stages = [
  { id: 'backlog', name: 'Backlog', color: 'neutral', hint: 'Ready for a closer look' },
  { id: 'progress', name: 'In progress', color: 'ocean', hint: 'Moving quality forward' },
  { id: 'review', name: 'In review', color: 'sienna', hint: 'A second pair of eyes' },
  { id: 'done', name: 'Done', color: 'green', hint: 'Checked and wrapped up' }
]
export const priorities = ['High', 'Medium', 'Low']
const fixture = (id, title, area, stage, priority, owner, due, description, subtasks = [], blocked = false) => ({
  id: `QA-${id}`, title, area, stage, priority, owner, due, description, blocked,
  subtasks: subtasks.map((title, index) => ({ id: `${id}-${index}`, title, done: stage === 'done' || (stage !== 'backlog' && index === 0) })),
  comments: [], activity: [], source: 'Sample task for design review'
})
export function seedTasks() {
  return [
    fixture(101, 'Expand regression coverage for LiveStacks', 'automation', 'backlog', 'High', 'qa', '2026-11-13', 'Map the required LiveStack scenarios to the test inventory and identify missing coverage before the next regression.', ['Review the scenario inventory', 'Confirm scope with the team', 'Add missing checks']),
    fixture(102, 'Review unverified PAR links', 'par-links', 'backlog', 'High', 'content', '2026-11-10', 'Separate inconclusive probes from confirmed broken links. Record the next verification step for each finding.', ['Review inconclusive probes', 'Document verification steps']),
    fixture(103, 'Define repository review checklist', 'repositories', 'backlog', 'Medium', '', '2026-12-04', 'Agree on the content, manifest, and workflow checks that belong in a repeatable repository review.', ['Draft checklist', 'Review with content team']),
    fixture(104, 'Plan December test coverage', 'automation', 'backlog', 'Low', 'qa', '2026-12-11', 'Outline the next coverage increment after the November review. Dates and ownership here are examples.', ['Review remaining gaps', 'Prioritize next scenarios']),
    fixture(105, 'Triage the latest regression findings', 'automation', 'progress', 'High', 'qa', '2026-11-06', 'Review unexpected results and distinguish product findings from execution issues. Keep a link to the source evidence for each decision.', ['Review unexpected results', 'Classify each finding', 'Record follow-up actions']),
    fixture(106, 'Review author support handoffs', 'on-call', 'progress', 'Medium', 'content', '2026-11-09', 'Check that each support handoff has enough context, a clear next action, and an owner. This card contains no real support messages.', ['Review handoff fields', 'Confirm next-action wording']),
    fixture(107, 'Connect build outcomes to run evidence', 'jenkins', 'progress', 'High', 'platform', '2026-11-12', 'Design the relationship between build outcome, execution status, and quality findings. A completed scan and a clean scan are distinct outcomes.', ['Define evidence fields', 'Map build and report IDs', 'Review adapter contract'], true),
    fixture(108, 'Audit workshop manifest coverage', 'repositories', 'progress', 'Medium', 'content', '2026-11-16', 'Compare repository manifests with the local inventory and record missing or unreadable entries.', ['Review inventory', 'Investigate missing entries', 'Record follow-up']),
    fixture(109, 'Verify repaired workshop links', 'par-links', 'review', 'High', 'content', '2026-11-05', 'Recheck repaired links and retain the result alongside the original finding. An unmeasured source must stay visibly unmeasured.', ['Recheck sample links', 'Review coverage notes']),
    fixture(110, 'Review on-call draft states', 'on-call', 'review', 'Medium', 'qa', '2026-11-06', 'Review how current, changed, and unavailable draft states appear to a reviewer. Approval and delivery must remain separate.', ['Inspect draft states', 'Check revision labels', 'Review handoff copy']),
    fixture(111, 'Validate execution profile labels', 'automation', 'review', 'Low', 'platform', '2026-11-09', 'Check that profile names explain the intended scope and that the execution preview does not imply a job has run.', ['Review profile labels', 'Verify request preview']),
    fixture(112, 'Separate skipped checks from pass rate', 'jenkins', 'done', 'Medium', 'qa', '2026-11-03', 'Example completed task: present skipped checks separately so the pass rate has a clear denominator.', ['Review count definitions', 'Verify summary copy']),
    fixture(113, 'Map QA workspace source connections', 'automation', 'done', 'Low', 'platform', '2026-11-02', 'Example completed task: describe what each source provides and distinguish local artifacts from live connections.', ['List source boundaries', 'Review connection labels']),
    fixture(114, 'Document repository review steps', 'repositories', 'done', 'Low', 'content', '2026-11-02', 'Example completed task: write the short review flow and expected output for a repository inventory check.', ['Write review steps', 'Check instructions']),
    fixture(115, 'Review January automation priorities', 'automation', 'backlog', 'Medium', 'qa', '2027-01-08', 'Example planning task: choose the next automation priorities from the remaining coverage gaps.', ['Review coverage backlog', 'Agree next priorities']),
    fixture(116, 'Plan on-call review improvements', 'on-call', 'backlog', 'Low', 'content', '2027-01-15', 'Example planning task: identify which parts of the review flow need clearer context or fewer manual steps.', ['Review workflow feedback', 'Prioritize improvements'])
  ]
}
