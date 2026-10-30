import { describe, it, expect } from 'vitest';
import { fmt, fmtMass, heavierThan, clock, SHORT, GOOP_UNITS } from '../src/fmt.js';
import { STAGES, END, massGrams } from '../src/econ.js';

describe('number names', () => {
  it('keeps the old short names', () => {
    expect(fmt(5)).toBe('5'); expect(fmt(2.5)).toBe('2.5'); expect(fmt(999)).toBe('999');
    expect(fmt(1234)).toBe('1.23K'); expect(fmt(999999)).toBe('999K'); expect(fmt(1e6)).toBe('1.00M');
    expect(fmt(4.56e21)).toBe('4.56Sx');
  });
  it('names every power of a thousand through decillion, exactly', () => {
    const names = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    expect(SHORT).toEqual(names);
    names.forEach((n, i) => expect(fmt(Number('1e' + 3 * (i + 1)))).toBe('1.00' + n));
    expect(fmt(1e33)).toBe('1.00Dc'); expect(fmt(12.5e30)).toBe('12.5No'); expect(fmt(999e33)).toBe('999Dc');
  });
  it('then goop units: a Burp is 1e36, a Belly 1e39', () => {
    expect(fmt(1e36)).toBe('1.00 Burp'); expect(fmt(2e36)).toBe('2.00 Burps'); expect(fmt(450e36)).toBe('450 Burps');
    expect(fmt(1e39)).toBe('1.00 Belly'); expect(fmt(2.5e39)).toBe('2.50 Bellies');
    expect(fmt(1e42)).toBe('1.00 Gulp'); expect(fmt(3e45)).toBe('3.00 Feasts'); expect(fmt(1e48)).toBe('1.00 Gorge'); expect(fmt(7e51)).toBe('7.00 Gluts');
    expect(GOOP_UNITS.length).toBeGreaterThanOrEqual(4);
    expect(fmt(1e54)).toBe('1.00e54');
  });
  it('stays short enough for the slop tag on a phone (12 characters: "99.9 Bellies")', () => {
    for (let e = 0; e <= 56; e += 0.37) for (const m of [1, 9.999]) expect(fmt(m * Math.pow(10, e)).length).toBeLessThanOrEqual(12);
  });
});

describe('mass', () => {
  it('real units up to the Sun, then galaxies, superclusters and universes', () => {
    expect(fmtMass(1)).toBe('1.00 g');
    expect(fmtMass(1.99e33)).toBe('1.00 Suns');
    expect(fmtMass(1e39)).toBe('502K Suns');
    expect(fmtMass(3e45)).toBe('1.00 Milky Way'); expect(fmtMass(6e45)).toBe('2.00 Milky Ways');
    expect(fmtMass(2e48)).toBe('1.00 Laniakea');
    expect(fmtMass(1.5e56)).toBe('1.00 Universe'); expect(fmtMass(1e60)).toBe('6,667 Universes');
  });
  it('the readout stays short at every stage (fits the mass tag)', () => {
    for (let k = 0; k < STAGES.length; k++) for (const f of [0, .5, .99]) {
      const g = massGrams(STAGES[k].at + (k + 1 < STAGES.length ? STAGES[k + 1].at - STAGES[k].at : END.at - STAGES[k].at) * f);
      expect(fmtMass(g).length).toBeLessThanOrEqual(24);
    }
  });
  it('compares with cosmic objects past the Sun', () => {
    expect(heavierThan(5e33)).toBe('Heavier than Sirius');
    expect(heavierThan(1e40)).toBe('Heavier than Sagittarius A*');
    expect(heavierThan(4e45)).toBe('Heavier than the Milky Way');
    expect(heavierThan(2e56)).toBe('Heavier than the observable universe');
  });
  it('clock reads hours past sixty minutes', () => {
    expect(clock(65)).toBe('1 min 5 s'); expect(clock(3725)).toBe('1 h 2 min 5 s'); expect(clock(5)).toBe('5 s');
  });
});
