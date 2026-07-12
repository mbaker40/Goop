// Screenshot the achievements board (menu) + mid-run overlay with a few unlocks, at 390x844.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = process.argv[2] ?? 'shots-ach';
mkdirSync(OUT, { recursive: true });
const server = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { stdio: 'pipe' });
const url = 'http://localhost:5199';
for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) break; } catch {} await sleep(500); }
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await page.goto(`${url}/?debug`, { waitUntil: 'networkidle' });
await sleep(1000);
// Unlock a handful of achievements so tiles show both states, then re-render the menu.
await page.evaluate(() => {
  const s = window.__goopStore;
  s.meta.achievements.push('click1', 'zone2', 'own_dripper_1', 'comboMax', 'puddle1', 'h30', 'win1');
  s.toMenu();
});
await sleep(400);
// Open the (collapsed) achievements section, then scroll the grid into view.
await page.locator('[data-action="menu-sec"][data-id="achievements"]').click().catch(() => {});
await sleep(300);
await page.locator('.ach-grid').first().scrollIntoViewIfNeeded();
await sleep(200);
await page.locator('.ach.on').first().click().catch(() => {});
await sleep(300);
await page.screenshot({ path: `${OUT}/menu-board.png` });
// Mid-run overlay.
await page.locator('button', { hasText: /start/i }).first().click();
await sleep(800);
await page.locator('[data-action="toggle-ach-overlay"]').first().click();
await sleep(400);
await page.locator('#ach-overlay .ach.on').first().click().catch(() => {});
await sleep(300);
await page.screenshot({ path: `${OUT}/run-overlay.png` });
console.log('done');
await browser.close();
server.kill();
