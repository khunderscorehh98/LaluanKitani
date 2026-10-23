import { describe, expect, it } from 'vitest';
import { isFridayExempt, openingStatus, weeklyHours } from '../../src/lib/hours.js';

// 23 Oct 2026 is a Friday; 22 Oct a Thursday; 25 Oct a Sunday. Times are Brunei (UTC+8).
const at = (iso) => new Date(`${iso}+08:00`);

const eatery = [
  ...[1, 2, 3, 4].map((day) => ({ day, opens: '07:00:00', closes: '22:00:00' })),
  { day: 5, opens: '07:00:00', closes: '12:00:00' },
  { day: 5, opens: '14:00:00', closes: '22:00:00' },
];
const petrol = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: '06:00:00', closes: '22:00:00' }));
const office = [1, 2, 3, 4, 6].flatMap((day) => [
  { day, opens: '07:45:00', closes: '12:15:00' },
  { day, opens: '13:30:00', closes: '16:30:00' },
]);

describe('openingStatus', () => {
  it('never guesses when no hours are entered', () => {
    expect(openingStatus([], { fridayExempt: false, at: at('2026-10-23T10:00') }))
      .toEqual({ state: 'hours_not_confirmed' });
  });

  it('shows closed for Friday prayers, reopening at 2pm', () => {
    expect(openingStatus(eatery, { fridayExempt: false, at: at('2026-10-23T12:40') }))
      .toEqual({ state: 'closed_friday_prayers', reopens_at: '14:00' });
  });

  it('applies the Friday rule even when hours are entered as one long window', () => {
    expect(openingStatus(petrol, { fridayExempt: false, at: at('2026-10-23T12:40') }))
      .toEqual({ state: 'closed_friday_prayers', reopens_at: '14:00' });
  });

  it('warns before the Friday prayer closure', () => {
    expect(openingStatus(petrol, { fridayExempt: false, at: at('2026-10-23T11:00') }))
      .toEqual({ state: 'open', closes_at: '12:00', closing_for_friday_prayers: true });
  });

  it('does not apply the Friday rule to exempt places', () => {
    expect(openingStatus(petrol, { fridayExempt: true, at: at('2026-10-23T12:40') }))
      .toEqual({ state: 'open', closes_at: '22:00', closing_for_friday_prayers: false });
  });

  it('does not apply the Friday rule on other days', () => {
    expect(openingStatus(petrol, { fridayExempt: false, at: at('2026-10-22T12:40') }).state).toBe('open');
  });

  it('gives the next opening time during a lunch break', () => {
    expect(openingStatus(office, { fridayExempt: false, at: at('2026-10-22T12:30') }))
      .toEqual({ state: 'closed', opens_at: '13:30' });
  });

  it('has no reopening time on a day with no hours', () => {
    expect(openingStatus(office, { fridayExempt: false, at: at('2026-10-25T10:00') }))
      .toEqual({ state: 'closed', opens_at: null });
  });

  it('works out the day in Brunei time, not UTC', () => {
    // 23:30 UTC on Thursday is 07:30 on Friday in Brunei
    const status = openingStatus(eatery, { fridayExempt: false, at: new Date('2026-10-22T23:30:00Z') });
    expect(status).toEqual({ state: 'open', closes_at: '12:00', closing_for_friday_prayers: false });
  });
});

describe('isFridayExempt', () => {
  it('exempts mosques and hospitals by category', () => {
    expect(isFridayExempt({ category: 'mosque', friday_exempt: null })).toBe(true);
    expect(isFridayExempt({ category: 'hospital', friday_exempt: null })).toBe(true);
    expect(isFridayExempt({ category: 'restaurant', friday_exempt: null })).toBe(false);
  });

  it('lets an admin setting win over the category', () => {
    expect(isFridayExempt({ category: 'restaurant', friday_exempt: true })).toBe(true);
    expect(isFridayExempt({ category: 'mosque', friday_exempt: false })).toBe(false);
  });
});

describe('weeklyHours', () => {
  it('lists all seven days, Sunday first, with HH:MM times', () => {
    const week = weeklyHours(eatery);
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ day: 0, windows: [] });
    expect(week[5].windows).toEqual([
      { opens: '07:00', closes: '12:00' },
      { opens: '14:00', closes: '22:00' },
    ]);
  });
});
