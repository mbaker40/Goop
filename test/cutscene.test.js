import { describe, it, expect } from 'vitest';
import { BEATS, CARDS, LENGTH, EVOLUTION, EVO_FROM, EVO_EACH, HANDOFF, ENTRY, CARD_FADE, HOLD, CUES, timeline, frameAt, zoomAt, cuesBetween, canSkip, interruptedEnding } from '../src/cutscene.js';

describe('the ending timeline', () => {
  it('six beats, back to back, with the design timings, 60 to 75 seconds long', () => {
    expect(BEATS.map(b => b.id)).toEqual(['bite', 'bang', 'zoom', 'lab', 'stinger', 'landing']);
    expect(BEATS.map(b => b.from)).toEqual([0, 6, 22, 42, 58, 70]);
    for (let i = 1; i < BEATS.length; i++) expect(BEATS[i].from).toBe(BEATS[i - 1].to);
    expect(LENGTH).toBeGreaterThanOrEqual(60); expect(LENGTH).toBeLessThanOrEqual(75);
  });
  it('the title cards, word for word; each stinger card holds 2.5 seconds at full strength on black', () => {
    expect(CARDS.map(c => c.text)).toEqual(['Fourteen billion years later. Roughly.', 'GOOP 2: FEED THE HUMAN.', 'You are the lunch.', 'Coming eventually.']);
    for (const c of CARDS.slice(1)) { expect(c.to - c.from - 2 * CARD_FADE).toBeCloseTo(HOLD); expect(HOLD).toBe(2.5); expect(c.on).toBe('black'); expect(c.from).toBeGreaterThanOrEqual(58); expect(c.to).toBeLessThanOrEqual(LENGTH); }
    for (const c of CARDS) { let full = 0; for (let t = c.from; t < c.to; t += 0.01) if (frameAt(t).cardAlpha >= 0.999) full += 0.01; expect(full).toBeGreaterThanOrEqual(2.45); }
    expect(CARDS[0].to - CARDS[0].from).toBeGreaterThanOrEqual(5);           // the long card gets time to be read
    expect(CARDS[0].from).toBeGreaterThanOrEqual(6); expect(CARDS[0].to).toBeLessThanOrEqual(22);
  });
  it('frameAt picks the right beat and card', () => {
    expect(frameAt(0).beat).toBe('bite'); expect(frameAt(5.99).beat).toBe('bite');
    expect(frameAt(6).beat).toBe('bang'); expect(frameAt(30).beat).toBe('zoom'); expect(frameAt(50).beat).toBe('lab');
    expect(frameAt(60).beat).toBe('stinger'); expect(frameAt(69).beat).toBe('stinger'); expect(frameAt(70).beat).toBe('landing'); expect(frameAt(500).beat).toBe('landing');
    expect(frameAt(18).card.text).toMatch(/^Fourteen/); expect(frameAt(64).card.text).toBe('You are the lunch.'); expect(frameAt(50).card).toBe(null);
    expect(frameAt(69.9).done).toBe(false); expect(frameAt(70).done).toBe(true);
    expect(frameAt(-3).beat).toBe('bite');
  });
  it('eight evolution stills at 1.2 s each, every one a goop, ending with the goop in a lab coat as the lab begins', () => {
    expect(EVOLUTION).toEqual(['fish', 'lizard', 'legs', 'frog', 'ape', 'clipboard', 'goggles', 'goop']);
    expect(EVO_FROM + EVOLUTION.length * EVO_EACH).toBeCloseTo(42);
    const seen = [];
    for (let t = 22; t < 42; t += 0.05) { const e = frameAt(t).evo; if (e >= 0 && seen[seen.length - 1] !== e) seen.push(e); }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  it('reduced motion shortens the transitions but keeps every beat, card and second', () => {
    const a = timeline(false), b = timeline(true);
    expect(b.fade).toBeLessThan(a.fade);
    expect(b.beats).toEqual(a.beats); expect(b.cards).toEqual(a.cards); expect(b.length).toBe(a.length);
    for (let t = 0; t < LENGTH; t += 0.5) { expect(frameAt(t, true).beat).toBe(frameAt(t, false).beat); expect(!!frameAt(t, true).card).toBe(!!frameAt(t, false).card); }
    expect(frameAt(70 + 0.2, true).black).toBe(0);             // already faded into the landing
    expect(frameAt(70 + 0.2, false).black).toBeGreaterThan(0); // still fading in
    expect(zoomAt(5, true)).toBe(0.25); expect(zoomAt(5, false)).toBeCloseTo((5 - HANDOFF) / (10.4 - HANDOFF));
    expect(zoomAt(1, false)).toBe(0); expect(zoomAt(20, true)).toBe(1);
  });
  it('sound cues fire once each across any frame split, and the first three seconds are silent', () => {
    let n = 0; for (let t = 0; t < 70; t += 0.37) n += cuesBetween(t, t + 0.37).length;
    expect(n).toBe(cuesBetween(-1, 999).length);
    expect(cuesBetween(-1, 3)).toEqual([]);
  });
  it('skippable only after a full viewing', () => {
    expect(canSkip({ cutsceneSeen: 0 })).toBe(false); expect(canSkip({ cutsceneSeen: 1 })).toBe(true); expect(canSkip(null)).toBe(false);
  });
});

describe('the beats hand off to each other', () => {
  it('match cuts between the story beats (no dip to black), one dip into the landing', () => {
    expect(BEATS.map(b => ENTRY[b.id])).toEqual(['none', 'match', 'match', 'match', 'match', 'dip']);
    for (const t of [5.99, 6, 6.1, 21.9, 22, 22.2, 41.9, 42, 42.2, 57.9, 58, 58.2]) expect(frameAt(t).black, String(t)).toBe(0);
    expect(frameAt(69.95).black).toBeGreaterThan(0.5);
  });
  it('the lab\'s two feeds each get a feed cue and a tiny burp just after; the sting lands with the first card', () => {
    const feeds = CUES.filter(c => c.id === 'feed').map(c => c.at), burps = CUES.filter(c => c.id === 'tinyburp').map(c => c.at);
    expect(feeds).toEqual([47, 53]); burps.forEach((b, i) => { expect(b - feeds[i]).toBeGreaterThan(0.4); expect(b - feeds[i]).toBeLessThan(1); });
    expect(CUES.find(c => c.id === 'sting').at).toBe(CARDS[1].from);
  });
});

describe('closing the tab during the first viewing', () => {
  it('counts as an interrupted ending only when Eat the Rest was pressed and the ending never finished', () => {
    expect(interruptedEnding({ ate: true }, { universes: 1, cutsceneSeen: 0 })).toBe(true);
    expect(interruptedEnding({ ate: true }, { universes: 1, cutsceneSeen: 1 })).toBe(false);
    expect(interruptedEnding({ ate: false }, { universes: 1, cutsceneSeen: 0 })).toBe(false);
    expect(interruptedEnding({ ate: true }, { universes: 0, cutsceneSeen: 0 })).toBe(false);
    expect(interruptedEnding(null, null)).toBe(false);
  });
});
