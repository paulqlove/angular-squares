import { DAY_MS, DEFAULT_SPLIT, PLANS, effectiveQuarterShares, isEmptyQuarterRule, applyPurchase, daysLeft, extendExpiry, isValidSplit, seasonPriceFor, splitFractions } from './plans';

const NOW = Date.UTC(2026, 10, 2);

describe('plans', () => {
  it('a new Week Pass lasts 7 days and a Season Pass 210 days', () => {
    expect(extendExpiry(null, 'week', NOW)).toBe(NOW + 7 * DAY_MS);
    expect(extendExpiry(null, 'season', NOW)).toBe(NOW + 210 * DAY_MS);
  });

  it('buying more time adds to what is left', () => {
    const threeDaysLeft = NOW + 3 * DAY_MS;
    expect(extendExpiry(threeDaysLeft, 'week', NOW)).toBe(NOW + 10 * DAY_MS);
  });

  it('an expired pass starts fresh from now', () => {
    expect(extendExpiry(NOW - DAY_MS, 'week', NOW)).toBe(NOW + 7 * DAY_MS);
  });

  it('a Week Pass bought during a Season Pass keeps the Season plan and adds 7 days', () => {
    const season = { plan: 'season' as const, expiresAt: NOW + 100 * DAY_MS };
    expect(applyPurchase(season, 'week', NOW)).toEqual({ plan: 'season', expiresAt: NOW + 107 * DAY_MS, updatedAt: NOW });
  });

  it('upgrading from an active Week Pass becomes Season and keeps the remaining days', () => {
    const week = { plan: 'week' as const, expiresAt: NOW + 4 * DAY_MS };
    expect(applyPurchase(week, 'season', NOW).plan).toBe('season');
    expect(applyPurchase(week, 'season', NOW).expiresAt).toBe(NOW + 214 * DAY_MS);
  });

  it('an active Week Pass is credited toward a Season Pass', () => {
    expect(seasonPriceFor({ plan: 'week', expiresAt: NOW + DAY_MS }, NOW)).toBe(24);
    expect(seasonPriceFor(null, NOW)).toBe(PLANS.season.priceUsd);
    expect(seasonPriceFor({ plan: 'week', expiresAt: NOW - 1 }, NOW)).toBe(PLANS.season.priceUsd);
  });

  it('counts days left, rounding up', () => {
    expect(daysLeft({ plan: 'week', expiresAt: NOW + DAY_MS + 1 }, NOW)).toBe(2);
    expect(daysLeft({ plan: 'week', expiresAt: NOW - 1 }, NOW)).toBe(0);
  });

  it('accepts only whole tenths that sum to 100%', () => {
    expect(isValidSplit(DEFAULT_SPLIT)).toBe(true);
    expect(isValidSplit({ q1: 100, q2: 175, q3: 275, q4: 450 })).toBe(true);
    expect(isValidSplit({ q1: 200, q2: 200, q3: 200, q4: 300 })).toBe(false);
    expect(isValidSplit({ q1: 200.5, q2: 200, q3: 200, q4: 399.5 })).toBe(false);
  });

  it('falls back to 20/20/20/40 for a missing or invalid split', () => {
    expect(splitFractions(undefined)).toEqual({ q1: 0.2, q2: 0.2, q3: 0.2, q4: 0.4 });
    expect(splitFractions({ q1: 250, q2: 250, q3: 250, q4: 250 })).toEqual({ q1: 0.25, q2: 0.25, q3: 0.25, q4: 0.25 });
  });
});

describe('effectiveQuarterShares', () => {
  const classic = splitFractions(null);
  const none = { q1: false, q2: false, q3: false, q4: false };
  const round = (s: { q1: number; q2: number; q3: number; q4: number }) =>
    [s.q1, s.q2, s.q3, s.q4].map(v => Math.round(v * 1000) / 1000);

  it('changes nothing when no quarter is empty', () => {
    expect(effectiveQuarterShares(classic, none, 'final')).toEqual(classic);
    expect(effectiveQuarterShares(classic, none, 'redistribute')).toEqual(classic);
  });

  it('final: an empty early quarter rolls into Q4', () => {
    expect(round(effectiveQuarterShares(classic, { ...none, q2: true }, 'final'))).toEqual([0.2, 0, 0.2, 0.6]);
    expect(round(effectiveQuarterShares(classic, { ...none, q1: true, q3: true }, 'final'))).toEqual([0, 0.2, 0, 0.8]);
  });

  it('final: an empty Q4 is split among the other quarters, including rolled points', () => {
    expect(round(effectiveQuarterShares(classic, { ...none, q4: true }, 'final'))).toEqual([0.333, 0.333, 0.333, 0]);
    expect(round(effectiveQuarterShares(classic, { ...none, q1: true, q4: true }, 'final'))).toEqual([0, 0.5, 0.5, 0]);
  });

  it('final: nothing is awarded when every quarter is empty', () => {
    expect(round(effectiveQuarterShares(classic, { q1: true, q2: true, q3: true, q4: true }, 'final'))).toEqual([0, 0, 0, 0]);
  });

  it('redistribute: empty quarters are spread in proportion to the others', () => {
    expect(round(effectiveQuarterShares(classic, { ...none, q1: true }, 'redistribute'))).toEqual([0, 0.25, 0.25, 0.5]);
    expect(round(effectiveQuarterShares(classic, { ...none, q4: true }, 'redistribute'))).toEqual([0.333, 0.333, 0.333, 0]);
  });

  it('a quarter that has not been played yet still receives points', () => {
    expect(round(effectiveQuarterShares(classic, { ...none, q1: true }, 'redistribute'))[3]).toBe(0.5);
  });

  it('quarters with a 0 share are ignored and never receive points', () => {
    const halfFinal = splitFractions({ q1: 0, q2: 500, q3: 0, q4: 500 });
    expect(round(effectiveQuarterShares(halfFinal, { ...none, q1: true, q3: true }, 'final'))).toEqual([0, 0.5, 0, 0.5]);
    expect(round(effectiveQuarterShares(halfFinal, { ...none, q2: true }, 'redistribute'))).toEqual([0, 0, 0, 1]);
  });

  it('final falls back to redistribute when Q4 has no share', () => {
    const noFinal = splitFractions({ q1: 300, q2: 300, q3: 400, q4: 0 });
    expect(round(effectiveQuarterShares(noFinal, { ...none, q1: true }, 'final'))).toEqual([0, 0.429, 0.571, 0]);
  });

  it('a missing rule behaves like final', () => {
    expect(effectiveQuarterShares(classic, { ...none, q2: true }, undefined)).toEqual(effectiveQuarterShares(classic, { ...none, q2: true }, 'final'));
  });

  it('only accepts the two known rules', () => {
    expect(isEmptyQuarterRule('final')).toBe(true);
    expect(isEmptyQuarterRule('redistribute')).toBe(true);
    expect(isEmptyQuarterRule('refund')).toBe(false);
    expect(isEmptyQuarterRule(null)).toBe(false);
  });
});
