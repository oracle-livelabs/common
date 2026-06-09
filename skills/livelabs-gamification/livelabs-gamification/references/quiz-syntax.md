# Quiz Syntax

Use the markdown patterns below exactly.

## Quiz Config

Place one `quiz-config` block near the top of the markdown file:

```quiz-config
passing: 75
badge: images/badge.png
```

Notes:
- For scored quizzes, use `passing: 75` unless the user explicitly overrides it.
- Badge paths must be relative to the markdown file.
- If the badge image does not exist yet, keep the relative path and tell the user where to place the file.

## Single-Answer Quiz

```quiz
Q: Your question text here?
* Correct answer
- Wrong answer
- Wrong answer
> Explanation shown after answering
```

## Scored Quiz

```quiz score
Q: Your question text here?
* Correct answer
- Wrong answer
- Wrong answer
> Explanation shown after answering
```

## Multiple Questions In One Block

```quiz score
Q: First question?
* Correct answer
- Wrong answer
- Wrong answer
> Explanation

Q: Second question?
- Wrong answer
* Correct answer
- Wrong answer
> Explanation
```

## Question Constraints

- Prefer exactly one correct answer.
- Use 3-4 answer choices.
- Include an explanation for every question.
- Write conceptual questions that test why or when, not rote recall.
- Keep explanations instructional. Do not merely restate the answer.
