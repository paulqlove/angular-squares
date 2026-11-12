import { quarterLabels } from './quarter-labels';

describe('quarterLabels', () => {
  it('names each quarter, with the fourth as FINAL', () => {
    expect(quarterLabels([
      { key: '0-1', quarter: 'q1' },
      { key: '2-3', quarter: 'q2' },
      { key: '4-5', quarter: 'q3' },
      { key: '6-7', quarter: 'q4' },
    ])).toEqual({ '0-1': 'Q1', '2-3': 'Q2', '4-5': 'Q3', '6-7': 'FINAL' });
  });

  it('joins the quarters of a square that won more than once, in game order', () => {
    expect(quarterLabels([
      { key: '0-1', quarter: 'q3' },
      { key: '0-1', quarter: 'q1' },
    ])).toEqual({ '0-1': 'Q1 Q3' });
  });

  it('returns nothing when no square has won', () => {
    expect(quarterLabels([])).toEqual({});
  });
});
