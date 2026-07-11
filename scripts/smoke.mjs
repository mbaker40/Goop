// Headless UI smoke: boots vite, drives the game at mobile + desktop viewports,
// captures screenshots and console errors. Usage:
//   node scripts/smoke.mjs [--url http://localhost:5173] [--out shots]
// Starts its own vite dev server unless --url is given.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : def;
};
const OUT = arg('--out', 'shots');
let url = arg('--url', null);
mkdirSync(OUT, { recursive: true });

let server = null;
if (!url) {
  server = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { stdio: 'pipe' });
  url = 'http://localhost:5199';
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) break;
    } catch { /* not up yet */ }
    await sleep(500);
  }
}

const exe = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const errors = [];

async function drive(label, viewport, dpr) {
  const ctx = await browser.newContext({
    viewport, deviceScaleFactor: dpr, isMobile: viewport.width < 900, hasTouch: true,
    userAgent: viewport.width < 900
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${label}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${label}] pageerror: ${e.message}`));

  await page.goto(`${url}/?debug`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/${label}-1-menu.png` });

  // Start a run if we're on the menu.
  const start = page.locator('button', { hasText: /start|new run|goop/i }).first();
  if (await start.count()) await start.click({ timeout: 3000 }).catch(() => {});
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/${label}-2-run.png` });

  // Tap the stage rapidly (combo).
  const stage = page.locator('#stage');
  const box = (await stage.count()) ? await stage.boundingBox() : null;
  const cx = box ? box.x + box.width / 2 : viewport.width / 2;
  const cy = box ? box.y + box.height / 2 : viewport.height / 2;
  for (let i = 0; i < 20; i++) { await page.touchscreen.tap(cx, cy); await sleep(70); }
  await page.screenshot({ path: `${OUT}/${label}-3-tapped.png` });
  const juice = await page.evaluate(() => ({
    splats: window.__goopDebug?.splats,
    floaters: document.querySelectorAll('.floater').length,
    clicks: window.__goopDebug?.clicks,
  })).catch(() => null);
  console.log(label, 'juice:', JSON.stringify(juice));
  await sleep(300);

  // Open the shop if collapsed.
  const shopToggle = page.locator('button', { hasText: /shop/i }).first();
  if (await shopToggle.count()) await shopToggle.click({ timeout: 2000 }).catch(() => {});
  await sleep(600);
  await page.screenshot({ path: `${OUT}/${label}-4-shop.png` });

  // Dump quick state if the debug store is exposed.
  const state = await page.evaluate(() => {
    const s = window.__goopStore;
    if (!s) return null;
    return { screen: s.screen, clicks: s.game.run.clicks, goop: s.game.run.goop.toString(), debug: window.__goopDebug };
  }).catch(() => null);
  console.log(label, 'state:', JSON.stringify(state));
  await ctx.close();
}

try {
  await drive('portrait', { width: 390, height: 844 }, 3);
  await drive('landscape', { width: 844, height: 390 }, 3);
  await drive('desktop', { width: 1920, height: 1080 }, 1);
} finally {
  await browser.close();
  server?.kill();
}

if (errors.length) {
  console.log('\nCONSOLE ERRORS:');
  for (const e of errors) console.log(' -', e);
  process.exitCode = 1;
} else {
  console.log('\nNo console errors.');
}
