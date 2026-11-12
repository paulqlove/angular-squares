import { espnQuarterIsComplete, sameScores, sameWinners } from './espn-winners';

describe('espnQuarterIsComplete', () => {
  it('settles every quarter of a final once the period has passed Q3', () => {
    expect([0, 1, 2, 3].map(i => espnQuarterIsComplete(i, 4, true))).toEqual([true, true, true, true]);
  });

  it('leaves Q1–Q3 open on a final with no period, which is why the feed parser fills the period in', () => {
    expect([0, 1, 2, 3].map(i => espnQuarterIsComplete(i, 0, true))).toEqual([false, false, false, true]);
  });

  it('settles Q1–Q3 as the period passes them and leaves Q4 for the final', () => {
    expect([0, 1, 2, 3].map(i => espnQuarterIsComplete(i, 3, false))).toEqual([true, true, false, false]);
    expect([0, 1, 2, 3].map(i => espnQuarterIsComplete(i, 1, false))).toEqual([false, false, false, false]);
  });
});

describe('sameWinners', () => {
  it('matches equal maps regardless of key order', () => {
    expect(sameWinners({ q1: 'Kevin', q4: 'Zach' }, { q4: 'Zach', q1: 'Kevin' })).toBe(true);
    expect(sameWinners(undefined, {})).toBe(true);
  });

  it('spots a missing or different winner', () => {
    expect(sameWinners({ q1: 'Kevin', q4: 'Zach' }, { q4: 'Zach' })).toBe(false);
    expect(sameWinners({ q1: 'Kevin' }, { q1: 'Jo' })).toBe(false);
  });
});

describe('sameScores', () => {
  const scores = { q1: { home: 10, away: 3 }, q2: { home: 10, away: 13 }, q3: { home: 10, away: 16 }, q4: { home: 10, away: 27 } };

  it('matches the same scores and spots a change', () => {
    expect(sameScores(scores, structuredClone(scores))).toBe(true);
    expect(sameScores(scores, { ...scores, q4: { home: 10, away: 24 } })).toBe(false);
  });
});
