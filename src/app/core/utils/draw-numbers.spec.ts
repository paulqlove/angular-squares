import { drawBoardNumbers, drawNumberLine, numberDrawMs } from './draw-numbers';

describe('drawNumberLine', () => {
  it('uses each digit 0-9 once on a 10-wide side', () => {
    expect([...drawNumberLine(10)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('uses each pair group 0-4 once on a 5-wide side', () => {
    expect([...drawNumberLine(5)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it('shuffles with the given random source', () => {
    expect(drawNumberLine(5, () => 0)).toEqual([1, 2, 3, 4, 0]);
  });
});

describe('drawBoardNumbers', () => {
  it('sizes each line to its side of the board', () => {
    const full = drawBoardNumbers(100);
    expect(full.homeNumbers.length).toBe(10);
    expect(full.awayNumbers.length).toBe(10);
    const half = drawBoardNumbers(50);
    expect(half.homeNumbers.length).toBe(10);
    expect(half.awayNumbers.length).toBe(5);
    const quarter = drawBoardNumbers(25);
    expect(quarter.homeNumbers.length).toBe(5);
    expect(quarter.awayNumbers.length).toBe(5);
  });
});

describe('numberDrawMs', () => {
  it('runs until the last digit has risen in: 300ms each, 40ms apart', () => {
    expect(numberDrawMs(20)).toBe(1060);
    expect(numberDrawMs(10)).toBe(660);
    expect(numberDrawMs(1)).toBe(300);
  });
});
