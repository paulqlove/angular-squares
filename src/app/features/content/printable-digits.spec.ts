import { PRE_NUMBERED_SEEDS, seededDigitOrder } from './printable-digits';

describe('seededDigitOrder', () => {
  it('uses each digit 0 through 9 once', () => {
    for (const seed of [0, 1, 214, 2027, 99999]) {
      expect([...seededDigitOrder(seed)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });

  it('returns the same order for the same seed', () => {
    expect(seededDigitOrder(42)).toEqual(seededDigitOrder(42));
  });

  it('shuffles, and the two sides differ', () => {
    const home = seededDigitOrder(PRE_NUMBERED_SEEDS.home);
    const away = seededDigitOrder(PRE_NUMBERED_SEEDS.away);
    expect(home).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(home).not.toEqual(away);
  });

  // The pre-numbered PDF in src/assets prints these digits. If this fails, remake that PDF.
  it('keeps the printed board digits', () => {
    expect(seededDigitOrder(PRE_NUMBERED_SEEDS.home)).toEqual([0, 8, 7, 3, 5, 6, 2, 1, 4, 9]);
    expect(seededDigitOrder(PRE_NUMBERED_SEEDS.away)).toEqual([9, 2, 8, 1, 5, 0, 6, 7, 4, 3]);
  });
});
