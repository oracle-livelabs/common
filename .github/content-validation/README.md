# Content Validation Workflow

This rule set reviews changed Markdown content in pull requests for recurring AI-associated wording and writing patterns. It is an editorial aid, not an authorship detector. A finding requires human review; it is not proof that a person or tool produced the text.

## What changed from the source list

The source list was useful as a vocabulary bank but too broad for automatic review. The workflow therefore uses three tiers:

- **High-signal terms**: 18 abstract, promotional, or metaphorical terms that contribute to a cluster score.
- **Context terms**: 10 words retained for context but not flagged in isolation because they are legitimate technical vocabulary.
- **Phrases**: 26 formulaic constructions grouped by purpose, with regex variants where wording changes predictably.

The workflow intentionally removes ordinary transitions such as `for example`, `for instance`, `furthermore`, `moreover`, `additionally`, and `in addition`. It also removes ordinary technical terms such as `support`, `enable`, `optimize`, `integrate`, `requirement`, `outcome`, `framework`, and `implementation` from high-signal scoring. Those words can be useful and do not provide a reliable editorial signal by themselves.

Punctuation and formatting remain review-only style signals. A single em dash, colon, parenthetical, bold span, or semicolon is normal. Repetition is what creates a finding.

The automated list also omits title-case headings, sentence-fragment headings, repeated numbered lists, repeated heading-plus-explanation blocks, parallel bullets, balanced three-part lists, and slash pairs beyond the small allowlisted examples. Those patterns are common in LiveLabs structure or too dependent on context to be useful as automatic flags; existing Markdown validation and human review cover them better.

## Annotated compact list

| Group | Items | Review cue |
| --- | --- | --- |
| High-signal terms | `delve`, `utilize`, `harness`, `foster`, `empower`, `elevate`, `unlock`, `streamline`, `underscore`, `showcase`, `illuminate`, `holistic`, `multifaceted`, `pivotal`, `transformative`, `tapestry`, `paradigm`, `journey` | Replace only when the word hides the actor, action, evidence, or result. |
| Context terms | `leverage`, `robust`, `comprehensive`, `seamless`, `nuanced`, `strategic`, `landscape`, `framework`, `ecosystem`, `stakeholder` | Review in a cluster; keep when the technical meaning is concrete. |
| Importance and scene-setting | `It is important to note that`, `It is worth noting that`, `It is essential to understand`, `In today's rapidly evolving world`, `In an increasingly digital world`, `In the modern landscape`, `In the ever-changing landscape` | State the fact or technical context directly. |
| Metaphorical framing | `As we navigate`, `At the heart of`, `At its core`, `This is where X comes in`, `Moving forward`, `Looking ahead` | Name the workflow, mechanism, owner, or next action. |
| Stock importance claims | `A key consideration is`, `A crucial role in`, `This highlights the importance of`, `This underscores the need for`, `The key takeaway is` | State the criterion, role, evidence, or conclusion. |
| Stock caveats and transitions | `There is no doubt that`, `It goes without saying`, `Needless to say`, `That being said`, `With that in mind`, `On the other hand`, `It depends on several factors` | Remove ceremony; describe the actual relationship or condition. |
| Promotional and breadth claims | `A powerful tool for`, `A game-changer for`, `A testament to`, `A cornerstone of`, `A wide range of`, `A variety of`, `Several key factors` | Name the capability, evidence, or complete set of items. |
| Reader and document framing | `Let's dive in`, `Here's what you need to know`, `The following sections will`, `This guide will walk you through`, `Let's break this down`, `Step by step` | Keep only when it improves navigation; prefer the next concrete instruction. |
| Formulaic contrasts | `It is not about X; it is about Y`, `X is more than just Y`, `Not one-size-fits-all`, `No silver bullet`, `Both X and Y play an important role` | Explain the actual distinction or tradeoff. |
| Stock quality claims | `A clear and concise overview`, `A comprehensive solution`, `A seamless experience`, `A robust framework`, `A scalable and flexible approach` | Replace adjectives with scope, behavior, limits, or measured outcome. |
| Style repetition | Repeated em dashes, semicolons, colon-led explanations, parenthetical asides, bold emphasis, or slash constructions | Review the pattern only when it is repeated enough to make the prose uniform or interrupt direct instructions. |

The machine-readable source of truth is [`rules.json`](rules.json). It keeps rationale beside each pattern so later edits can remove, merge, or tune a rule without losing the editorial decision.

## Review policy

The workflow reviews the first Markdown H1 as the title and then the full prose body. It ignores fenced code blocks and inline code so commands and identifiers do not inflate the score. It reports all matches with file and line numbers. The check fails only for a cluster: at least three high-signal terms, at least two phrase matches, or at least six total signals in one file. A clean file and a file with one isolated match pass.
