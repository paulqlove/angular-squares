import { DAY_MS, DEFAULT_SPLIT, PLANS, applyPurchase, daysLeft, extendExpiry, isValidSplit, seasonPriceFor, splitFractions } from './plans';

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
