import { describe, expect, it } from 'vitest';
import { isConfirmed, routingEffect } from '../../src/lib/reports.js';
import { peakSpotActivity } from '../../src/lib/peak-spots.js';
import { escapeLike, normalizeQuery, parseSimpang } from '../../src/lib/search-text.js';

describe('report routing effects', () => {
  it('applies warning and soft avoids immediately', () => {
    expect(routingEffect('careful', 0)).toBe('warning');
    expect(routingEffect('jammed', 0)).toBe('soft_avoid');
    expect(routingEffect('danger', 0)).toBe('strong_soft_avoid');
  });

  it('only hard-avoids Closed and Flooded after two confirmations', () => {
    for (const label of ['closed', 'flooded']) {
      expect(isConfirmed(label, 1)).toBe(false);
      expect(routingEffect(label, 1)).toBe('none');
      expect(routingEffect(label, 2)).toBe('hard_avoid');
    }
  });
});

describe('peakSpotActivity', () => {
  const schoolRun = {
    days: [1, 2, 3, 4, 5],
    school_terms: ['term_1', 'term_2', 'term_3', 'term_4'],
    windows: [{ starts: '07:00', ends: '07:45' }],
  };
  // Monday 26 Oct 2026, Brunei time
  const mondayMorning = new Date('2026-10-26T07:10:00+08:00');

  it('is busy inside a window on a listed day', () => {
    expect(peakSpotActivity(schoolRun, { at: mondayMorning, termsToday: ['term_4'] }))
      .toEqual({ active: true, busy_until: '07:45' });
  });

  it('is quiet outside its windows and days', () => {
    expect(peakSpotActivity(schoolRun, { at: new Date('2026-10-26T08:00:00+08:00'), termsToday: ['term_4'] }).active).toBe(false);
    expect(peakSpotActivity(schoolRun, { at: new Date('2026-10-25T07:10:00+08:00'), termsToday: ['term_4'] }).active).toBe(false);
  });

  it('is quiet during school holidays when tied to school terms', () => {
    expect(peakSpotActivity(schoolRun, { at: mondayMorning, termsToday: [] }).active).toBe(false);
  });

  it('skips term filters when no school calendar is loaded', () => {
    expect(peakSpotActivity(schoolRun, { at: mondayMorning, termsToday: null }).active).toBe(true);
  });
});

describe('search text', () => {
  it('normalises case and spacing', () => {
    expect(normalizeQuery('  Stadium   NEGARA ')).toBe('stadium negara');
  });

  it('finds simpang numbers and the road around them', () => {
    expect(parseSimpang('simpang 1366')).toEqual({ number: '1366', road: null });
    expect(parseSimpang('spg 1366 jln gadong')).toEqual({ number: '1366', road: 'jalan gadong' });
    expect(parseSimpang('simpang 1366 of jalan merangking hilir'))
      .toEqual({ number: '1366', road: 'jalan merangking hilir' });
    expect(parseSimpang('stadium negara')).toBeNull();
  });

  it('escapes LIKE wildcards in user input', () => {
    expect(escapeLike('50%_off')).toBe('50\\%\\_off');
  });
});
