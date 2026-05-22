# Source-to-Workshop Authoring Workflow

Use this workflow when the user provides an idea plus source content. A prior workshop is optional, not required.
The user does not need a GitHub repository, a sample workshop repository, or a pre-existing LiveLabs template repository. A writable output folder plus source material is enough.

## 1. Collect Inputs

Capture:

- workshop source type (`idea`, `blog`, `doc`, `web page`, `jupyter notebook`, `slide deck`, `PowerPoint`, `demo script`, `mixed sources`),
- workshop audience,
- target environment (`tenancy`, `sandbox`, `desktop`),
- expected duration,
- desired lab count,
- short description,
- long description,
- workshop outline,
- core outcomes,
- source links and documents.
- whether the source material is a blog post, product doc, slide deck, demo script, or an existing workshop.
- whether the workshop should include runnable SQL through FreeSQL.

If expected duration is missing, ask for it before you lock the workshop scope. If desired lab count is missing, ask for it before you finalize the outline. Only make a conservative assumption if the user cannot answer, and document that assumption.
If the workshop is Oracle-related, ask whether the user wants to load `oracle-db-skills` for technical validation before you finalize the draft.

Keep this distinction clear:

- skill files, bundled scripts, and references should not contain hard-coded author-specific local paths
- workshop generation commands may use any real path the user provides for their own environment

## 2. Build a Lab Blueprint

Create a minimal blueprint before writing markdown:

- workshop short description: 1-2 sentences for listing or catalog use.
- workshop long description: 1-3 paragraphs on learner problem, scope, and outcome.
- workshop outline: introduction plus final lab sequence in order.
- `Introduction` lab: storyline and expected outcomes.
- Lab sequence (`Lab 1`, `Lab 2`, ...): one clear goal per lab.
- Task sequence per lab: one action per numbered step.

Use the requested duration to set scope:

- about 15-30 minutes: 1-2 short labs or a fastlab.
- about 30-60 minutes: 2-4 focused labs.
- about 60-90 minutes: 3-5 labs with fuller setup and validation steps.
- 90+ minutes: 4-6 labs with optional extensions only when the source material supports them.

If the workshop is a creator guide, place the first hands-on how-to material in `Lab 1`.
If the only source is a blog post, derive the lab plan from the blog's problem, workflow, commands, and outcomes rather than mirroring its section headings mechanically.
If the source is a notebook, slide deck, or PowerPoint, convert the original sequence into tasks and checkpoints rather than preserving presentation-style phrasing.
If the user asks for a specific lab count, honor that count unless it would make the workshop incoherent. If you need to compress, merge adjacent concepts instead of dropping the core validation step.
Save the short description, long description, and workshop outline in a reusable root file so the user can paste them into workshop setup fields later.

## 3. Convert Source Material into Steps

For each source:

- extract concrete actions and commands,
- remove marketing language,
- keep syntax and parameter names exact,
- cite source links in `Learn More` when relevant.
- convert narrative claims into learner actions, checkpoints, and expected results.

Avoid unsupported claims that are not in provided sources.

## 3a. Normalize The Scaffold Before Writing

Right after scaffolding:

- open one generated `workshops/<variant>/index.html` and confirm it is the standard LiveLabs loader,
- confirm the starter manifest loads `../../introduction/introduction.md`,
- confirm the manifest ends with `Need Help?`,
- create or refresh `WORKSHOP-DETAILS.md` so the setup metadata matches the planned workshop shape,
- replace placeholder introduction metadata before you draft the labs.

Do not wait until browser preview to discover a broken scaffold.

## 4. Draft Markdown with LiveLabs Conventions

For each lab markdown file:

- keep one H1,
- add required `Introduction`, `Objectives`, `Estimated Time`, `Acknowledgements`,
- create `## Task ...: ...` blocks for guided execution,
- indent all content inside numbered steps by 4 spaces.
- keep examples, commands, and parameter names exact.
- use meaningful image alt text and lowercase image filenames.
- write introductions around the learner's task, context, and expected outcome.
- do not write meta framing such as "this workshop was created from a blog post" or "this workshop is based on the following idea" inside the learner-facing introduction.
- do not mention the prompt, authoring process, notebook, slide deck, or source format in the learner-facing introduction unless the source format itself is the subject of the workshop.

If the workshop uses source images or screenshots and the source host is blocked or degraded, hand the capture work to the dedicated screenshot skill and keep the workshop self-contained with local assets rather than remote hotlinks.

## 5. Add FreeSQL Assets When Appropriate

If the workshop teaches SQL, PL/SQL, Quick SQL, or related database actions:

- decide whether the learner only needs a code block, or whether a runnable FreeSQL experience adds value,
- if raw HTML is allowed, prefer the embedded editor by default,
- use a share link when the renderer blocks raw HTML or the user explicitly wants a launch link,
- use a `Run in FreeSQL` button only when HTML is acceptable and the user explicitly wants a visible launch control,
- if the user tries to use FreeSQL for vector embedding generation, warn that FreeSQL does not support that workflow and move that step elsewhere.

Use these local references:

- `freesql_authoring.md`
- `freesql_site_observations.md`

## 6. Tighten Prose Before Validation

Before you validate structure, tighten the prose:

- remove filler, hype, and vague adjectives,
- prefer active voice and concrete verbs,
- use problem -> solution -> outcome flow when that makes the lab easier to follow,
- apply the Lanham paramedic method to long or slow sentences,
- cut unsupported claims or mark them as TODO items for SME review.

Use these local references:

- `ai-generated-content-guide.md`
- `lanham.md`
- `lanham_guidelines.md`
- `grading.md` when the user requests formal grading
- `lard.md` when the user requests reduction examples or sentence tightening

Before delivery, self-grade the changed files and target 4/5 or 5/5. A 3/5 is the minimum acceptable fallback, and anything lower should trigger another revision pass.
For Oracle-related workshops, run an Oracle accuracy check with `oracle-db-skills` when the user approves it.

## 7. Assemble Manifests

Update `workshops/<variant>/manifest.json`:

- set a precise `workshoptitle`,
- add prerequisite shared labs when needed,
- order tutorial entries exactly as learner flow,
- point `filename` values to valid relative files or approved URLs.
- confirm the workshop still previews through a generated `workshops/<variant>/index.html` entry page after manifest changes.

## 8. Validate and Iterate

Run validator:

`bash scripts/run_workshop_qa.sh <workshop-root>`

For targeted iteration on edited markdown:

`bash scripts/run_workshop_qa.sh <workshop-root> --files introduction/introduction.md lab-a/lab-a.md`

Fix all failures, rerun, and stop only at zero errors.

Repair in this order:

1. Structure and missing files.
2. Required markdown sections and task formatting.
3. Images, embeds, custom tags, and FreeSQL integration choices.
4. Manifest issues.
5. Lanham and clarity issues that still weaken the learner flow.

If the user also needs screenshots or industry conversion, hand those jobs to the dedicated skills rather than expanding this workflow.
