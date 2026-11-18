import { BINGO_FREE, BINGO_ITEMS, PROP_QUESTIONS, bingoCard } from './party-games';

describe('bingoCard', () => {
  it('has 25 cells with the free square in the middle', () => {
    const card = bingoCard(1);
    expect(card.length).toBe(25);
    expect(card[12]).toBe(BINGO_FREE);
  });

  it('uses 24 different commercial items', () => {
    const items = bingoCard(42).filter(cell => cell !== BINGO_FREE);
    expect(items.length).toBe(24);
    expect(new Set(items).size).toBe(24);
    expect(items.every(item => BINGO_ITEMS.includes(item))).toBe(true);
  });

  it('draws the same card for the same seed, so the server and browser match', () => {
    expect(bingoCard(2027)).toEqual(bingoCard(2027));
  });

  it('draws different cards for different seeds', () => {
    expect(bingoCard(1)).not.toEqual(bingoCard(2));
  });
});

describe('PROP_QUESTIONS', () => {
  it('has 15 questions, each with at least two answers', () => {
    expect(PROP_QUESTIONS.length).toBe(15);
    expect(PROP_QUESTIONS.every(q => q.options.length >= 2)).toBe(true);
  });
});

describe('BINGO_ITEMS', () => {
  it('has no repeats and enough for a card', () => {
    expect(new Set(BINGO_ITEMS).size).toBe(BINGO_ITEMS.length);
    expect(BINGO_ITEMS.length).toBeGreaterThanOrEqual(24);
  });
});
