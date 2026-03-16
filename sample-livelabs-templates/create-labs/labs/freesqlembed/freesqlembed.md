# Embed FreeSQL Editors in a LiveLab

## Introduction

You can embed live FreeSQL editors directly inside a LiveLab markdown file. This lets learners run SQL inline while they read each task.

Estimated Time: 10 minutes

### Objectives

In this lab, you will:

- Add a FreeSQL embedded editor to markdown
- Understand which iframe fields are required vs optional
- Verify the expected runtime behavior in LiveLabs
- Troubleshoot common embed issues

### Prerequisites


## Task 1: Create your SQL or PL/SQL code on freesql.com

copy the embed code


## Task 2: Paste the code in your LiveLabs Markdown


## Task 3: Validate Runtime Behavior

After rendering your lab page, verify the embed behavior.

1. Open the lab in a browser and navigate to the section with the FreeSQL iframe.

2. Confirm visual and load behavior:

    - The editor appears with a light gray border
    - The editor occupies the full available content width
    - The embed loads when near the viewport (lazy behavior)

## FAQ

### Do I need to update all iframe attributes for each new snippet?

No. Do not change any attributes. The will be our Redwood design.

### Why does the editor height look different from 460px?

Redwood overrides apply responsive height behavior to provide enough room for editor and results.

## Acknowledgements

* **Author** - LiveLabs Team
* **Last Updated By/Date** - LiveLabs Team, March 2026
