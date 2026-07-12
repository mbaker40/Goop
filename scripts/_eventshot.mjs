// Force each chaos event via the debug store and screenshot the UI.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = process.argv[2] ?? 'shots-events';
mkdirSync(OUT, { recursive: true });
const server = spawn('npx', ['vite', '--port', '5197', '--strictPort'], { stdio: 'pipe' });
const url = 'http://localhost:5197';
for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) break; } catch {} await sleep(500); }

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${url}/?debug`, { waitUntil: 'networkidle' });
await sleep(800);
await page.locator('#menu-start').click();
await sleep(800);

const cases = [
  { id: 'goober', targetsLeft: 8 },
  { id: 'meteor', targetsLeft: 10 },
  { id: 'inspector', targetsLeft: 1 },
  { id: 'investor', targetsLeft: 0 },
  { id: 'heatwave', targetsLeft: 0, resolved: true },
  { id: 'barber', targetsLeft: 0, resolved: true },
];
for (const c of cases) {
  await page.evaluate((ev) => {
    const s = window.__goopStore;
    s.game.run.status = 'active';
    s.game.run.activeEvent = { id: ev.id, remaining: 10, targetsLeft: ev.targetsLeft, resolved: !!ev.resolved };
    s.emit();
  }, c);
  await sleep(700);
  await page.screenshot({ path: `${OUT}/event-${c.id}.png` });
}

// Tap two goober targets to verify the tap path + payout floater.
await page.evaluate(() => {
  const s = window.__goopStore;
  s.game.run.activeEvent = { id: 'goober', remaining: 10, targetsLeft: 8, resolved: false };
  s.emit();
});
await sleep(500);
const tgts = page.locator('.event-tgt');
console.log('targets on screen:', await tgts.count());
// The targets bob forever, so Playwright's stability wait never settles - tap by coordinates.
for (let i = 0; i < 2; i++) {
  const box = await tgts.first().boundingBox();
  if (box) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(300);
}
const st = await page.evaluate(() => ({
  left: window.__goopStore.game.run.activeEvent?.targetsLeft,
  goop: window.__goopStore.game.run.goop.toString(),
}));
console.log('after 2 taps:', JSON.stringify(st));
await page.screenshot({ path: `${OUT}/event-tapped.png` });

// Effect chip render: simulate an inspector citation.
await page.evaluate(() => {
  const s = window.__goopStore;
  s.game.run.activeEvent = null;
  s.game.run.eventEffects.push({ gpsMult: 0.5, meltMult: 1, clickMult: 1, remaining: 22, label: 'Citation: GPS ×0.5', icon: '📋' });
  s.game.pushEventToast('CITED. Production halved while the paperwork clears.');
  s.emit();
});
await sleep(600);
await page.screenshot({ path: `${OUT}/event-chip-toast.png` });

console.log(errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'No console errors.');
await browser.close();
server.kill();
