# Quiz Modes

Use these three modes only. If the user does not specify a mode, ask.

## Option 1: Additional Lab At End

Use when the user wants a dedicated quiz lab appended to a workshop.

Required prompts to the user:
- Confirm this is `Option 1`
- Ask for the active manifest path to update
- Confirm quiz count if the content suggests a number outside the 5-10 range

Rules:
- Preserve all existing instructional labs verbatim.
- Create one new lab folder at the end of the workshop sequence.
- Add a same-named markdown file and an `images/` folder.
- Update only the manifest the user names.
- Use 5-10 scored questions.
- Use `passing: 75`.
- Use a badge path relative to the new lab, default `images/badge.png`.

Pattern:
- Example manifest:
  `<workshop-root>/manifest.json`

## Option 2: FastLab Append In Place

Use when the workshop is a short FastLab, typically 15 minutes, and the quiz should stay in the same markdown file.

Rules:
- Preserve all existing instructional content verbatim.
- Append one `Check Your Understanding` section at the end of the same markdown file.
- Use exactly 3 scored questions.
- Use `passing: 75`.
- Use a badge path relative to that markdown file, default `images/badge.png`.

Pattern:
- Example file:
  `<fastlab-markdown-file>`

## Option 3: Distribute Quizzes Inside Existing Lab Markdown

Use when the quiz should appear within existing lab markdown at valid section boundaries.

Required prompts to the user:
- Confirm this is `Option 3`
- Ask whether to:
  - split a lab into a new `Check Your Understanding` task, or
  - insert quiz blocks under existing sections

Rules:
- Preserve all existing instructional content verbatim.
- Spread questions evenly across major conceptual boundaries.
- Do not place quizzes before the first hands-on task, inside code blocks, or mid-step.
- Do not require a passing score.
- Badge unlocks when the learner completes all quiz blocks.
- Keep a badge path relative to the markdown file, default `images/badge.png`.

Pattern:
- Example file:
  `<lab-markdown-file>`
