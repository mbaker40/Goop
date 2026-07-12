// Generate PWA / touch icons (public/icons/*.png) by rendering an inline goop-blob SVG with the
// pre-installed Chromium. Run once (or after changing the art): node scripts/icons.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });

// A glossy goop blob on the dark game background (matches --bg / --goop in ui/styles.ts).
const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" rx="${pad ? 96 : 0}" fill="#14121a"/>
  <g transform="translate(256 276)">
    <path d="M0 -170 C 95 -170 150 -95 150 -5 C 150 95 85 150 0 150 C -85 150 -150 95 -150 -5 C -150 -95 -95 -170 0 -170 Z"
          fill="#b6e84a"/>
    <path d="M0 -170 C 95 -170 150 -95 150 -5 C 150 40 135 75 110 100 C 130 60 135 20 120 -40 C 100 -120 60 -160 0 -170 Z"
          fill="#8fc93a" opacity="0.85"/>
    <ellipse cx="-52" cy="-92" rx="42" ry="26" fill="#e6ff9e" opacity="0.9" transform="rotate(-24 -52 -92)"/>
    <circle cx="-38" cy="24" r="14" fill="#0f2410" opacity="0.85"/>
    <circle cx="38" cy="24" r="14" fill="#0f2410" opacity="0.85"/>
    <path d="M-26 66 Q 0 88 26 66" stroke="#0f2410" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.85"/>
  </g>
</svg>`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });

for (const [name, size, pad] of [['icon-512.png', 512, true], ['icon-192.png', 192, true], ['apple-touch-icon.png', 180, false]]) {
  await page.setContent(`<style>*{margin:0}</style>${svg(pad)}`);
  await page.setViewportSize({ width: 512, height: 512 });
  const el = page.locator('svg');
  const buf = await el.screenshot({ omitBackground: true });
  // Resize via a canvas roundtrip in-page (keeps this script dependency-free).
  const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
  const out = await page.evaluate(async ({ dataUrl, size }) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    c.getContext('2d').drawImage(img, 0, 0, size, size);
    return c.toDataURL('image/png').split(',')[1];
  }, { dataUrl, size });
  const { writeFileSync } = await import('node:fs');
  writeFileSync(`public/icons/${name}`, Buffer.from(out, 'base64'));
  console.log('wrote public/icons/' + name);
}
await browser.close();
