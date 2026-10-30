// Saves in the Phase 1 (six-stage) format, key 'feed-the-goop-v2', schema 2.
// `pastSun` beat the Sun and kept feeding: 4.2e15 lifetime slop, which is stage 8 (Nebula Nibbler) now.
export const pastSun = JSON.stringify({
  v: 2, at: 1793400000000, prefs: { sound: false },
  state: { slop: 3.1e15, life: 4.2e15, stage: 5, own: [60, 55, 50, 45, 40, 35, 30, 25, 20, 18], ups: { spoon: true, ladle: true, mut1: true, mut2: true, mut3: true, mut4: true, mut5: true, straw2: true },
    feeds: 9000, asc: 2, frenzy: 0, fmult: 7, freeze: 0, won: true, winSeen: true, played: 2400, dust: 4, perks: { head: 1, fingers: 1 } },
  stats: { clicks: 9500, feeds: 9000, paidClicks: 9000, hops: 2, wins: 3, peakSps: 2e12, lifetimeSlop: 5e15, runStageAt: [0, 100, 200, 300, 400, 500, 1900], bestStageAt: [0, 90, 180, 290, 380, 480, 1700], seen: { geyser: 9 }, caught: { geyser: 8 } },
  badges: { feed1: 1, sun: 2 }, bests: { sun: 1700, hops: 2 }, profile: { name: 'Dr. Ooze' },
});
// `midGame` is short of the Sun, mid stage 4.
export const midGame = JSON.stringify({
  v: 2, at: 1793400000000, prefs: { sound: true },
  state: { slop: 1e8, life: 3.2e9, stage: 3, own: [40, 35, 30, 25, 20, 12, 6, 2, 0, 0], ups: { spoon: true, mut3: true }, feeds: 500, asc: 0, won: false, played: 900, dust: 0, perks: {} },
  stats: { feeds: 500, runStageAt: [0, 100, 200, 300] }, badges: {}, bests: {}, profile: {},
});
