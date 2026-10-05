# Capture Recipes

## Package-local Playwright

Run setup once:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\webpage-screenshot-pipeline\setup.ps1
```

Capture a desktop page:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\webpage-screenshot-pipeline\capture.ps1 `
  -Url "https://example.com" `
  -OutputPath "output/screenshots/example/01-home-desktop-initial.png" `
  -ViewportWidth 1440 -ViewportHeight 900 -FullPage
```

Capture a mobile page:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\webpage-screenshot-pipeline\capture.ps1 `
  -Url "https://example.com" `
  -OutputPath "output/screenshots/example/02-home-mobile-initial.png" `
  -ViewportWidth 390 -ViewportHeight 844 -FullPage
```

## Chrome DevTools MCP

Use `new_page` or `navigate_page`, inspect with `take_snapshot`, then use `take_screenshot`. Capture console and network diagnostics when a page is blank or assets fail.

## OS fallback

Use only when browser-level capture is unavailable. Record the reason in the manifest and do not report the result as a Playwright capture.
