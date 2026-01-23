# LiveLabs Markdown Validator

A GitHub Action workflow that validates Markdown files in Pull Requests against LiveLabs formatting standards.

## Overview

This validator ensures that Markdown content submitted in PRs follows the established LiveLabs workshop formatting conventions. It runs automatically on any PR that modifies `.md` files.

## Features

- Validates only changed Markdown files (not the entire repository)
- Checks both standard Markdown formatting and LiveLabs-specific syntax
- Verifies referenced images exist
- Enforces filename conventions
- Provides detailed error and warning messages
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

| Rule | Severity | Description |
|------|----------|-------------|
| H1 Title | ERROR | First line must be `# Title` |
| Single H1 | ERROR | Only one H1 heading per file |
| Acknowledgements | ERROR | Must have `## Acknowledgements` section |
| Author Format | WARNING | Acknowledgements should include `**Author**` or `**Authors**` |
| Image Alt Text | ERROR | Images must have alt text: `![description](images/file.png)` |
| Task Format | WARNING | Task headers should be `## Task N: Description` |
| Copy Tags | ERROR | `<copy>` and `</copy>` tags must be balanced |
| Introduction | WARNING | Labs with Tasks should have `## Introduction` |
| Objectives | WARNING | Consider adding `### Objectives` section |
| Estimated Time | ERROR | Non-introduction files must have `Estimated Time:` |
| Workshop Time | ERROR | `introduction.md` must contain `Estimated Workshop Time:` |
| Lowercase Images | ERROR | Image filenames must be lowercase |

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

### Example Output

```
================================================
LiveLabs Markdown Formatting Validator
================================================

Checking: ./introduction/introduction.md
PASS: ./introduction/introduction.md passed all required checks

Checking: ./my-lab/my-lab.md
ERROR: ./my-lab/my-lab.md: Missing '## Acknowledgements' section
WARNING: ./my-lab/my-lab.md: Consider adding 'Estimated Time:' information

================================================
Summary
================================================
Errors: 1
Warnings: 1

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

- Change `log_error` to `log_warning` to downgrade a rule
- Comment out checks you don't want to enforce
- Add new checks following the existing patterns

### Example: Make Acknowledgements Optional

In `validate-livelabs-markdown.sh`, change:
```bash
log_error "$file: Missing '## Acknowledgements' section"
```
to:
```bash
log_warning "$file: Missing '## Acknowledgements' section"
```

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
    │   └── validate-livelabs-markdown.sh  # LiveLabs validation script
    └── workflows/
        └── markdown-lint.yml              # GitHub Actions workflow
```

## Contributing

To improve the validator:

1. Test changes locally with sample files
2. Ensure no false positives on valid LiveLabs content
3. Update this README if adding new rules

## License

Internal use for Oracle LiveLabs workshops.
