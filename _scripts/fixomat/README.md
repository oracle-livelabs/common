# Fixomat

Fixomat is a small UI app that lets you:
- Fix Markdown only
- Optimize images only
- Run both (Markdown + images)

It targets a **workshop root folder** and runs the existing LiveLabs Markdown auto-fixer plus OptiShot image optimization.

## Requirements

- Python 3
- Pillow (for image optimization)
- bash (for the Markdown fixer script)

Install Pillow if needed:
```bash
pip3 install pillow
```

Optional (better PNG compression):
```bash
brew install oxipng
```

## Run

```bash
python3 fixomat.py
```

Then:
1. Select the workshop root folder.
2. Choose a mode (Markdown only, Images only, or Both).
3. Click **Run**.

## What it runs

- Markdown fix: `common/md-validator/.github/scripts/fix-livelabs-markdown.sh`
- Image optimization: `common/_scripts/optishot/optishot.py`

Fixomat streams the output from both tools into the UI console.
