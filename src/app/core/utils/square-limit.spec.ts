import { atSquareLimit, clampSquareLimit, normalizePlayerKey, readSquareLimit, squareLimitPreview, squaresHeldBy } from './square-limit';

describe('square limit', () => {
  const squares = { '0-0': 'Mike', '0-1': ' mike ', '0-2': 'MIKE', '1-1': 'Ann' };

  it('counts a name ignoring case and extra spaces', () => {
    expect(normalizePlayerKey('  Big   Mike ')).toBe('big mike');
    expect(squaresHeldBy(squares, 'mike')).toBe(3);
    expect(squaresHeldBy(squares, 'Ann')).toBe(1);
    expect(squaresHeldBy(squares, '')).toBe(0);
    expect(squaresHeldBy(null, 'Mike')).toBe(0);
  });

  it('is at the limit only when a limit is set and reached', () => {
    expect(atSquareLimit(squares, 'Mike', 3)).toBe(true);
    expect(atSquareLimit(squares, 'Mike', 4)).toBe(false);
    expect(atSquareLimit(squares, 'Mike', undefined)).toBe(false);
  });

  it('reads and clamps the limit', () => {
    expect(readSquareLimit(5)).toBe(5);
    expect(readSquareLimit(0)).toBeUndefined();
    expect(readSquareLimit('5')).toBeUndefined();
    expect(readSquareLimit(101)).toBeUndefined();
    expect(clampSquareLimit(0)).toBe(1);
    expect(clampSquareLimit(99)).toBe(25);
    expect(clampSquareLimit(NaN)).toBe(5);
  });

  it('previews how many players fill the board', () => {
    expect(squareLimitPreview(5, 100)).toBe('5 each fills the board with 20 players or more.');
    expect(squareLimitPreview(3, 25)).toBe('3 each fills the board with 9 players or more.');
  });
});
