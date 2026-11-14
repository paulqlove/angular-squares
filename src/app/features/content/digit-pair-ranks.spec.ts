import { SQUARES_PROBABILITIES } from '../super-bowl-squares/utils/probability.utils';
import { bottomDigitPairs, topDigitPairs } from './digit-pair-ranks';

describe('topDigitPairs', () => {
  it('names the best pairs in the real table: 7 and 0, then 4 and 7, then 0 and 3', () => {
    expect(topDigitPairs(SQUARES_PROBABILITIES, 3)).toEqual([
      { away: 7, home: 0, share: 3.5 },
      { away: 4, home: 7, share: 2.9 },
      { away: 0, home: 3, share: 2.8 }
    ]);
  });

  it('counts both ways round as one pair, named the way that scored higher', () => {
    expect(topDigitPairs({ '0,7': 3.4, '7,0': 3.5, '1,1': 2 }, 2)).toEqual([
      { away: 7, home: 0, share: 3.5 },
      { away: 1, home: 1, share: 2 }
    ]);
  });

  it('keeps the table order on a tie', () => {
    expect(topDigitPairs({ '4,7': 2.9, '7,4': 2.9 }, 1)).toEqual([{ away: 4, home: 7, share: 2.9 }]);
  });
});

describe('bottomDigitPairs', () => {
  it('names the worst pairs in the real table: 2 and 2, then 5 and 5', () => {
    expect(bottomDigitPairs(SQUARES_PROBABILITIES, 2)).toEqual([
      { away: 2, home: 2, share: 0 },
      { away: 5, home: 5, share: 0.1 }
    ]);
  });

  it('ranks a pair by its more common way round', () => {
    expect(bottomDigitPairs({ '2,5': 0.0, '5,2': 0.4, '3,3': 0.2 }, 2)).toEqual([
      { away: 3, home: 3, share: 0.2 },
      { away: 5, home: 2, share: 0.4 }
    ]);
  });
});
