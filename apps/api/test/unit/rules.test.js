import { describe, expect, it } from 'vitest';
import { expiresAt, isConfirmed, routingEffect, shouldClear } from '../../src/lib/reports.js';
import { codeMatches, generateCode, hashCode, signSessionToken, verifySessionToken } from '../../src/lib/auth.js';
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

describe('report clearing and expiry', () => {
  it('clears once two drivers say gone and they outnumber "still there"', () => {
    expect(shouldClear(1, 0)).toBe(false);
    expect(shouldClear(2, 0)).toBe(true);
    expect(shouldClear(2, 2)).toBe(false);
    expect(shouldClear(3, 2)).toBe(true);
  });

  it('expires timed labels and keeps Closed and Flooded until cleared', () => {
    const from = new Date('2026-10-26T07:00:00+08:00');
    expect(expiresAt('jammed', from)).toEqual(new Date('2026-10-26T08:00:00+08:00'));
    expect(expiresAt('careful', from)).toEqual(new Date('2026-10-26T09:00:00+08:00'));
    expect(expiresAt('flooded', from)).toBeNull();
    expect(expiresAt('closed', from)).toBeNull();
  });
});

describe('sign-in codes and tokens', () => {
  const secret = 'x'.repeat(32);

  it('makes 6-digit codes', () => {
    for (let i = 0; i < 20; i += 1) expect(generateCode()).toMatch(/^\d{6}$/);
  });

  it('matches a code only for the address it was sent to', () => {
    const stored = hashCode(secret, 'Driver@Example.com', '123456');
    expect(codeMatches(secret, 'driver@example.com', '123456', stored)).toBe(true);
    expect(codeMatches(secret, 'driver@example.com', '654321', stored)).toBe(false);
    expect(codeMatches(secret, 'other@example.com', '123456', stored)).toBe(false);
  });

  it('round-trips a session token and rejects tampered ones', async () => {
    const token = await signSessionToken(secret, { userId: 'u1', sessionId: 's1' });
    expect(await verifySessionToken(secret, token)).toEqual({ userId: 'u1', sessionId: 's1' });
    expect(await verifySessionToken('y'.repeat(32), token)).toBeNull();
    expect(await verifySessionToken(secret, `${token}x`)).toBeNull();
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
