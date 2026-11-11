import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const [url, outputPath, width = '1440', height = '900', fullPage = 'false', browserChannel = 'chromium'] = process.argv.slice(2);
if (!url || !outputPath) {
  console.error('Usage: node capture.mjs <url> <output-path> [width] [height] [full-page]');
  process.exit(2);
}
const resolved = path.resolve(outputPath);
await fs.mkdir(path.dirname(resolved), { recursive: true });
if (!['chromium', 'chrome', 'msedge'].includes(browserChannel)) {
  throw new Error(`Unsupported browser channel: ${browserChannel}. Use chromium, chrome, or msedge.`);
}
const launchOptions = { headless: true };
if (browserChannel === 'chromium') {
  const browserPath = chromium.executablePath();
  try {
    await fs.access(browserPath);
  } catch {
    throw new Error(`Playwright Chromium is not installed at ${browserPath}. Run setup.ps1/setup.sh, or retry with BrowserChannel chrome or msedge if that browser is installed.`);
  }
} else {
  launchOptions.channel = browserChannel;
}
const browser = await chromium.launch(launchOptions);
try {
  const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) } });
  await page.goto(url, { waitUntil: 'load' });
  await page.screenshot({ path: resolved, fullPage: fullPage === 'true' });
  const stat = await fs.stat(resolved);
  if (!stat.size) throw new Error(`Screenshot was empty: ${resolved}`);
  console.log(JSON.stringify({ url, output: resolved, viewport: `${width}x${height}`, fullPage: fullPage === 'true', bytes: stat.size }));
} finally {
  await browser.close();
}
