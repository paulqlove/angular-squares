import { gameCodeFrom } from './dashboard.component';

describe('gameCodeFrom', () => {
  it('reads six letters or digits as a code, upper-cased', () => {
    expect(gameCodeFrom('k7p2qx')).toBe('K7P2QX');
    expect(gameCodeFrom('  K7P2QX ')).toBe('K7P2QX');
  });

  it('reads a pasted code with a dash or a space', () => {
    expect(gameCodeFrom('abc-123')).toBe('ABC123');
    expect(gameCodeFrom('ABC 123')).toBe('ABC123');
    expect(gameCodeFrom('ABC-1234')).toBeNull();
  });

  it('leaves anything else as plain search text', () => {
    expect(gameCodeFrom('K7P2Q')).toBeNull();
    expect(gameCodeFrom('K7P2QXX')).toBeNull();
    expect(gameCodeFrom('Bills')).toBeNull();
    expect(gameCodeFrom('Office')).toBe('OFFICE');
    expect(gameCodeFrom('K7 2QX')).toBeNull();
    expect(gameCodeFrom('')).toBeNull();
  });
});
