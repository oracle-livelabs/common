# Workshop Template

Use this bundled template when you want a full copyable starter instead of generating a scaffold from a script.

This template is intentionally neutral:

- no author-specific home-directory paths,
- no machine-specific mappings,
- no hard-coded user names,
- no dependency on `/Users/<name>/...`.

## Included Files

- `WORKSHOP-DETAILS.md`
- `TRACEABILITY.md`
- `introduction/introduction.md`
- `lab-template/lab-template.md`
- `workshops/tenancy/index.html`
- `workshops/tenancy/manifest.json`
- `workshops/sandbox/index.html`
- `workshops/sandbox/manifest.json`
- `workshops/desktop/index.html`
- `workshops/desktop/manifest.json`

## How To Use

1. Copy `workshop-template/` to a new workshop folder.
2. Rename `lab-template/` and `lab-template.md` to your first real lab slug.
3. Add more lab folders as needed.
4. Replace placeholder titles, descriptions, outline items, and acknowledgements.
5. Update each manifest to match the final lab list.

## Placeholder Rules

- Keep all folder names lowercase with dashes.
- Keep markdown filenames equal to their folder names.
- Keep image filenames lowercase.
- Keep examples and paths generic unless the user explicitly gives a real destination.
