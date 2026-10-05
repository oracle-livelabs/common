# Mode Selection

Choose one mode before drafting. The mode controls how much structure, polish, and QA the skill should apply.

## Modes

### draft

Use when speed matters more than polish.

Deliver:
- workshop skeleton,
- lab plan,
- first-pass markdown,
- basic manifest coverage.

Do not stop here if the user asked for publish-ready output.

### publish-ready

Use when the workshop should be ready for serious review or direct testing.

Deliver:
- complete markdown,
- manifests,
- FreeSQL decisions,
- validator pass,
- compact QA summary.

### how-to-guide

Use when the workshop teaches a process, authoring flow, or product setup sequence.

Favor:
- outcome-based lab titles,
- procedural steps,
- short explanations tied to the task.

### fastlab

Use when the workshop should stay narrow and quick.

Favor:
- fewer labs,
- tighter setup,
- minimal prerequisites.

## Selection Rules

- Ask for target workshop length if the user did not provide it. Use that answer to confirm mode and scope before drafting.
- Ask for desired lab count if the user did not provide it. Use that answer to confirm the lab blueprint before drafting.
- If the user says "publish-ready," choose `publish-ready`.
- If the user provides only raw ideas or a blog post, start in `draft` unless they ask for more.
- If the workshop is instructional about building something, choose `how-to-guide`.
- If the user asks for a short workshop or fastlab, choose `fastlab`.
- If the requested duration is short, reduce setup, collapse optional context, and keep the lab count tight even in `publish-ready`.
- If the user gives both duration and lab count, satisfy both if possible. If they conflict, explain the tradeoff and bias toward the user-requested lab count.
- If the user asks for screenshots or industry conversion, switch to the dedicated screenshot or conversion skill instead of expanding this one.
