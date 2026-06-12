# Create Workshops from Blog Posts

## Introduction

This lab shows how to use Codex and the `livelabs-workshop-author` skill to turn a source article into a draft LiveLabs workshop with a clear lab plan, strong structure, and validator-aligned markdown.

This lab uses the Oracle Database blog post `Getting Started with Private AI Services Container` as the source. 

### Objectives

In this lab, you will:

- Use a simple prompt to create a workshop from a blog post
- Convert source narrative into a LiveLabs lab plan
- Shape a first lab that starts the hands-on flow
- Preserve exact commands while cutting extra prose
- Review the generated workshop for structure, teaching flow, and source fidelity

**Estimated Time:** 15 minutes

## Task 1: Start With A Simple Source-To-Workshop Prompt

Perform the following set of steps to create a clean first prompt that turns source material into a draft workshop:

1. Use `livelabs-workshop-author` when the source is a blog post, product doc, tutorial page, or similar reference rather than an existing workshop.

2. Keep the first prompt simple. Give Codex the source URL, output path, intended audience, and target workshop shape.

3. Use a prompt like this:

    ```text
    $livelabs-workshop-author create a new LiveLabs workshop from this source blog post.
    Source: https://blogs.oracle.com/database/getting-started-with-private-ai-services-container
    Output: /path/to/private-ai-services-container-workshop
    Audience: database developers and platform engineers
    Variant: sandbox
    Create an introduction and 3 labs.
    Lab 1 should start the hands-on flow.
    Use only the source content and convert it into workshop tasks.
    ```

**Note:** Do not add validator rules, markdown contract text, or writing rules to the prompt. The skill already owns those internal steps.

## Task 2: Convert The Blog Into A Real Lab Plan

Perform the following set of steps to convert the source blog into a practical lab sequence built around learner actions.

1. Review the source and convert it into learner actions instead of copying the blog headings as-is.

2. For the Private AI Services Container article, a strong first-draft workshop plan is:

    - `Introduction`: explain what the container does, when to use it, and what the learner will complete
    - `Lab 1`: prepare the environment, pull the container image, and extract the startup scripts
    - `Lab 2`: run the container over HTTP, validate the service, list models, and generate embeddings
    - `Lab 3`: switch to HTTP/SSL, secure the endpoint with an API key, call the API, and review metrics

3. Use the blog workflow, commands, and outcomes as the source of truth for the lab sequence.

**Note:** Do not mirror the source article mechanically. A good workshop uses the article to build a learner journey, not a prose summary.

## Task 3: Make Lab 1 Start The Hands-On Work

Perform the following set of steps to make **Lab 1** start the hands-on workflow instead of staying in background setup:

1. Keep `Lab 1` practical. Start the first real task there instead of spending the whole lab on background.

2. In this example, `Lab 1` should start with environment preparation:

    - Confirm container runtime prerequisites
    - Pull the `privateai` image from Oracle Container Registry
    - Extract the setup scripts from the image
    - Prepare the host folders and values needed for startup

3. Turn environment-specific assumptions into explicit TODO markers instead of pretending the values are known.

4. Preserve exact commands, image names, ports, and file names from the source when they appear in the blog post.

## Task 4: Preserve Commands And Cut Prose Bloat

Perform the following set of steps to keep technical commands exact while tightening the surrounding instructional text:

1. Keep technical commands exact.

2. Rewrite the surrounding explanation so it is shorter, more direct, and easier to follow in workshop form.

3. For this blog example, preserve commands and artifacts such as:

    - Pulling the `container-registry.oracle.com/database/privateai:latest` image
    - Extracting `/opt/setup-scripts` from the container
    - The HTTP startup script
    - The HTTP/SSL startup script
    - The `/v1/models` and `/v1/embeddings` API checks

4. Convert blog narration into task language:

    - What the learner must do
    - What command they must run
    - What success state they should see
    - What values still need replacement

## Task 5: Review The Generated Workshop Like An Editor

Perform the following set of steps to review the generated workshop for structure, accuracy, and source fidelity:

1. After generation, review the result against the source article.

2. Check these items first:

    - The workshop has an `Introduction` plus the intended lab sequence
    - `Lab 1` starts the hands-on flow
    - Every major command or API call in scope is preserved accurately
    - Source prose was converted into numbered learner steps
    - Unsupported claims were not invented
    - Environment-specific gaps are marked clearly as TODO items

3. Then verify these LiveLabs authoring details:

    - Each file has the required sections
    - Task headers are in the right format
    - Estimated time labels are present
    - Acknowledgements are present
    - `Learn More` links include the source article when useful

## Task 6: Use Follow-Up Prompts That Fix The Right Problem

Perform the following set of steps to use targeted follow-up prompts that correct the specific weakness in the generated workshop:

1. If the generated workshop reads too much like the source article, ask for a structure pass instead of a generic polish pass.

2. Use a prompt like this when the output stayed too narrative:

    ```text
    Rework this workshop so each lab follows the learner workflow from the source.
    Convert narrative paragraphs into clearer tasks and numbered steps.
    Keep commands and URLs exact.
    ```

3. Use a prompt like this when the workshop invented values that should stay open:

    ```text
    Recheck the generated workshop against the source article.
    Replace any invented host names, credentials, API keys, or file paths with explicit TODO markers unless the source states them directly.
    ```

4. Use a prompt like this when the workshop needs a stronger lab split:

    ```text
    Re-split the workshop into an introduction plus 3 labs.
    Keep Lab 1 hands-on.
    Use Lab 2 for HTTP validation and embeddings.
    Use Lab 3 for HTTP/SSL, API key protection, and metrics review.
    ```

## Task 7: Expect A Useful Delivery Summary

Perform the following set of steps to verify that Codex returns a useful delivery summary and that the output matches the intended workshop shape:

1. Expect Codex to report:

    - The generated workshop path
    - Files created or updated
    - The source used
    - The lab plan it chose
    - Validation status
    - Unresolved TODO items that still need SME input

2. Before you finish, confirm:

    - The correct source URL was used
    - The output path was correct
    - The lab split matches the source workflow
    - The commands stayed accurate
    - The final markdown reads like a workshop, not a blog summary

## Learn More

- [Oracle Database Blog: Getting Started with Private AI Services Container](https://blogs.oracle.com/database/getting-started-with-private-ai-services-container)
- [Oracle LiveLabs How-To](https://livelabs.oracle.com/how-to)

## Acknowledgements

* **Author** - Linda Foinding, Principal Product Manager, Outbound Database Product Management
* **Last Updated By/Date** - Teodor C. Nechita, June 2026
