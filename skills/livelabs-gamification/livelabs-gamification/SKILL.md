---
name: livelabs-gamification
description: Create quizzes and gamify Oracle LiveLabs workshops. Use when Codex needs to generate quiz questions from workshop content automatically, add a scored quiz as a new lab at the end of a workshop, append a quiz to a FastLab markdown, or distribute quiz blocks across existing lab markdown at valid section boundaries while preserving instructional content verbatim and updating the named manifest when required.
---

# Livelabs Gamification

## Workflow

Use this skill to add quiz-based gamification to LiveLabs content without rewriting the instructional material. Generate questions from the workshop content itself, not from outside knowledge.

### 1. Load The Right References

- Read [source-of-truth.md](references/source-of-truth.md) first.
- Read [quiz-syntax.md](references/quiz-syntax.md) for block shape and config.
- Read [quiz-modes.md](references/quiz-modes.md) to choose the correct insertion pattern.
- Read [qa-checklist.md](references/qa-checklist.md) before final validation.

### 2. Confirm The Quiz Mode

If the user does not specify the mode, ask which option to use:

- `Option 1`: add a quiz as an additional lab at the end of the workshop and update the named manifest
- `Option 2`: append a quiz to a FastLab markdown
- `Option 3`: distribute quiz blocks within existing lab markdown

Prompt requirements:
- For `Option 1`, ask for the active manifest path before editing.
- For `Option 3`, ask whether to create a new `Check Your Understanding` task or insert quiz blocks under existing sections.
- For `Option 1`, confirm the final question count if the workshop content suggests ambiguity inside the 5-10 range.

### 3. Read The Workshop Content

- Read the target markdown and manifest files fully before generating questions.
- Derive questions only from the lab or workshop content in scope.
- Prefer conceptual questions that test why, when, or consequence.
- Avoid trivia, syntax memorization, or facts not taught in the workshop.

### 4. Generate The Questions

- Use exactly one correct answer per question.
- Use 3-4 answer choices.
- Include an explanation for every question.
- Keep the explanation instructional and tied to the learning objective.
- Keep wrong answers plausible but clearly incorrect from the workshop context.

Question counts by mode:
- `Option 1`: 5-10 scored questions
- `Option 2`: exactly 3 scored questions
- `Option 3`: spread questions evenly across major conceptual boundaries; do not enforce a passing score

### 5. Apply The Quiz Correctly

- Preserve all instructional content verbatim.
- Append quiz material only at valid boundaries.
- Never insert quizzes before the first hands-on task, mid-step, inside code blocks, or inside command sequences.
- Do not use certification language.
- Default badge path is `images/badge.png` unless the user or repo already uses another relative badge asset.

Mode-specific behavior:

- `Option 1`
  - Create a new lab folder, markdown file, and `images/` directory.
  - Add `quiz-config` with `passing: 75`.
  - Score all questions.
  - Update only the manifest the user named.
- `Option 2`
  - Append one `Check Your Understanding` section at the end of the same markdown file.
  - Add `quiz-config` once near the top if it is missing.
  - Add exactly 3 scored questions.
- `Option 3`
  - Distribute quiz material across valid section boundaries.
  - Badge unlocks when the learner completes all quiz blocks.
  - Do not enforce a passing score.
  - If the file already uses `quiz score`, preserve that existing pattern only when the user explicitly wants scored checks.

### 6. Validate The Result

- Validate all newly changed files.
- If a repo-wide validator exists, run it and separate pre-existing failures from your changes.
- Do not claim full-workshop validation passed if unrelated baseline issues remain.
- Save validator output outside GitHub repos. Use `<validation-report-folder>` and move any generated `VALIDATION-RESULT.md` file there after the run.

### 7. Report Clearly

- List the files you changed.
- State which quiz mode you used.
- State the badge path you configured.
- State whether validation passed for the changed files.
- State where the validation report was saved in local files.
- If repo-wide validation still fails, list only the pre-existing issues relevant to the user’s next step.
