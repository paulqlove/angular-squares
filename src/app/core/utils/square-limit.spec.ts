import { clampSquareLimit, normalizePlayerKey, readSquareLimit, squareLimitMessage, squareLimitState, squaresHeldBy } from './square-limit';

describe('square limit', () => {
  const squares = { '0-0': 'Mike', '0-1': ' mike ', '0-2': 'MIKE', '1-1': 'Ann' };

  it('counts a name ignoring case and extra spaces', () => {
    expect(normalizePlayerKey('  Big   Mike ')).toBe('big mike');
    expect(squaresHeldBy(squares, 'mike')).toBe(3);
    expect(squaresHeldBy(squares, 'Ann')).toBe(1);
    expect(squaresHeldBy(squares, '')).toBe(0);
    expect(squaresHeldBy(null, 'Mike')).toBe(0);
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

  it('reports how many squares a name holds against the limit, with no exception for anyone', () => {
    expect(squareLimitState(squares, 'Mike', 5)).toEqual({ held: 3, max: 5, full: false });
    expect(squareLimitState(squares, 'mike', 3)).toEqual({ held: 3, max: 3, full: true });
    // a host who already holds more than a limit set later is over it and cannot add more
    expect(squareLimitState(squares, 'Mike', 2)).toEqual({ held: 3, max: 2, full: true });
    expect(squareLimitState(squares, 'Ann', 1)).toEqual({ held: 1, max: 1, full: true });
    expect(squareLimitState(squares, 'Nobody', 5)).toEqual({ held: 0, max: 5, full: false });
  });

  it('has nothing to report without a limit or without a name', () => {
    expect(squareLimitState(squares, 'Mike', undefined)).toBeNull();
    expect(squareLimitState(squares, '  ', 5)).toBeNull();
    expect(squareLimitState(null, 'Mike', 5)).toEqual({ held: 0, max: 5, full: false });
  });

  it('words the message with the real count', () => {
    expect(squareLimitMessage(5, 5)).toBe('You have 5 of 5 squares. Tap one of yours to give it back.');
    expect(squareLimitMessage(13, 5)).toBe('You have 13 of 5 squares. Tap one of yours to give it back.');
  });
});
