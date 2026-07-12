// Capture the run at cloud altitude, normal vs zoomed-out (the 🔭 button), plus the new menu.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = process.argv[2] ?? 'shots-zoom';
mkdirSync(OUT, { recursive: true });
const server = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { stdio: 'pipe' });
const url = 'http://localhost:5199';
for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) break; } catch {} await sleep(500); }
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await page.goto(`${url}/?debug`, { waitUntil: 'networkidle' });
await sleep(1000);
await page.screenshot({ path: `${OUT}/menu.png` });
await page.locator('#menu-start').click();
await sleep(600);
// Lift the run to the cloud/balloon band so markers are around.
await page.evaluate(() => {
  const s = window.__goopStore;
  s.game.run.lifetimeGoop = s.game.run.lifetimeGoop.add(1.2e6);
  s.game.run.structuralGoop = s.game.run.structuralGoop.add(1e5);
});
await sleep(3500); // let the height spring + palette settle
await page.screenshot({ path: `${OUT}/run-1x.png` });
await page.locator('#zoom-btn').click();
await sleep(1600);
await page.locator('#zoom-btn').click();
await sleep(2200);
await page.screenshot({ path: `${OUT}/run-2_6x.png` });
console.log('done');
await browser.close();
server.kill();
