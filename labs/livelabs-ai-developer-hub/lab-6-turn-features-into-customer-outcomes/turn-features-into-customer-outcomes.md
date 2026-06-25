# Turn Features into Customer Outcomes

## Introduction

This lab shows how to use Codex and the `livelabs-industry-converter` skill to create an industry-specific version of an existing Oracle LiveLabs workshop without flattening the teaching flow.

You will learn how to give the skill a simple prompt, what it handles automatically, and what to review after conversion so the result stays close to the source workshop.

### Objectives

In this lab, you will:

- Use the simplest supported prompt shape for the converter
- Provide the source workshop path, target industry, and optional company and output path
- Understand what the skill does automatically during conversion
- Review the converted workshop for fidelity, screenshots, and leftover source-domain residue
- Review side-by-side live server comparisons of the source and converted workshops
- Avoid common mistakes such as over-specifying the prompt or trusting validator output alone

**Estimated Time:** 10 minutes

## Task 1: Start With The Simplest Prompt

Perform the following set of steps to start with the simplest supported industry-conversion prompt and the minimum required inputs:

1. Use `livelabs-industry-converter` when you want Codex to inspect an existing workshop and produce a target-industry version with the same teaching flow.

2. Provide these inputs:

    - Source workshop path
    - Target industry
    - Optional company name
    - Optional output path

3. Use a prompt like this:

    ```text
    $livelabs-industry-converter convert this workshop to the finance industry.
    Source: /path/to/source/workshop
    Output: /path/to/output/industries/finance
    Company: Seer Equity
    ```

4. If you omit `Output:`, expect the skill to create a reasonable default under an `industries/<industry-slug>` path beside the source workshop.

5. If you omit `Company:`, expect the skill to use a credible generic company instead of over-branding the workshop.

## Task 2: Let The Skill Handle The Internal Logic

Perform the following set of steps to keep the prompt simple and let the skill handle its built-in conversion workflow:

1. Do not pack the prompt with validator rules, grading instructions, prose rules, or conversion mechanics. The skill already handles that internal workflow.

2. The skill already handles the internal workflow:

    - Inspect the source workshop and treat it as canonical
    - Detect lab order, manifest structure, shared assets, and launch flow
    - Map source entities into the target industry
    - Rewrite labs, manifests, sample data, statuses, IDs, and output artifacts
    - Preserve screenshots and image coverage
    - Validate LiveLabs structure and launch flow
    - Check for leftover source vocabulary
    - Compare the converted workshop back to the source for fidelity

## Task 3: Know What The Skill Tries To Preserve

Perform the following set of steps to understand what the converter should preserve and what it should rewrite:

1. The converter is designed to preserve the source workshop before it rewrites anything.

2. Expect it to preserve:

    - Lab order
    - Section order
    - Task count
    - Step count
    - Explanatory depth
    - Generic product setup wording
    - Screenshots and visual callouts

3. Expect it to rewrite only the parts that truly need industry conversion, such as:

    - Personas
    - Business objects
    - Table names
    - Statuses
    - Sample records
    - Report labels
    - Dashboard labels
    - Output examples

4. This means generic labs should remain close to the source, while domain-specific labs should feel native to the target industry.

## Task 4: Review The Output Like An Editor

Perform the following set of steps to review the converted workshop for fidelity, completeness, and unnecessary rewriting:

1. After the conversion, review the updated workshop side by side with the source.

2. Check these items first:

    - No missing labs
    - No missing tasks
    - No missing numbered steps
    - No shortened introductions or conclusions
    - No dropped screenshots or images
    - No leftover source-domain nouns

3. Then check for unnecessary rewriting:

    - Generic setup wording should still look close to the source
    - Sentence structure should stay close where no domain change was needed
    - SQL and sample code should stay proportionate to the source instead of becoming larger or more custom than necessary

## Task 5: Review Live Server Comparison Screenshots

Perform the following set of steps to use side-by-side screenshots to compare the converted workshop against the source:

1. Use the live server screenshots below as a concrete example of what a source-fidelity review looks like.

2. In these comparisons, the finance version is on the left and the original Oracle AI Database 26ai workshop is on the right.

3. Review the introduction pages side by side:

    ![Finance workshop introduction on the left and the AI World 25 source introduction on the right in a live side-by-side browser capture with labels on both titles](./images/01-finance-vs-aiworld-intro-live-desktop.png)

    Side-by-side live server comparison of the introduction pages with labels that mark the finance rewrite and the source.

4. Review Lab 1 side by side at the SQL conversion point:

    ![Finance Lab 1 domain definitions on the left and the AI World 25 Lab 1 healthcare domain definitions on the right in a live side-by-side browser capture with red boxes around the SQL blocks](./images/02-finance-vs-aiworld-lab1-live-desktop.png)

    This view highlights how healthcare entities were mapped into finance entities while the task structure and SQL teaching pattern stayed intact.

5. Review Lab 2 side by side at the first JSON task:

    ![Finance Lab 2 client and review SQL on the left and the AI World 25 Lab 2 patient and appointment SQL on the right in a live side-by-side browser capture with red boxes around the SQL blocks](./images/03-finance-vs-aiworld-lab2-live-desktop.png)

    This view highlights the domain-specific SQL conversion from patients and appointments to clients and reviews.

## Task 6: Watch For The Common Failure Modes

Perform the following set of steps to spot the most common conversion failure modes before approving the output:

1. Watch for these failure modes:

    - Content was shortened between steps
    - Generic labs were paraphrased without a need
    - Screenshots were referenced but not preserved in the right place
    - Validator-driven edits appended new text instead of merging into the restored source section

2. If you see drift, ask Codex for a strict side-by-side pass on the affected labs instead of a generic polish pass.

## Task 7: Use Follow-Up Prompts That Fix The Right Thing

Perform the following set of steps to choose follow-up prompts that repair the exact kind of drift or duplication you found:

1. If the conversion is too loose, ask for a fidelity pass instead of a rewrite.

2. Use a prompt like this when the output was shortened:

    ```text
    Recheck this conversion line by line against the source workshop.
    Restore any skipped steps, shortened explanations, and missing screenshots.
    Keep generic wording close to the source and rewrite only what the industry change requires.
    ```

3. Use a prompt like this when a repair pass introduced duplication:

    ```text
    Recheck your work for duplicated content introduced during the repair pass.
    Remove repeated intro blocks, repeated objective sections, repeated notes, and repeated task text without cutting the restored content.
    ```

4. Use a prompt like this when only certain labs drifted:

    ```text
    Recheck Labs 3 and 4 side by side against the source workshop.
    Keep the source structure, screenshots, and sentence flow wherever the content is generic.
    ```

## Task 8: Expect A Useful Delivery Summary

Perform the following set of steps to confirm that the converter returns a useful delivery summary and that the final workshop still launches correctly:

1. Expect Codex to report:

    - Converted workshop path
    - Files created or updated
    - Domain mapping summary
    - Source-fidelity summary
    - QA summary
    - Unresolved SME gaps if any remain

2. Before you finish, confirm:

    - The source path was correct
    - The target industry was correct
    - The output path was correct
    - The workshop still launches through the intended manifest
    - The converted labs preserve the source flow
    - No duplicate content was introduced during repair

## Acknowledgements

* **Author** - Linda Foinding, Principal Product Manager, Database Outbound Product Management
* **Last Updated By/Date** - Teodor C. Nechita, June 2026
