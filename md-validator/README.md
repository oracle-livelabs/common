# LiveLabs Markdown Validator

A GitHub Action workflow that validates Markdown files in Pull Requests against LiveLabs formatting standards.

## Overview

### New in Version 26.2 / Feb 2026 Update

The validator scripts and browser QA now share one rule set:

- Removed gerund/imperative verb checks from both the JS lint checker and the GitHub workflow scripts.
- Added inline `<a>` detection so HTML anchors must be written as Markdown links.
- Added Task-numbering and indentation validation (code blocks and images must live under their numbered steps).
- Synced the PowerShell script with the bash script so Windows authors see identical output.
- Published a new browser runtime (`redwood-hol/development/js/main.26.2.js`) carrying the same QA behavior.


This validator ensures that Markdown content submitted in PRs follows the established LiveLabs workshop formatting conventions. It runs automatically on any PR that modifies `.md` files.

## Features

- Validates only changed Markdown files (not the entire repository)
- Checks both standard Markdown formatting and LiveLabs-specific syntax
- Verifies referenced images exist
- Enforces filename conventions
- Provides detailed error messages
- Generates GitHub Actions summary report

## Installation

### Step 1: Copy Files to Your Repository

Copy these files to your workshop repository:

```
your-repo/
├── .markdownlint.json
└── .github/
    ├── scripts/
    │   └── validate-livelabs-markdown.sh
    └── workflows/
        └── markdown-lint.yml
```

### Step 2: Make Script Executable

```bash
chmod +x .github/scripts/validate-livelabs-markdown.sh
```

### Step 3: Commit and Push

```bash
git add .markdownlint.json .github/
git commit -m "Add LiveLabs Markdown validator"
git push
```

### Step 4: (Optional) Require Passing Checks

To block PRs that fail validation:

1. Go to repository **Settings** → **Branches**
2. Add or edit a branch protection rule for `main`
3. Enable **Require status checks to pass before merging**
4. Search for and select **Validate Markdown Formatting**

## What Gets Validated

### Standard Markdown Rules (via markdownlint)

| Rule | Description |
|------|-------------|
| MD001 | Heading levels increment by one |
| MD003 | ATX-style headings (`#` not underlines) |
| MD004 | Unordered lists use asterisks (`*`) |
| MD007 | 4-space indentation for nested lists |
| MD012 | No more than 2 consecutive blank lines |
| MD022 | Headings surrounded by blank lines |
| MD025 | Single H1 per file |
| MD029 | Ordered lists use sequential numbers |
| MD033 | Only allowed HTML: `<copy>`, `<br>`, `<sub>`, `<sup>`, `<if>`, `<img>` |
| MD041 | First line must be H1 |
| MD045 | Images must have alt text |
| MD046 | Code blocks use fenced style (triple backticks) |
| MD047 | Files end with newline |

### LiveLabs-Specific Rules (via custom script)

| Rule | Description |
|------|-------------|
| H1 Title | First line must be `# Title` |
| Single H1 | Only one H1 heading per file |
| Acknowledgements | Must have `## Acknowledgements` section |
| Image Alt Text | Images must have alt text: `![description](images/file.png)` |
| YouTube Format | YouTube embeds should use `[](youtube:VIDEO_ID)` |
| Task Format | Task headers should be `## Task N: Description` |
| Task Numbering | Task sections should include numbered steps (`1.`, `2.`, etc.) |
| Task Indentation | Code blocks and images must be indented within the numbered step |
| Copy Tags | `<copy>` and `</copy>` tags must be balanced |
| No Inline HTML | Raw `<a href=...>` tags are not allowed; use Markdown links |
| Introduction | Labs with Tasks should have `## Introduction` |
| Objectives | Must have `### Objectives` section |
| Estimated Time | Non-introduction files must have `Estimated Time:` |
| Workshop Time | `introduction.md` must contain `Estimated Workshop Time:` |
| Lowercase Images | Image filenames must be lowercase |

### Additional Checks

- **Image Existence**: Referenced images must exist at the specified path
- **Filename Conventions**: Markdown files must be lowercase with no spaces

## Usage

### Automatic (GitHub Actions)

The workflow triggers automatically when:
- A PR is opened or updated
- The PR contains changes to `.md` files

### Manual (Local Testing)

Test files locally before pushing:

```bash
# Validate all markdown files in a directory (recursive)
./.github/scripts/validate-livelabs-markdown.sh /path/to/workshop

# Validate specific files
./.github/scripts/validate-livelabs-markdown.sh path/to/lab.md another/file.md

# Validate all markdown files in current directory
./.github/scripts/validate-livelabs-markdown.sh
```

The script automatically detects if the argument is a directory and recursively finds all `.md` files within it.

#### Windows (PowerShell)

```powershell
# Validate all markdown files in a directory (recursive)
.\.github\scripts\validate-livelabs-markdown.ps1 C:\path\to\workshop

# Validate specific files
.\.github\scripts\validate-livelabs-markdown.ps1 path\to\lab.md another\file.md

# Validate all markdown files in current directory
.\.github\scripts\validate-livelabs-markdown.ps1
```

### Example Output

```
================================================
LiveLabs Markdown Formatting Validator
================================================

Checking: ./introduction/introduction.md
PASS: ./introduction/introduction.md passed all required checks

Checking: ./my-lab/my-lab.md
ERROR: ./my-lab/my-lab.md: Missing '## Acknowledgements' section
ERROR: ./my-lab/my-lab.md: Missing 'Estimated Time:' information

================================================
Summary
================================================
Errors: 2

Validation FAILED
```

## LiveLabs Markdown Format Reference

### Required Lab Structure

```markdown
# Lab Title

## Introduction

Description of the lab.

Estimated Time: 15 minutes

### Objectives

In this lab, you will:
* Objective 1
* Objective 2

### Prerequisites (Optional)

This lab assumes you have:
* An Oracle Cloud account
* Previous labs completed

## Task 1: Task Description

1. Step one.

   ![Alt text for image](images/screenshot.png)

2. Step two.

   > **Note:** Important information here.

3. Step three with code:

    ```sql
    <copy>SELECT * FROM table;</copy>
    ```

## Task 2: Another Task

1. More steps...

## Learn More (Optional)

* [Documentation](https://docs.oracle.com)

## Acknowledgements

* **Author** - Name, Title, Organization
* **Contributors** - Name, Organization
* **Last Updated By/Date** - Name, Month Year
```

### Special Syntax

#### Copy to Clipboard
```markdown
<copy>Text that users can copy</copy>
```

#### YouTube Videos
```markdown
[](youtube:VIDEO_ID)
```

#### Variables
```markdown
[](var:variable_name)
```
Variables are defined in JSON files referenced in `manifest.json`.

#### Notes
```markdown
> **Note:** Only one note per step.
```

#### Table with Title
```markdown
| Col 1 | Col 2 |
| --- | --- |
| A | B |
{: title="Table Title"}
```

## Customization

### Adjusting Rules

Edit `.markdownlint.json` to modify standard Markdown rules. See [markdownlint rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md) for options.

Edit `.github/scripts/validate-livelabs-markdown.sh` to modify LiveLabs-specific rules:

- Comment out checks you don't want to enforce
- Add new checks following the existing patterns

## Troubleshooting

### Workflow Not Triggering

- Ensure workflow file is in `.github/workflows/`
- Check that Actions are enabled in repository settings
- Verify PR contains `.md` file changes

### Script Permission Denied

```bash
chmod +x .github/scripts/validate-livelabs-markdown.sh
```

### False Positives

If valid content is flagged incorrectly:
1. Check if the rule can be adjusted in `.markdownlint.json`
2. Modify the script to handle the edge case
3. Open an issue describing the false positive

## Files Included

```
md-validator/
├── README.md                              # This documentation
├── .markdownlint.json                     # Markdownlint configuration
└── .github/
    ├── scripts/
    │   ├── validate-livelabs-markdown.sh  # LiveLabs validation script (Bash)
    │   └── validate-livelabs-markdown.ps1 # LiveLabs validation script (PowerShell)
    └── workflows/
        └── markdown-lint.yml              # GitHub Actions workflow
```

## Maintainer's Guide: File Locations

When adding or modifying validation rules, **multiple files must be updated** to keep everything in sync. This section documents all file locations.

### Source Files (Template for Other Repos)

These are the template files that users copy to their own repositories:

| File | Purpose |
|------|---------|
| `md-validator/.github/scripts/validate-livelabs-markdown.sh` | Bash validation script (Linux/macOS) |
| `md-validator/.github/scripts/validate-livelabs-markdown.ps1` | PowerShell validation script (Windows) |
| `md-validator/.github/workflows/markdown-lint.yml` | GitHub Actions workflow definition |
| `md-validator/.markdownlint.json` | Markdownlint configuration |
| `md-validator/README.md` | This documentation |

### Active Files (Running in oracle-livelabs/common)

These are the deployed files that actually run on PRs to the common repository:

| File | Purpose |
|------|---------|
| `.github/scripts/validate-livelabs-markdown.sh` | Active Bash validation script |
| `.github/workflows/markdown-lint.yml` | Active GitHub Actions workflow |
| `.github/workflows/enforce-image-size.yml` | Image size validation workflow |
| `.markdownlint.json` | Active markdownlint configuration |

### User Documentation

These files document the validation system for end users:

| File | Purpose |
|------|---------|
| `sample-livelabs-templates/create-labs/labs/prcheck/prcheck.md` | User guide for PR checks |

### Checklist: When Adding/Modifying Validation Rules

When you need to add or change a validation rule, update these files:

1. **Bash script** (2 locations):
   - `md-validator/.github/scripts/validate-livelabs-markdown.sh`
   - `.github/scripts/validate-livelabs-markdown.sh`

2. **PowerShell script** (1 location):
   - `md-validator/.github/scripts/validate-livelabs-markdown.ps1`

3. **Documentation** (3 locations):
   - `md-validator/README.md` - Update "LiveLabs-Specific Rules" table
   - `sample-livelabs-templates/create-labs/labs/prcheck/prcheck.md` - Update user-facing docs
   - This maintainer's guide if adding new files

4. **Workflow file** (if changing how checks run):
   - `md-validator/.github/workflows/markdown-lint.yml`
   - `.github/workflows/markdown-lint.yml`

5. **Markdownlint config** (if changing standard MD rules):
   - `md-validator/.markdownlint.json`
   - `.markdownlint.json`

### Quick Sync Commands

After updating the source files in `md-validator/`, sync to the active locations:

```bash
# Sync validation script
cp md-validator/.github/scripts/validate-livelabs-markdown.sh .github/scripts/

# Sync workflow
cp md-validator/.github/workflows/markdown-lint.yml .github/workflows/

# Sync markdownlint config
cp md-validator/.markdownlint.json .markdownlint.json
```

### Rule Implementation Locations

| Rule Type | Implemented In |
|-----------|---------------|
| Standard Markdown rules (MD001, MD003, etc.) | `.markdownlint.json` |
| H1 Title, Single H1 | `validate-livelabs-markdown.sh` (Rules 1-2) |
| Acknowledgements section | `validate-livelabs-markdown.sh` (Rule 3) |
| Image alt text | `validate-livelabs-markdown.sh` (Rule 5) |
| YouTube format | `validate-livelabs-markdown.sh` (Rule 6) |
| Task format | `validate-livelabs-markdown.sh` (Rule 7) |
| Copy tags | `validate-livelabs-markdown.sh` (Rule 8) |
| Introduction section | `validate-livelabs-markdown.sh` (Rule 10) |
| Objectives section | `validate-livelabs-markdown.sh` (Rule 11) |
| Estimated Time | `validate-livelabs-markdown.sh` (Rules 12-13) |
| Lowercase image filenames | `validate-livelabs-markdown.sh` (Rule 14) |
| Image existence check | `markdown-lint.yml` workflow |
| Filename conventions | `markdown-lint.yml` workflow |
| Image size validation | `enforce-image-size.yml` workflow |

## Contributing

To improve the validator:

1. Test changes locally with sample files
2. Ensure no false positives on valid LiveLabs content
3. Update ALL files listed in the Maintainer's Guide
4. Update this README if adding new rules

## License

Internal use for Oracle LiveLabs workshops.

## Changelog

- **Feb 2026**
  - Added inline HTML detection and Task indentation rules to both bash and PowerShell scripts.
  - Removed gerund checks to match the unified QA guidance.
  - Published `main.26.2.js` to keep the in-browser lint checker consistent with GitHub workflows.
