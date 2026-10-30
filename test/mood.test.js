import { describe, it, expect } from 'vitest';
import { moodOf, MOOD_IDS, THOUGHTS, pickThought, remember, NO_REPEAT, HUNGRY_AFTER } from '../src/mood.js';
import { rng } from '../src/rng.js';

describe('moods', () => {
  it('six moods plus content', () => {
    expect(MOOD_IDS.sort()).toEqual(['delighted', 'frozen', 'hungry', 'sleepy', 'smug', 'stuffed']);
    expect(moodOf({})).toBe('content');
  });
  it('each mood from its trigger', () => {
    expect(moodOf({ idle: HUNGRY_AFTER })).toBe('hungry');
    expect(moodOf({ idle: HUNGRY_AFTER - 1 })).toBe('content');
    expect(moodOf({ sinceCatch: 1 })).toBe('delighted');
    expect(moodOf({ frenzy: 10 })).toBe('stuffed');
    expect(moodOf({ sinceAway: 3 })).toBe('sleepy');
    expect(moodOf({ freeze: 4 })).toBe('frozen');
    expect(moodOf({ sinceHop: 2 })).toBe('smug');
  });
  it('priorities: frozen beats everything, a fresh catch beats a frenzy, being fed beats hunger', () => {
    expect(moodOf({ freeze: 1, frenzy: 5, sinceCatch: 0, idle: 99 })).toBe('frozen');
    expect(moodOf({ frenzy: 5, sinceCatch: 0 })).toBe('delighted');
    expect(moodOf({ frenzy: 5, idle: 99 })).toBe('stuffed');
    expect(moodOf({ sinceAway: 1, idle: 99 })).toBe('sleepy');
  });
});

describe('one-liners', () => {
  it('sixty to eighty, unique ids, short enough for the bubble', () => {
    expect(THOUGHTS.length).toBeGreaterThanOrEqual(60); expect(THOUGHTS.length).toBeLessThanOrEqual(80);
    expect(new Set(THOUGHTS.map(t => t.id)).size).toBe(THOUGHTS.length);
    for (const t of THOUGHTS) { expect(t.text.length).toBeLessThanOrEqual(60); expect(t.text).toMatch(/[.!?]$/); }
    for (const m of MOOD_IDS) expect(THOUGHTS.filter(t => t.mood === m).length).toBeGreaterThanOrEqual(5);
  });
  it('never repeats within the last ten, in any mood, at any stage', () => {
    const rand = rng(42);
    for (const mood of [...MOOD_IDS, 'content']) for (let stage = 0; stage < 20; stage += 3) {
      const recent = [], shown = [];
      for (let i = 0; i < 200; i++) { const t = pickThought(mood, stage, recent, rand); shown.push(t.id); remember(recent, t.id); }
      for (let i = 0; i < shown.length; i++) expect(shown.slice(Math.max(0, i - NO_REPEAT), i)).not.toContain(shown[i]);
    }
  });
  it('mixed moods still never repeat', () => {
    const rand = rng(7), recent = [], shown = [];
    for (let i = 0; i < 500; i++) { const mood = ['hungry', 'content', 'smug', 'frozen'][i % 4]; const t = pickThought(mood, i % 20, recent, rand); shown.push(t.id); remember(recent, t.id); }
    for (let i = 0; i < shown.length; i++) expect(shown.slice(Math.max(0, i - NO_REPEAT), i)).not.toContain(shown[i]);
  });
  it('prefers mood lines in a mood, and stage lines only where they fit', () => {
    const rand = rng(3);
    expect(pickThought('hungry', 0, [], rand).mood).toBe('hungry');
    for (let i = 0; i < 100; i++) { const t = pickThought('content', 0, [], rand); expect(t.mood).toBe('any'); if (t.k) expect(t.k[0]).toBe(0); }
  });
});
