# Fixomat User Manual

## Introduction

Fixomat is a cross-platform utility for LiveLabs content maintenance. It combines Markdown auto-fixing and image optimization in one UI so authors can clean workshop files from a single tool.

**Use Fixomat to accelerate workshop cleanup before publishing: it can fix common Markdown issues and resize oversized screenshots to LiveLabs limits.**

Estimated Time: x

### About Fixomat

Fixomat supports three modes:
* Fix Markdown only
* Optimize images only
* Run both in sequence

Markdown mode applies built-in fixes and reports remaining manual issues. Images mode resizes large JPEG/PNG files and can use `oxipng` for extra PNG compression.

### Objectives

In this lab, you will:
* Install Fixomat on macOS or Windows
* Launch Fixomat and select a workshop folder
* Run Markdown and image cleanup modes
* Review logs and follow up on any manual items

### Prerequisites

This lab assumes you have:
* A copy of the Fixomat application package for your operating system
* A workshop folder containing Markdown files and/or images

## Task 1: Install Fixomat

### macOS (Arm)

**One-line installation** — Open Terminal and run:

```
<copy>
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/oracle-livelabs/common/main/sample-livelabs-templates/create-labs/labs/fixomat/install-macos.sh)"
</copy>
```

### Windows (x64)

**One-line installation**

1. Open PowerShell and run:

    ```
    <copy>
    Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/oracle-livelabs/common/main/sample-livelabs-templates/create-labs/labs/fixomat/install-windows.ps1'))
    </copy>
    ```

## Task 2: Launch Fixomat

1. Launch **LiveLabs Fixomat 2000** from your operating system.

    **Windows:**
    Search for `LiveLabs Fixomat 2000` in the Start Menu, or run the executable from `%LOCALAPPDATA%\Programs\LiveLabs Fixomat 2000`.

    **macOS:**
    Open **Applications** and launch `LiveLabs Fixomat 2000.app`.

2. Confirm the main Fixomat window opens with mode selection, folder picker, and output console.

## Task 3: Run Fixomat on a Workshop

1. Click **Select folder** and choose your workshop root directory.

2. Choose one mode:

    * `Fix Markdown only` for Markdown cleanup
    * `Optimize images only` for image resizing/compression
    * `Fix Markdown + Optimize images` to run both

3. Click **Run**.

4. Wait for completion and review the summary.

    > Note: Markdown output may include `MANUAL` findings that still require human review.

5. Optionally click **Save Log** to export the full run output to `fixomat.log`.

## Task 4: Interpret Output and Follow Up

1. Review Markdown results:

    * `FIXED` lines indicate changes applied automatically
    * `MANUAL` lines indicate issues that require editing

2. Review image results in summary fields:

    | Field | Description |
    | --- | --- |
    | Resized | Number of images resized to max dimension |
    | Optimized | Number of PNG images optimized without resizing |
    | Skipped | Number of images that needed no changes |
    | Failed | Number of image files that could not be processed |
    | Before | Total image size before processing |
    | After | Total image size after processing |
    | Saved | Total space saved |

3. Re-run Fixomat after manual edits if required.

## FAQ

### macOS: The app is blocked by security settings

If macOS warns that the app cannot be verified, open **System Settings > Privacy & Security** and allow the app to run.

### Windows: SmartScreen warning appears

If Microsoft Defender SmartScreen appears, click **More info**, then **Run anyway**.

## Acknowledgements

* **Last Updated By/Date:** LiveLabs Team, March 2026
