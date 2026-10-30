// npm run icons: render the app icons from the goop itself and write them to public/icons/.
// Starts a Vite dev server, opens scripts/icons.html in headless Chromium (Playwright, which is not a
// dependency of the game: install it globally, or run with NODE_PATH pointing at it) and saves each
// canvas. The PNGs are committed, so a normal build never needs this.
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'icons');
const { chromium } = createRequire(import.meta.url)('playwright');

const server = await createServer({ root, logLevel: 'error', server: { port: 0 } });
await server.listen();
const url = server.resolvedUrls.local[0] + 'scripts/icons.html';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('pageerror', e => { console.error(e); process.exitCode = 1; });
  await page.goto(url);
  await page.waitForFunction(() => window.iconsDone === true, null, { timeout: 20000 });
  mkdirSync(out, { recursive: true });
  for (const { name, data } of await page.evaluate(() => window.icons)) {
    writeFileSync(join(out, name), Buffer.from(data.split(',')[1], 'base64'));
    console.log('wrote public/icons/' + name);
  }
} finally { await browser.close(); await server.close(); }
