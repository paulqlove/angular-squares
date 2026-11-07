import { shuffleSquares } from './shuffle-squares';

describe('shuffleSquares', () => {
  const picks = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (let i = 0; i < 20; i++) out[`${Math.floor(i / 10) * 7 % 10}-${i % 10}`] = i < 12 ? 'Ann' : 'Bob';
    return out;
  };

  it('keeps each player\'s count and puts every pick in its own cell inside the grid', () => {
    const next = shuffleSquares(picks(), 5, 10)!;
    expect(Object.keys(next).length).toBe(20);
    expect(Object.values(next).filter(n => n === 'Ann').length).toBe(12);
    expect(Object.values(next).filter(n => n === 'Bob').length).toBe(8);
    for (const key of Object.keys(next)) {
      const [r, c] = key.split('-').map(Number);
      expect(r).toBeLessThan(5);
      expect(c).toBeLessThan(10);
    }
  });

  it('fills a full smaller board exactly', () => {
    const full: Record<string, string> = {};
    for (let i = 0; i < 25; i++) full[`${Math.floor(i / 5)}-${i % 5}`] = `P${i}`;
    expect(Object.keys(shuffleSquares(full, 5, 5)!).length).toBe(25);
  });

  it('returns null when the picks do not fit', () => {
    const tooMany: Record<string, string> = {};
    for (let i = 0; i < 26; i++) tooMany[`${Math.floor(i / 10)}-${i % 10}`] = 'Ann';
    expect(shuffleSquares(tooMany, 5, 5)).toBeNull();
  });

  it('does not keep the picks in rows or columns', () => {
    const row: Record<string, string> = {};
    for (let c = 0; c < 5; c++) row[`0-${c}`] = 'Ann';
    const rowsUsed = new Set<number>();
    for (let t = 0; t < 40; t++) Object.keys(shuffleSquares(row, 5, 5)!).forEach(k => rowsUsed.add(+k.split('-')[0]));
    expect(rowsUsed.size).toBe(5);
  });
});
