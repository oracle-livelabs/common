# QA Checklist

Check the changed files before finishing.

## Always Verify

- Original instructional content remains verbatim.
- Quiz material is appended only at valid boundaries.
- No certification language appears.
- All quiz blocks use valid `quiz` or `quiz score` syntax.
- Every question has one clear correct answer and 3-4 choices.
- Every question includes an explanation.
- Badge path is relative to the markdown file.

## Option 1

- New lab folder exists.
- New markdown file follows LiveLabs section requirements.
- `images/` folder exists.
- The named manifest includes the new tutorial entry in the correct sequence.
- Only the named manifest changed.

## Option 2

- The FastLab markdown still reads cleanly as one file.
- Exactly 3 scored questions were added.
- `quiz-config` exists once near the top.

## Option 3

- Questions are spread across valid section boundaries.
- No quiz interrupts step-by-step instructions.
- No passing score is enforced.
- Badge behavior is based on completing all quiz blocks.

## Validation Policy

- Require all newly changed files to pass validation.
- Report pre-existing repo issues separately.
- If repo-wide validation fails for unrelated reasons, distinguish those from the new work clearly.
- Save validation reports to `<validation-report-folder>`, not inside a GitHub repo.
