# LiveLabs Workshop Structure

Use this as the canonical skeleton for new workshops. It applies whether you start from an existing workshop or from source material alone such as a blog post or product documentation.
The same skeleton is bundled as a copyable template under `templates/workshop-template/`.
You do not need a GitHub repository or an existing LiveLabs template repository to use this structure. The bundled scaffold and template are enough to create a compliant workshop in any writable destination folder.

## Required Root Layout

```
<workshop-root>/
  WORKSHOP-DETAILS.md      # recommended reusable metadata for setup fields
  introduction/
    introduction.md
  <lab-a>/
    <lab-a>.md
    images/
    files/                # optional
  <lab-b>/
    <lab-b>.md
    images/
    files/                # optional
  variables/              # optional
    variables.json
  workshops/
    tenancy/
      index.html
      manifest.json
    sandbox/
      index.html
      manifest.json
    desktop/
      index.html
      manifest.json
```

## Folder and File Naming

- Use lowercase names and dashes only.
- Keep each lab markdown filename equal to its folder name:
  - `setup/setup.md`
  - `data-load/data-load.md`
- Keep image filenames lowercase.
- Do not hard-code author-specific local paths in the skill's own scripts, examples, manifests, or reference docs. Use placeholders such as `/path/to/my-workshop` instead.
- When a user runs the skill to generate a workshop, they may still choose any real local output path that fits their environment.
- Keep `WORKSHOP-DETAILS.md` at the root when you need reusable short description, long description, outline, and prerequisites text for workshop setup forms.

## Manifest Requirements

Each `workshops/<variant>/manifest.json` should include:

- `workshoptitle`
- `help` (team alias)
- `tutorials` array with ordered workshop flow
- `variables` array when variable files are used
- `include` object when external files are injected into rendering

Each tutorial item should include:

- `title`
- `filename`
- `description` when useful

Use:

- relative paths for local labs, for example `../../setup/setup.md`
- approved absolute URLs for shared common labs

## Typical Tutorial Sequence

Depending on variant, use this order pattern:

1. `Get Started` prerequisite lab (optional but common in sandbox/tenancy)
2. `Introduction`
3. `Lab 1 ...`
4. `Lab 2 ...`
5. additional labs
6. `Need Help?`

## Scaffold Notes

- The bundled `scripts/scaffold_workshop.sh` can generate a starter workshop with no external sample path.
- The generated `workshops/<variant>/index.html` files should be full LiveLabs loader pages, not placeholder HTML stubs.
- The scaffold supports `--title`, `--help`, `--variants`, and `--no-need-help` so authors can reduce immediate cleanup.
- If you already have a preferred sample workshop, pass it explicitly with `--sample /path/to/sample-workshop`.
- The bundled QA flow is `bash scripts/run_workshop_qa.sh <workshop-root>`.
- Use `bash scripts/smoke_test_preview.sh <workshop-root> [variant]` after scaffolding or manifest edits.
