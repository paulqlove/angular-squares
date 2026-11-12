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

  it('shortens a square that won every quarter to ALL 4', () => {
    expect(quarterLabels(['q1', 'q2', 'q3', 'q4'].map(quarter => ({ key: '0-1', quarter: quarter as 'q1' }))))
      .toEqual({ '0-1': 'ALL 4' });
  });

  it('shortens Q1 Q2 Q3 to 1·2·3', () => {
    expect(quarterLabels(['q1', 'q2', 'q3'].map(quarter => ({ key: '0-1', quarter: quarter as 'q1' }))))
      .toEqual({ '0-1': '1·2·3' });
  });

  it('shortens a square that won FINAL and another quarter', () => {
    const won = (...qs: string[]) => quarterLabels(qs.map(quarter => ({ key: '0-1', quarter: quarter as 'q1' })))['0-1'];
    expect(won('q2', 'q4')).toBe('2·F');
    expect(won('q1', 'q3', 'q4')).toBe('1·3·F');
    expect(won('q1', 'q2')).toBe('Q1 Q2');
  });

  it('returns nothing when no square has won', () => {
    expect(quarterLabels([])).toEqual({});
  });
});
