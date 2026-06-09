# FreeSQL Installation And Use Guide

## What The Skill Can Do

- work with freesql.com in a real browser session
- write, run, and troubleshoot SQL, PL/SQL, Quick SQL, and JavaScript examples
- capture result screenshots, share links, run buttons, or embedded editor iframe code

## Core Rules

- use a real browser when UI behavior or screenshots matter
- verify query results before claiming success
- capture screenshots for visible outputs when requested
- do not fabricate share links or iframe code

## Installation Process

Give Codex this prompt:

```text
Install `freesql` skill into my local Codex skills directory. Inspect `SKILL.md`, use the embedded `name:` `freesql` as the installed folder name, ignore `__MACOSX`, `__pycache__`, and `*.pyc`, and verify the installed copy after copying.
```

After installation, ask Codex to verify that the installed folder exists and that `SKILL.md` contains the expected `name:` value.

## How To Prompt It

Start with `$freesql` and give Codex the target path or content.

## What To Include In Your Request

- SQL, PL/SQL, Quick SQL, or JavaScript content
- whether the result should be executed, screenshotted, shared, or embedded
- schema or sample data requirements
- browser/session constraints

## Recommended Prompt Patterns

### Run SQL In Browser

```text
$freesql open FreeSQL and run this SQL example, then capture the result screenshot: select * from dual;
```

### Create Shareable Example

```text
$freesql build a FreeSQL example for a simple customer table and return a Run in FreeSQL link plus iframe code if available
```

## Common Pitfalls

- asking for browser proof but not allowing a browser session
- assuming generated SQL ran successfully without checking results
- requesting share links from content that was not actually created in FreeSQL

## Expected Output From Codex

- executed statement or created worksheet content
- result summary
- screenshot path when captured
- share link or iframe snippet when generated
- UI issues or limitations encountered

## Quick Checklist

- embedded name is `freesql`
- package ZIP exists
- browser path is clear when screenshots are needed
- output includes result proof or a clear reason why proof was not possible

## Versioning History

- version 1.0 - 05/11/26
