# Source Of Truth

Use these files in this order when they overlap:

1. `gamification-rules.md`
   Path: `<source-reference-folder>/gamification-rules.md`
   Role: policy, placement, scoring defaults, terminology, quiz counts

2. `quiz.md`
   Path: `<source-reference-folder>/quiz.md`
   Role: quiz markdown syntax, `quiz-config`, `quiz`, and `quiz score` behavior

3. `gamification-grade-rubric.md`
   Path: `<source-reference-folder>/gamification-grade-rubric.md`
   Role: QA checklist for grading the finished workshop changes

4. `gamification-prompt.md`
   Path: `<source-reference-folder>/gamification-prompt.md`
   Role: workflow guardrails, repo-safety rules, and reporting expectations

5. Example repositories
   Role: implementation patterns only, not policy

## Example Pattern Files

- Additional lab with manifest update:
  `<workshop-root>/manifest.json`
- FastLab append-in-place:
  `<fastlab-markdown-file>`
- Quiz blocks inside existing lab sections:
  `<lab-markdown-file>`

## Conflict Rules

- If syntax and policy disagree, keep the placement and behavioral rule from `gamification-rules.md` and the markdown block shape from `quiz.md`.
- Never infer new rules that are not supported by the source-of-truth files.
- Treat example repositories as patterns to imitate, not as authority.
