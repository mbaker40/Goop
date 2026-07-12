// Walk the toaster tutorial as a brand-new player and screenshot each beat.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = process.argv[2] ?? 'shots-tut';
mkdirSync(OUT, { recursive: true });
const server = spawn('npx', ['vite', '--port', '5195', '--strictPort'], { stdio: 'pipe' });
const url = 'http://localhost:5195';
for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) break; } catch {} await sleep(500); }

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${url}/?debug`, { waitUntil: 'networkidle' });
await sleep(1200);
await page.screenshot({ path: `${OUT}/tut-0-coldopen.png` });
const state = await page.evaluate(() => ({ screen: window.__goopStore.screen, step: window.__goopStore.meta.tutorialStep }));
console.log('cold open:', JSON.stringify(state));

// Read all lines of the intro (tap bubble), then slap 5 times.
for (let i = 0; i < 4; i++) { await page.locator('.tut-bubble').tap(); await sleep(350); }
for (let i = 0; i < 6; i++) { await page.touchscreen.tap(195, 520); await sleep(180); }
await sleep(600);
await page.screenshot({ path: `${OUT}/tut-1-combo.png` });

// Combo step: read lines, then tap fast to reach x2.
for (let i = 0; i < 3; i++) { await page.locator('.tut-bubble').tap().catch(() => {}); await sleep(300); }
for (let i = 0; i < 26; i++) { await page.touchscreen.tap(195, 520); await sleep(90); }
await sleep(600);
await page.screenshot({ path: `${OUT}/tut-2-shop.png` });
console.log('after combo:', JSON.stringify(await page.evaluate(() => ({ step: window.__goopStore.meta.tutorialStep, combo: window.__goopStore.game.run.combo }))));

// Shop step: read lines, open shop, buy dripper (needs 15 goop; we have plenty from taps).
for (let i = 0; i < 3; i++) { await page.locator('.tut-bubble').tap().catch(() => {}); await sleep(300); }
await page.locator('#shop-fab').tap().catch(async () => { await page.locator('#shop-toggle').tap().catch(() => {}); });
await sleep(500);
await page.locator('[data-action="buy-producer"][data-id="dripper"]').first().tap({ force: true }).catch(() => {});
await sleep(500);
await page.locator('#shop-toggle').tap().catch(() => {});
await sleep(500);
await page.screenshot({ path: `${OUT}/tut-3-melt.png` });
console.log('after shop:', JSON.stringify(await page.evaluate(() => ({ step: window.__goopStore.meta.tutorialStep, drippers: window.__goopStore.game.run.producersOwned.dripper }))));

// Melt step: fast-forward runTime via debug, read lines.
await page.evaluate(() => { window.__goopStore.game.run.runTime = 121; });
for (let i = 0; i < 4; i++) { await page.locator('.tut-bubble').tap().catch(() => {}); await sleep(300); }
await sleep(800);
await page.screenshot({ path: `${OUT}/tut-4-sendoff.png` });
// Sendoff lines.
for (let i = 0; i < 4; i++) { await page.locator('.tut-bubble').tap().catch(() => {}); await sleep(300); }
await sleep(800);
await page.screenshot({ path: `${OUT}/tut-5-done.png` });
console.log('end:', JSON.stringify(await page.evaluate(() => ({ step: window.__goopStore.meta.tutorialStep }))));

// Puddle beat: force a collapse -> dead -> puddle.
await page.evaluate(() => {
  const s = window.__goopStore;
  s.game.run.status = 'dead';
  s.emit();
});
await sleep(1000);
await page.screenshot({ path: `${OUT}/tut-6-puddle.png` });
console.log('puddle:', JSON.stringify(await page.evaluate(() => ({ screen: window.__goopStore.screen, tip: window.__goopStore.meta.puddleTipShown }))));

console.log(errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'No console errors.');
await browser.close();
server.kill();
