# Fixomat

Fixomat is a small UI app that lets you:
- Fix Markdown only
- Optimize images only
- Run both (Markdown + images)

It targets a **workshop root folder** and applies both Markdown and image fixes with logic built directly into `fixomat.py`.

## Requirements

- Python 3
- Pillow (for image optimization)

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

## Behavior

- Markdown mode applies built-in LiveLabs auto-fixes and reports any remaining manual issues.
- Markdown mode lowercases actual `images/...` file paths in Markdown image references without touching alt text, optional image titles, or fenced code blocks.
- Images mode resizes large JPEG/PNG files and optionally runs `oxipng` if available.
- Combined mode runs both steps in sequence and streams logs in the UI console.
