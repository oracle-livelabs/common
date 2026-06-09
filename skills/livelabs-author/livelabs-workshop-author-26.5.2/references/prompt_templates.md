# Prompt Templates

Use these when the user needs a predictable prompt shape in the playground.

## Create From Sources

```text
$livelabs-workshop-author-26.5.2
Mode: publish-ready
Create a LiveLabs workshop from these sources:
- <source 1>
- <source 2>
Audience: <audience>
Target length: <minutes>
Outcome: <what learner should achieve>
Include FreeSQL content when runnable SQL improves the lab.
```

## Create Lab 1 Only

```text
$livelabs-workshop-author-26.5.2
Mode: how-to-guide
Create lab 1 only from this source:
- <source>
Lab title: <title>
Target workshop length: <minutes>
Include one FreeSQL example if useful.
```

## Add Embedded FreeSQL To A Lab

```text
$livelabs-workshop-author-26.5.2
Mode: publish-ready
Update this workshop:
Path: <workshop root>
Add FreeSQL inside the workshop, not as a link.
Lab: <lab path or title>
Target workshop length: <minutes>
Task outcome: <what the learner should do with the SQL result>
Use an embedded FreeSQL editor with the canonical LiveLabs iframe pattern.
```

## FastLab

```text
$livelabs-workshop-author-26.5.2
Mode: fastlab
Create a short LiveLabs workshop from:
- <source>
Target length: <minutes>
Focus on only the steps required to reach the learner outcome.
```

## QA Pass

```text
$livelabs-workshop-author-26.5.2
Mode: publish-ready
Review and tighten this workshop:
Path: <workshop root>
Target workshop length: <minutes>
Run QA, clean up LiveLabs formatting, tighten prose, and summarize any unresolved gaps.
```
