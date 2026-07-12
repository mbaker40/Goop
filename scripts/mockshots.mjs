// Capture the ?mockrender timeline (height ramp 0→WIN across all zones + collapse) at key beats.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = process.argv[2] ?? 'shots-mock';
mkdirSync(OUT, { recursive: true });
const server = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { stdio: 'pipe' });
const url = 'http://localhost:5199';
for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) break; } catch {} await sleep(500); }

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const t0 = Date.now();
await page.goto(`${url}/?mockrender&debug`, { waitUntil: 'networkidle' });
// The live store boots to the menu, which hides the canvas (iOS compositing gate). For pure
// renderer shots, force the run-screen visibility state and hide the DOM overlay.
await page.evaluate(() => {
  document.body.setAttribute('data-screen', 'run');
  const app = document.getElementById('app');
  if (app) app.style.display = 'none';
});
// The mock ramps height over 30s, collapses at 34-38s. Screenshot on a schedule.
const beats = [2, 6, 11, 17, 23, 29, 35.5, 39];
for (const b of beats) {
  const wait = b * 1000 - (Date.now() - t0);
  if (wait > 0) await sleep(wait);
  await page.screenshot({ path: `${OUT}/mock-${String(b).replace('.', '_')}s.png` });
  const d = await page.evaluate(() => window.__goopDebug);
  console.log(`t=${b}s`, JSON.stringify({ zone: d?.zone, h: d?.renderedHeight?.toFixed(1), status: d?.status, splats: d?.splats }));
}
await browser.close();
server.kill();
