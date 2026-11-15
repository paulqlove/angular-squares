import { buildResults, resultsDate, shortTeamName } from './results';

const scores = {
  q1: { away: 7, home: 3 },
  q2: { away: 14, home: 10 },
  q3: { away: 17, home: 17 },
  q4: { away: 27, home: 24 }
};

describe('buildResults', () => {
  it('lists each quarter with its winner, square and score, and the final score on top', () => {
    const r = buildResults({
      name: 'Office Pool',
      awayTeam: 'Harbor',
      homeTeam: 'Riverside',
      date: '2026-11-26T18:00Z',
      scores,
      winners: { q1: 'Jess', q2: 'Marcus', q3: 'Priya', q4: 'Dev' }
    });
    expect(r).toEqual(expect.objectContaining({ title: 'Office Pool', date: 'NOV 26', awayTeam: 'Harbor', homeTeam: 'Riverside', away: 27, home: 24 }));
    expect(r.rows.map(row => [row.label, row.name, row.initials, row.square])).toEqual([
      ['Q1', 'Jess', 'JE', 'Square 7-3'],
      ['Q2', 'Marcus', 'MA', 'Square 4-0'],
      ['Q3', 'Priya', 'PR', 'Square 7-7'],
      ['FINAL', 'Dev', 'DE', 'Square 7-4']
    ]);
    expect(r.rows[3].score).toEqual({ away: 27, home: 24 });
  });

  it('leaves an empty winning square without a name or badge', () => {
    const r = buildResults({ name: 'Pool', awayTeam: 'A', homeTeam: 'B', date: null, scores, winners: { q1: 'Jess' } });
    expect(r.rows[1]).toEqual(expect.objectContaining({ name: null, initials: '', square: 'Square 4-0' }));
    expect(r.date).toBe('');
  });

  it('gives two winners with the same start different badges', () => {
    const r = buildResults({ name: 'Pool', awayTeam: 'A', homeTeam: 'B', date: null, scores, winners: { q1: 'Jess', q2: 'Jessie' } });
    expect(r.rows[0].initials).not.toBe(r.rows[1].initials);
  });

  it('names unnamed teams', () => {
    const r = buildResults({ name: ' ', awayTeam: '', homeTeam: '', date: null, scores, winners: {} });
    expect([r.title, r.awayTeam, r.homeTeam]).toEqual(['Football Squares', 'Away team', 'Home team']);
  });
});

describe('resultsDate', () => {
  it('reads timestamps and ISO dates, and ignores bad ones', () => {
    expect(resultsDate(new Date(2026, 10, 26, 12).getTime())).toBe('NOV 26');
    expect(resultsDate('not a date')).toBe('');
    expect(resultsDate(undefined)).toBe('');
  });
});

describe('shortTeamName', () => {
  it('keeps the code a linked board stores', () => {
    expect(shortTeamName('KC')).toBe('KC');
    expect(shortTeamName(' PHI ')).toBe('PHI');
  });

  it('shortens an NFL team typed in full to its code', () => {
    expect(shortTeamName('Kansas City Chiefs')).toBe('KC');
    expect(shortTeamName('philadelphia  eagles')).toBe('PHI');
  });

  it('falls back to the name as typed when the app has no short name for it', () => {
    expect(shortTeamName('Riverside Community Wolverines')).toBe('Riverside Community Wolverines');
    expect(shortTeamName('Harbor')).toBe('Harbor');
    expect(shortTeamName('Eagles')).toBe('Eagles');
  });

  it('gives the picture short names, and full names it cannot shorten', () => {
    const r = buildResults({ name: 'Pool', awayTeam: 'Kansas City Chiefs', homeTeam: 'Riverside Community Wolverines', date: null, scores, winners: {} });
    expect([r.awayTeam, r.homeTeam]).toEqual(['KC', 'Riverside Community Wolverines']);
  });
});
