/**
 * icons.ts - handmade inline-SVG icon set for the whole UI (no emoji, no asset files).
 * Flat shapes in the game palette, drawn on a 24×24 grid; kept deliberately chunky so they read
 * at 20-24px tile size. Configs (achievements, producers, upgrades, events) reference these by
 * key (config stays DOM-free); the UI renders them via achIcon()/icon()/ic().
 */

const GOOP = '#b6e84a';
const INK = '#e9e4f5';
const MUTED = '#9a90b5';
const DARK = '#14121a';
const WARN = '#ffb03a';
const HOT = '#ff5d3a';

/** Wrap inner markup in a standard 24×24 svg. */
const svg = (inner: string): string =>
  `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

export const ICONS: Record<string, string> = {
  // ---- core motifs ----
  hand: svg(`<path fill="${GOOP}" d="M7 11V5.5a1.3 1.3 0 0 1 2.6 0V10h.9V4a1.3 1.3 0 0 1 2.6 0v6h.9V5a1.3 1.3 0 0 1 2.6 0v7h.9V7.5a1.2 1.2 0 0 1 2.4 0V15c0 3.9-2.6 6-6.2 6S7.6 18.6 6 15.6L4.3 12a1.2 1.2 0 0 1 2-1.2L7 12z"/>`),
  drop: svg(`<path fill="${GOOP}" d="M12 2.5c3 4.6 6 7.8 6 11.5a6 6 0 0 1-12 0c0-3.7 3-6.9 6-11.5z"/><ellipse fill="${INK}" opacity=".55" cx="9.6" cy="12.6" rx="1.5" ry="2.2" transform="rotate(-20 9.6 12.6)"/>`),
  flame: svg(`<path fill="${HOT}" d="M12 2c1 3.4 5.5 5.4 5.5 10.4A5.7 5.7 0 0 1 12 18a5.7 5.7 0 0 1-5.5-5.6C6.5 8.6 9.5 6.8 12 2z"/><path fill="${WARN}" d="M12 9c.8 2 2.6 3 2.6 5.1A2.7 2.7 0 0 1 12 16.8a2.7 2.7 0 0 1-2.6-2.7C9.4 12 11 11 12 9z"/>`),
  bolt: svg(`<path fill="${WARN}" d="M13.5 2 5 13.5h5L9.5 22 19 10h-5.5z"/>`),
  puddle: svg(`<path fill="${GOOP}" d="M4 16c0-2 3-3.4 8-3.4s8 1.4 8 3.4-3.6 3.4-8 3.4S4 18 4 16z"/><circle fill="${GOOP}" cx="15" cy="9" r="1.4"/><circle fill="${GOOP}" cx="12.4" cy="5.4" r="1"/><ellipse fill="${INK}" opacity=".5" cx="8.6" cy="15.4" rx="2.2" ry=".8"/>`),
  tower: svg(`<path fill="${GOOP}" d="M9 21c-1.8-.6-3-2-3-4.4 0-3.4 1.8-4 1.8-7.2C7.8 6.5 9.6 3 12 3s4.2 3.5 4.2 6.4c0 3.2 1.8 3.8 1.8 7.2 0 2.4-1.2 3.8-3 4.4z"/><ellipse fill="${INK}" opacity=".5" cx="10.2" cy="8.4" rx="1.2" ry="2" transform="rotate(-14 10.2 8.4)"/>`),
  trophy: svg(`<path fill="${WARN}" d="M7 3h10v2h3c0 3.4-1.8 5.6-4.3 6.2A5 5 0 0 1 13 14v3h3v2.6H8V17h3v-3a5 5 0 0 1-2.7-2.8C5.8 10.6 4 8.4 4 5h3zm-1 4.2c.2 1.4.9 2.5 2 3.1-.5-1-.8-2-.9-3.1zm12 0h-1.1c-.1 1.1-.4 2.1-.9 3.1 1.1-.6 1.8-1.7 2-3.1z"/>`),
  crown: svg(`<path fill="${WARN}" d="M4 18h16l1-9.5-4.6 3-4.4-6-4.4 6-4.6-3z"/><rect fill="${WARN}" x="4" y="19" width="16" height="2" rx="1"/><circle fill="${HOT}" cx="12" cy="13.4" r="1.3"/>`),
  scroll: svg(`<path fill="${INK}" d="M7 3h11a2.5 2.5 0 0 1 2.5 2.5V7H17v12.5A2.5 2.5 0 0 1 14.5 22h-8A2.5 2.5 0 0 1 4 19.5V6a3 3 0 0 1 3-3z"/><rect fill="${MUTED}" x="7" y="9" width="7" height="1.4" rx=".7"/><rect fill="${MUTED}" x="7" y="12" width="7" height="1.4" rx=".7"/><rect fill="${MUTED}" x="7" y="15" width="5" height="1.4" rx=".7"/>`),

  // ---- zones ----
  house: svg(`<path fill="${WARN}" d="M12 3 3 11h2.5v9h13v-9H21z"/><rect fill="${DARK}" x="10" y="14" width="4" height="6"/><path fill="${GOOP}" d="M12 6.5c1.4 2 2.6 3.4 2.6 5a2.6 2.6 0 1 1-5.2 0c0-1.6 1.2-3 2.6-5z" opacity=".9"/>`),
  rooftops: svg(`<path fill="${MUTED}" d="M2 20v-7l5-4 5 4v7z"/><path fill="${INK}" d="M10 20v-9l6-5 6 5v9z" opacity=".9"/><rect fill="${DARK}" x="14" y="14" width="3" height="3"/><rect fill="${DARK}" x="5" y="14" width="2.4" height="2.4"/>`),
  cloud: svg(`<path fill="${INK}" d="M7 18a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 8.6 4.2 4.2 0 0 1 16.8 17z"/><path fill="${MUTED}" d="M5 20.5h3M10 20.5h6" stroke="${MUTED}" stroke-width="1.6" stroke-linecap="round"/>`),
  satellite: svg(`<rect fill="${INK}" x="9.4" y="9.4" width="5.2" height="5.2" rx="1" transform="rotate(45 12 12)"/><rect fill="${GOOP}" x="1.5" y="10.4" width="6" height="3.2" rx=".8" transform="rotate(45 4.5 12)"/><rect fill="${GOOP}" x="16.5" y="10.4" width="6" height="3.2" rx=".8" transform="rotate(45 19.5 12)"/><circle fill="${WARN}" cx="12" cy="12" r="1.4"/>`),
  planet: svg(`<circle fill="#c060ff" cx="12" cy="12" r="6"/><ellipse fill="none" stroke="${GOOP}" stroke-width="1.8" cx="12" cy="12" rx="10" ry="3.4" transform="rotate(-18 12 12)"/><circle fill="${INK}" cx="10" cy="10" r="1.1" opacity=".7"/>`),
  gate: svg(`<path fill="${WARN}" d="M6 21V10a6 6 0 0 1 12 0v11h-3v-11a3 3 0 0 0-6 0v11z"/><path fill="${INK}" d="M2 21h20v1.8H2z"/><circle fill="${GOOP}" cx="12" cy="6.5" r="1.6"/>`),

  // ---- producers ----
  faucet: svg(`<path fill="${INK}" d="M4 9h9a4 4 0 0 1 4 4v1.5h-3.4V13a1.4 1.4 0 0 0-1.4-1.4H4z"/><rect fill="${INK}" x="8" y="5" width="3" height="4.4" rx="1"/><rect fill="${MUTED}" x="5.6" y="4" width="7.8" height="2.4" rx="1.2"/><path fill="${GOOP}" d="M15.3 17c.9 1.4 1.8 2.3 1.8 3.4a1.8 1.8 0 1 1-3.6 0c0-1.1.9-2 1.8-3.4z"/>`),
  tie: svg(`<path fill="${INK}" d="M8 3h8l-2.2 3h-3.6z"/><path fill="${GOOP}" d="M10.8 6.6h2.4l1.2 8.4-2.4 4.6-2.4-4.6z"/><path fill="${MUTED}" d="M6.5 3.6 10 7.8l-2.3 2L5 4.6zM17.5 3.6 14 7.8l2.3 2L19 4.6z"/>`),
  cannon: svg(`<path fill="${INK}" d="M3.6 15.8 14 7.4l3 3.8-10.4 8.4a2.4 2.4 0 0 1-3-3.8z" transform="rotate(6 12 12)"/><circle fill="${MUTED}" cx="6.4" cy="17.4" r="2.6"/><path fill="${GOOP}" d="M17.6 6.2l1.4-2.8 1 3 3-.4-2 2.4 2 2.2-3-.2-.8 3-1.6-2.7-2.8 1.2 1.4-2.7-2.2-1.9z"/>`),
  hardhat: svg(`<path fill="${WARN}" d="M4.5 15a7.5 7.5 0 0 1 15 0z"/><rect fill="${WARN}" x="10.4" y="5" width="3.2" height="4" rx="1.2"/><rect fill="${INK}" x="2.6" y="15" width="18.8" height="2.6" rx="1.3"/>`),
  rotor: svg(`<rect fill="${INK}" x="11" y="4" width="2" height="16" rx="1" transform="rotate(45 12 12)"/><rect fill="${INK}" x="11" y="4" width="2" height="16" rx="1" transform="rotate(-45 12 12)"/><circle fill="${GOOP}" cx="12" cy="12" r="3"/><circle fill="${DARK}" cx="12" cy="12" r="1.2"/>`),
  trefoil: svg(`<circle fill="${WARN}" cx="12" cy="12" r="9" opacity=".25"/><path fill="${WARN}" d="M12 12 8.5 4.8a8 8 0 0 1 7 0zM12 12l7.4 2.4a8 8 0 0 1-3.5 6.1zM12 12l-3.9 8.5a8 8 0 0 1-3.5-6.1z"/><circle fill="${WARN}" cx="12" cy="12" r="1.8"/>`),
  hole: svg(`<circle fill="${DARK}" cx="12" cy="12" r="6.5"/><circle fill="none" stroke="#c060ff" stroke-width="2.4" cx="12" cy="12" r="7.6"/><circle fill="none" stroke="${GOOP}" stroke-width="1.2" cx="12" cy="12" r="9.4" opacity=".6" stroke-dasharray="4 3"/>`),
  heart: svg(`<path fill="#ff9ad5" d="M12 20.5C6.5 16.6 3 13.4 3 9.6A4.6 4.6 0 0 1 7.6 5c1.8 0 3.4.9 4.4 2.4A5.3 5.3 0 0 1 16.4 5 4.6 4.6 0 0 1 21 9.6c0 3.8-3.5 7-9 10.9z"/><ellipse fill="${INK}" opacity=".5" cx="8" cy="9" rx="1.4" ry="2" transform="rotate(-24 8 9)"/>`),
  swirl: svg(`<path fill="none" stroke="#66e0ff" stroke-width="2.4" stroke-linecap="round" d="M12 12m0-1a1 1 0 0 1 1 1 2.2 2.2 0 0 1-2.2 2.2A3.8 3.8 0 0 1 7 10.4 5.6 5.6 0 0 1 12.6 4.8 7.6 7.6 0 0 1 20.2 12.4 9.4 9.4 0 0 1 10.8 21.8"/>`),
  bottle: svg(`<path fill="${GOOP}" d="M9 9h6l1.6 9.4A2 2 0 0 1 14.6 21H9.4a2 2 0 0 1-2-2.6z"/><rect fill="${INK}" x="10" y="5.6" width="4" height="3.4" rx="1"/><path fill="${MUTED}" d="M11 2.4h2L13.6 5h-3.2z"/><ellipse fill="${INK}" opacity=".45" cx="10.4" cy="14" rx="1" ry="2.6" transform="rotate(-8 10.4 14)"/>`),

  // ---- families ----
  clipboard: svg(`<rect fill="${INK}" x="5" y="4" width="14" height="17" rx="2"/><rect fill="${MUTED}" x="8.6" y="2.4" width="6.8" height="3.6" rx="1.2"/><rect fill="${MUTED}" x="8" y="9" width="8" height="1.5" rx=".75"/><rect fill="${MUTED}" x="8" y="12.4" width="8" height="1.5" rx=".75"/><rect fill="${GOOP}" x="8" y="15.8" width="5" height="1.5" rx=".75"/>`),
  crane: svg(`<rect fill="${WARN}" x="11" y="6" width="2.4" height="14"/><rect fill="${WARN}" x="4" y="4.4" width="16" height="2.2"/><path fill="${MUTED}" d="M4.6 6.6v3l1.6.01V6.6z"/><path fill="none" stroke="${MUTED}" stroke-width="1.2" d="M18.8 6.6v5.4"/><path fill="${GOOP}" d="M18.8 12c.8 1.2 1.5 2 1.5 2.9a1.5 1.5 0 1 1-3 0c0-.9.7-1.7 1.5-2.9z"/><rect fill="${INK}" x="9" y="19.4" width="6.4" height="2.2" rx="1"/>`),
  puzzle: svg(`<path fill="${GOOP}" d="M5 8h4.2a2.4 2.4 0 1 1 4.6 0H18a1.6 1.6 0 0 1 1.6 1.6v3.6a2.4 2.4 0 1 0 0 4.6v2.6A1.6 1.6 0 0 1 18 22H6.6A1.6 1.6 0 0 1 5 20.4z" transform="translate(0 -1.4)"/>`),
  moneybag: svg(`<path fill="${INK}" d="M9 6.5 7.4 3.6A1 1 0 0 1 8.3 2h7.4a1 1 0 0 1 .9 1.6L15 6.5z"/><path fill="${MUTED}" d="M12 7c4.8 0 8 4.6 8 9a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6c0-4.4 3.2-9 8-9z"/><path fill="${GOOP}" d="M12 10.4c1.6 2.4 3.2 4 3.2 6a3.2 3.2 0 1 1-6.4 0c0-2 1.6-3.6 3.2-6z"/>`),
  stopwatch: svg(`<circle fill="${INK}" cx="12" cy="13.5" r="8"/><circle fill="${DARK}" cx="12" cy="13.5" r="5.8"/><rect fill="${INK}" x="10.6" y="1.6" width="2.8" height="2.6" rx="1"/><rect fill="${INK}" x="16.8" y="4" width="2.4" height="1.8" rx=".9" transform="rotate(45 18 5)"/><path fill="none" stroke="${GOOP}" stroke-width="2" stroke-linecap="round" d="M12 13.5V9.6M12 13.5l2.8 1.8"/>`),
  chart: svg(`<path fill="none" stroke="${MUTED}" stroke-width="1.8" d="M4 3v17h17"/><rect fill="${INK}" x="7" y="13" width="3" height="5" rx=".8"/><rect fill="${GOOP}" x="12" y="9" width="3" height="9" rx=".8"/><rect fill="${WARN}" x="17" y="5" width="3" height="13" rx=".8"/>`),
  backpack: svg(`<rect fill="${GOOP}" x="5" y="7" width="14" height="14" rx="4"/><path fill="none" stroke="${INK}" stroke-width="2" d="M8.6 7V6a3.4 3.4 0 0 1 6.8 0v1"/><rect fill="${DARK}" x="8" y="13" width="8" height="6" rx="2"/><rect fill="${INK}" x="8" y="13" width="8" height="2.2" rx="1.1"/>`),
  flag: svg(`<rect fill="${INK}" x="5" y="2.6" width="2" height="19" rx="1"/><path fill="${INK}" d="M8 3.6h11l-2 4 2 4H8z" opacity=".35"/><path fill="${DARK}" d="M8 3.6h3.7v2.7H8zM11.7 6.3h3.7V9h-3.7zM15.4 3.6H19l-1.3 2.7h-2.3zM8 9h3.7v2.6H8zM15.2 9h2.5l1.3 2.6h-3.8z"/>`),
  rocket: svg(`<path fill="${INK}" d="M12 2.6c3 2 4.4 5.4 4.4 9l-2 4.4h-4.8l-2-4.4c0-3.6 1.4-7 4.4-9z"/><circle fill="#66e0ff" cx="12" cy="9" r="1.8"/><path fill="${MUTED}" d="M7.6 12.4 5 16.6l3.4-.8zM16.4 12.4l2.6 4.2-3.4-.8z"/><path fill="${WARN}" d="M12 17.4c1 1.3 1.6 2.4 1.6 3.4L12 22.4l-1.6-1.6c0-1 .6-2.1 1.6-3.4z"/>`),
  ticket: svg(`<path fill="${GOOP}" d="M3 8a2 2 0 0 0 2-2 2 2 0 0 1 2-2h10a2 2 0 0 1 2 2 2 2 0 0 0 2 2v3a2.6 2.6 0 0 0 0 5v3a2 2 0 0 1-2 2 2 2 0 0 0-2-2H7a2 2 0 0 0-2 2 2 2 0 0 1-2-2v-3a2.6 2.6 0 0 0 0-5z" transform="translate(0 -1)"/><path fill="none" stroke="${DARK}" stroke-width="1.4" stroke-dasharray="2.4 2.4" d="M12 4.6v14"/>`),
  pan: svg(`<circle fill="${INK}" cx="10" cy="13" r="7"/><circle fill="${DARK}" cx="10" cy="13" r="5.2"/><path fill="${GOOP}" d="M10 9.6c1.9 2.2 3.4 3.6 3.4 5.2a3.4 3.4 0 1 1-6.8 0c0-1.6 1.5-3 3.4-5.2z"/><rect fill="${MUTED}" x="16.4" y="11.8" width="6.4" height="2.4" rx="1.2"/>`),
  ruler: svg(`<rect fill="${WARN}" x="2" y="14.2" width="20" height="6" rx="1.2"/><path stroke="${DARK}" stroke-width="1.4" d="M6 14.2v2.6M10 14.2v3.8M14 14.2v2.6M18 14.2v3.8"/><path fill="${GOOP}" d="M12 3c1.5 2.2 3 3.8 3 5.6a3 3 0 1 1-6 0C9 6.8 10.5 5.2 12 3z"/>`),
  flask: svg(`<path fill="${INK}" d="M9.6 3h4.8v1.8l-.8.8v3l4.8 8.4a2.6 2.6 0 0 1-2.3 3.9H7.9a2.6 2.6 0 0 1-2.3-3.9l4.8-8.4v-3l-.8-.8z"/><path fill="${GOOP}" d="M8.1 15.4h7.8l1.5 2.7a1.4 1.4 0 0 1-1.2 2H7.8a1.4 1.4 0 0 1-1.2-2z"/><circle fill="${GOOP}" cx="13" cy="12.6" r="1"/>`),
  wrench: svg(`<path fill="${INK}" d="M20.8 6.6a5.2 5.2 0 0 1-6.9 6.3L7.6 19.2a2.2 2.2 0 0 1-3.1-3.1l6.3-6.3a5.2 5.2 0 0 1 6.3-6.9l-3 3 .6 2.9 2.9.6z"/><circle fill="${GOOP}" cx="6" cy="17.7" r="1.1"/>`),
  drum: svg(`<ellipse fill="${GOOP}" cx="12" cy="9" rx="8" ry="3.2"/><path fill="${INK}" d="M4 9v7c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2V9c0 1.8-3.6 3.2-8 3.2S4 10.8 4 9z"/><path stroke="${MUTED}" stroke-width="1.6" stroke-linecap="round" d="M5.4 3.4 10 8M18.6 3.4 14 8"/>`),
  medal: svg(`<circle fill="${WARN}" cx="12" cy="15" r="6"/><circle fill="${DARK}" cx="12" cy="15" r="3.8"/><path fill="${GOOP}" d="M12 12.4c.9 1.3 1.8 2.2 1.8 3.2a1.8 1.8 0 1 1-3.6 0c0-1 .9-1.9 1.8-3.2z"/><path fill="#ff5d5d" d="M8 2h3.4l-2 5.4L6 6z"/><path fill="#66e0ff" d="M16 2h-3.4l2 5.4L18 6z"/>`),

  // ---- UI chrome / shop / events (the emoji replacements) ----
  'goop-dot': svg(`<circle fill="${GOOP}" cx="12" cy="11.2" r="7.6"/><path fill="${GOOP}" d="M8.2 16.8h2.4v3.2a1.2 1.2 0 0 1-2.4 0zM13.6 17.4H16v1.8a1.2 1.2 0 0 1-2.4 0z"/><ellipse fill="${INK}" opacity=".55" cx="9.2" cy="8.8" rx="1.6" ry="2.4" transform="rotate(-24 9.2 8.8)"/>`),
  shield: svg(`<path fill="${INK}" d="M12 2.2 20 5v6.4c0 4.9-3.2 8.3-8 10.4-4.8-2.1-8-5.5-8-10.4V5z"/><path fill="${GOOP}" d="M12 6.4c1.9 2.9 3.8 4.9 3.8 7.2A3.8 3.8 0 0 1 12 17.4a3.8 3.8 0 0 1-3.8-3.8c0-2.3 1.9-4.3 3.8-7.2z"/>`),
  telescope: svg(`<path fill="none" stroke="${MUTED}" stroke-width="1.8" stroke-linecap="round" d="M11.4 13.8 7.6 21M13 14l3.6 7M12.2 14.4v4"/><rect fill="${INK}" x="3.6" y="9.4" width="14.4" height="5.2" rx="1.6" transform="rotate(-26 10.8 12)"/><rect fill="${GOOP}" x="16.2" y="7.6" width="4" height="6.4" rx="1.4" transform="rotate(-26 18.2 10.8)"/>`),
  'sound-on': svg(`<path fill="${INK}" d="M3.6 9.4H7l5-4.4v14l-5-4.4H3.6z"/><path fill="none" stroke="${GOOP}" stroke-width="2" stroke-linecap="round" d="M15.2 9a4.6 4.6 0 0 1 0 6M18 6.4a8.2 8.2 0 0 1 0 11.2"/>`),
  'sound-off': svg(`<path fill="${INK}" d="M3.6 9.4H7l5-4.4v14l-5-4.4H3.6z"/><path fill="none" stroke="${HOT}" stroke-width="2.2" stroke-linecap="round" d="m15 9.2 5.6 5.6M20.6 9.2 15 14.8"/>`),
  pause: svg(`<rect fill="${INK}" x="6.2" y="4.4" width="4.2" height="15.2" rx="1.6"/><rect fill="${INK}" x="13.6" y="4.4" width="4.2" height="15.2" rx="1.6"/>`),
  cart: svg(`<path fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2.6 4.4h2.8l2.2 10.4h10.6l2.2-7.6H6.2"/><circle fill="${INK}" cx="9" cy="19.4" r="1.9"/><circle fill="${INK}" cx="16.4" cy="19.4" r="1.9"/><path fill="${GOOP}" d="M13.2 5.2c.9 1.3 1.8 2.2 1.8 3.2a1.8 1.8 0 1 1-3.6 0c0-1 .9-1.9 1.8-3.2z" opacity=".9"/>`),
  mountain: svg(`<path fill="${MUTED}" d="M2.4 19.6 8.6 8.4l4 7.2-2.2 4z"/><path fill="${INK}" d="M8.4 19.6 15 6.4l6.6 13.2z"/><path fill="${GOOP}" d="m15 6.4 2.3 4.6-1.5 1.4-1.6-1.2-1.6 1.2-1.5-1.4z" opacity=".9"/>`),
  sparkle: svg(`<path fill="${WARN}" d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z"/><path fill="${INK}" d="m18.6 15.2.9 2.5 2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9z" opacity=".85"/>`),
  meteor: svg(`<path fill="none" stroke="${WARN}" stroke-width="2" stroke-linecap="round" d="M20.2 3.4 14 9.6M21.2 8.8l-3.6 3.6M15.2 2.8l-3.6 3.6"/><circle fill="${HOT}" cx="9" cy="15" r="5.8"/><circle fill="${WARN}" cx="7" cy="13.2" r="1.5"/><circle fill="${WARN}" cx="10.8" cy="17" r="1.1"/>`),
  briefcase: svg(`<rect fill="${INK}" x="3" y="7.4" width="18" height="12.8" rx="2"/><path fill="none" stroke="${MUTED}" stroke-width="2" d="M9 7.2V5.4a1.8 1.8 0 0 1 1.8-1.8h2.4A1.8 1.8 0 0 1 15 5.4v1.8"/><rect fill="${DARK}" x="3" y="12.2" width="18" height="1.6"/><rect fill="${GOOP}" x="10.3" y="11.2" width="3.4" height="3.6" rx="1"/>`),
  heat: svg(`<circle fill="${HOT}" cx="12" cy="8" r="4.6"/><path fill="none" stroke="${WARN}" stroke-width="1.9" stroke-linecap="round" d="M4.4 15.6c1.3-1.3 2.5-1.3 3.8 0s2.5 1.3 3.8 0 2.5-1.3 3.8 0 2.5 1.3 3.8 0M4.4 19.8c1.3-1.3 2.5-1.3 3.8 0s2.5 1.3 3.8 0 2.5-1.3 3.8 0 2.5 1.3 3.8 0"/>`),
  sun: svg(`<circle fill="${WARN}" cx="12" cy="12" r="4.8"/><path fill="none" stroke="${WARN}" stroke-width="2" stroke-linecap="round" d="M12 2.4v2.8M12 18.8v2.8M2.4 12h2.8M18.8 12h2.8M5.2 5.2l2 2M16.8 16.8l2 2M18.8 5.2l-2 2M7.2 16.8l-2 2"/>`),
  eye: svg(`<path fill="${INK}" d="M12 5.6c4.9 0 8.5 3.3 10 6.4-1.5 3.1-5.1 6.4-10 6.4S3.5 15.1 2 12c1.5-3.1 5.1-6.4 10-6.4z"/><circle fill="#66e0ff" cx="12" cy="12" r="3.6"/><circle fill="${DARK}" cx="12" cy="12" r="1.7"/>`),
  barber: svg(`<rect fill="${INK}" x="8.4" y="4.6" width="7.2" height="14.4" rx="2"/><path fill="none" stroke="${HOT}" stroke-width="2.2" stroke-linecap="round" d="m9.2 8.8 5.6-2.6M9.2 13l5.6-2.6M9.2 17.2l5.6-2.6"/><rect fill="${MUTED}" x="7.2" y="2.4" width="9.6" height="2.6" rx="1.3"/><rect fill="${MUTED}" x="7.2" y="19" width="9.6" height="2.6" rx="1.3"/>`),
  anger: svg(`<path fill="${HOT}" d="m12 2.4 1.9 4.3 4.4-1.9-1.9 4.4 4.3 1.9-4.3 1.9 1.9 4.4-4.4-1.9-1.9 4.3-1.9-4.3-4.4 1.9 1.9-4.4-4.3-1.9 4.3-1.9-1.9-4.4 4.4 1.9z"/><circle fill="${WARN}" cx="12" cy="11.1" r="3"/>`),
  handshake: svg(`<rect fill="${INK}" x="1.4" y="8" width="4" height="5" rx="1.2" transform="rotate(18 3.4 10.5)"/><rect fill="${INK}" x="18.6" y="8" width="4" height="5" rx="1.2" transform="rotate(-18 20.6 10.5)"/><rect fill="${GOOP}" x="3.4" y="9.8" width="9.8" height="5.4" rx="2.7" transform="rotate(18 8.3 12.5)"/><rect fill="#7ee081" x="10.8" y="9.8" width="9.8" height="5.4" rx="2.7" transform="rotate(-18 15.7 12.5)"/>`),
  gem: svg(`<path fill="#66e0ff" d="M7 4h10l4 5.2-9 10.8L3 9.2z"/><path fill="${INK}" d="M7 4 3 9.2h6zM17 4l4 5.2h-6z" opacity=".55"/><path fill="${DARK}" d="M9 9.2h6l-3 8.4z" opacity=".25"/>`),
  lock: svg(`<rect fill="${WARN}" x="5" y="10.4" width="14" height="10" rx="2"/><path fill="none" stroke="${INK}" stroke-width="2.4" d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8"/><circle fill="${DARK}" cx="12" cy="14.8" r="1.7"/><rect fill="${DARK}" x="11.2" y="15.4" width="1.6" height="2.8" rx=".8"/>`),
  gear: svg(`<path fill="${INK}" d="M10.6 2.6h2.8l.5 2.5c.8.3 1.5.7 2.2 1.3l2.4-.8 1.4 2.4-1.9 1.7a7 7 0 0 1 0 2.6l1.9 1.7-1.4 2.4-2.4-.8a7 7 0 0 1-2.2 1.3l-.5 2.5h-2.8l-.5-2.5a7 7 0 0 1-2.2-1.3l-2.4.8-1.4-2.4 1.9-1.7a7 7 0 0 1 0-2.6L4.1 8l1.4-2.4 2.4.8c.7-.6 1.4-1 2.2-1.3z"/><circle fill="${DARK}" cx="12" cy="12" r="3"/>`),
  wind: svg(`<path fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" d="M3 8h9.6a2.8 2.8 0 1 0-2.8-2.8M3 13h14.6a3 3 0 1 1-3 3M3 18h6.4a2.4 2.4 0 1 1-2.4 2.4"/>`),
  brain: svg(`<path fill="#ff9ad5" d="M12 3.6c1.6 0 2.9.9 3.4 2.2 1.8.2 3.2 1.7 3.2 3.6 0 .8-.2 1.5-.7 2.1.7.7 1.1 1.6 1.1 2.6 0 2-1.7 3.7-3.7 3.7-.4 1.5-1.8 2.6-3.3 2.6s-2.9-1.1-3.3-2.6c-2 0-3.7-1.7-3.7-3.7 0-1 .4-1.9 1.1-2.6-.5-.6-.7-1.3-.7-2.1 0-1.9 1.4-3.4 3.2-3.6.5-1.3 1.8-2.2 3.4-2.2z"/><path fill="none" stroke="${DARK}" stroke-width="1.5" d="M12 4.4v15.2" opacity=".55"/>`),
  underwear: svg(`<path fill="#66e0ff" d="M3.6 6.4h16.8v4.2L14 18.8h-4L3.6 10.6z"/><rect fill="${INK}" x="3.6" y="6.4" width="16.8" height="2.6"/><path fill="${DARK}" d="M6 12.6c1.6 0 2.8 1 3.4 2.4l-1.2 1.6C7.6 14.8 7 14 6 13.8zM18 12.6c-1.6 0-2.8 1-3.4 2.4l1.2 1.6c.6-1.8 1.2-2.6 2.2-2.8z" opacity=".4"/>`),
  arm: svg(`<path fill="${GOOP}" d="M6.2 3.4h3.2l1 5.8a6.8 6.8 0 0 1 8.4 6.6c0 1.7-.6 3.3-1.7 4.5l-2.2-2.2c.6-.6.9-1.4.9-2.3a3.8 3.8 0 0 0-6.2-3l-2 1.6L4.8 7z"/><circle fill="${DARK}" cx="7.6" cy="6.2" r=".9" opacity=".5"/><circle fill="${DARK}" cx="14.8" cy="14.4" r=".9" opacity=".5"/>`),
  ice: svg(`<path fill="none" stroke="#9ad9ff" stroke-width="2" stroke-linecap="round" d="M12 2.8v18.4M4 7.4l16 9.2M20 7.4 4 16.6"/><path fill="none" stroke="#9ad9ff" stroke-width="1.6" stroke-linecap="round" d="M12 2.8 9.8 5M12 2.8 14.2 5M12 21.2 9.8 19M12 21.2l2.2-2.2"/>`),
};

/** Look up an achievement icon by key; falls back to the goop drop. */
export function achIcon(key: string): string {
  return ICONS[key] ?? ICONS['drop']!;
}

/** General icon lookup - same table, non-achievement callers (shop rows, HUD, events). */
export const icon = achIcon;

/** Inline icon wrapped for text flow: sized 1em and baseline-aligned via the .ic class. */
export function ic(key: string): string {
  return `<span class="ic">${achIcon(key)}</span>`;
}
