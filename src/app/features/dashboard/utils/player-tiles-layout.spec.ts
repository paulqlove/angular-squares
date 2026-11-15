import { newestTiles, tileLayout } from './player-tiles-layout';

describe('player tiles layout', () => {
  it('fits as many tiles a line as the width holds', () => {
    // 11 tiles take 11 * 14 + 10 * 4 = 194px; a 12th needs 212px
    expect(tileLayout(197, 40).columns).toBe(11);
    expect(tileLayout(211, 40).columns).toBe(11);
    expect(tileLayout(212, 40).columns).toBe(12);
  });

  it('shows every game when two lines hold them', () => {
    expect(tileLayout(197, 20)).toEqual({ columns: 11, shown: 20, countBeside: false });
    expect(tileLayout(197, 22).shown).toBe(22);
  });

  it('caps at two lines when there are more games', () => {
    expect(tileLayout(197, 23)).toEqual({ columns: 11, shown: 22, countBeside: false });
    expect(tileLayout(197, 100).shown).toBe(22);
  });

  it('puts the game count beside one line of tiles only when there is room for the widest count', () => {
    // 8 tiles are 140px; the count needs 88px more
    expect(tileLayout(228, 8).countBeside).toBe(true);
    expect(tileLayout(227, 8).countBeside).toBe(false);
    expect(tileLayout(400, 20).countBeside).toBe(false);
  });

  it('never puts the count beside two lines', () => {
    expect(tileLayout(400, 30)).toEqual({ columns: 22, shown: 30, countBeside: false });
  });

  it('shows nothing before the row has a width', () => {
    expect(tileLayout(0, 20)).toEqual({ columns: 0, shown: 0, countBeside: false });
  });

  it('keeps the newest tiles and drops the oldest', () => {
    expect(newestTiles(['a', 'b', 'c', 'd'], 2)).toEqual(['c', 'd']);
    expect(newestTiles(['a', 'b'], 5)).toEqual(['a', 'b']);
    expect(newestTiles(['a', 'b'], 0)).toEqual([]);
  });
});
