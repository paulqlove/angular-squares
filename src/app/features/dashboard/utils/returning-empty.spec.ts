import { EmptyDashboardFacts, isFirstEmpty, isPassEmpty, isReturningEmpty } from './returning-empty';

describe('isReturningEmpty', () => {
  const returning: EmptyDashboardFacts = { boards: 0, cap: 3, canHost: true, loading: false, used: 1 };

  it('is true for a free host with no boards who has used a game this season', () => {
    expect(isReturningEmpty(returning, true)).toBe(true);
  });

  it('is true when every free game is used', () => {
    expect(isReturningEmpty({ ...returning, used: 3 }, true)).toBe(true);
  });

  it('is false for a first-time host with nothing counted', () => {
    expect(isReturningEmpty({ ...returning, used: 0 }, true)).toBe(false);
  });

  it('is false until the season count is read, or when the read failed', () => {
    expect(isReturningEmpty({ ...returning, used: null }, true)).toBe(false);
  });

  it('is false once the host has a board', () => {
    expect(isReturningEmpty({ ...returning, boards: 1 }, true)).toBe(false);
  });

  it('is false while the boards load', () => {
    expect(isReturningEmpty({ ...returning, loading: true }, true)).toBe(false);
  });

  it('is false for Season Pass and Admin hosts, who have no season cap', () => {
    expect(isReturningEmpty({ ...returning, cap: Number.POSITIVE_INFINITY }, true)).toBe(false);
  });

  it('is false for a guest', () => {
    expect(isReturningEmpty({ ...returning, canHost: false }, true)).toBe(false);
  });

  it('is false while the season cap is switched off', () => {
    expect(isReturningEmpty(returning, false)).toBe(false);
  });
});

describe('isFirstEmpty', () => {
  const first: EmptyDashboardFacts = { boards: 0, cap: 3, canHost: true, loading: false, used: 0 };

  it('is true for a free host with no boards and nothing counted this season', () => {
    expect(isFirstEmpty(first, true)).toBe(true);
  });

  it('is false once a game has counted this season', () => {
    expect(isFirstEmpty({ ...first, used: 1 }, true)).toBe(false);
  });

  it('is false until the season count is read, or when the read failed', () => {
    expect(isFirstEmpty({ ...first, used: null }, true)).toBe(false);
  });

  it('is false once the host has a board', () => {
    expect(isFirstEmpty({ ...first, boards: 1 }, true)).toBe(false);
  });

  it('is false while the boards load', () => {
    expect(isFirstEmpty({ ...first, loading: true }, true)).toBe(false);
  });

  it('is false for Season Pass and Admin hosts, who have no season cap', () => {
    expect(isFirstEmpty({ ...first, cap: Number.POSITIVE_INFINITY }, true)).toBe(false);
  });

  it('is false for a guest', () => {
    expect(isFirstEmpty({ ...first, canHost: false }, true)).toBe(false);
  });

  it('is false while the season cap is switched off', () => {
    expect(isFirstEmpty(first, false)).toBe(false);
  });

  it('never agrees with isReturningEmpty', () => {
    for (const used of [null, 0, 1, 3]) {
      expect(isFirstEmpty({ ...first, used }, true) && isReturningEmpty({ ...first, used }, true)).toBe(false);
    }
  });
});

describe('isPassEmpty', () => {
  const empty: EmptyDashboardFacts = { boards: 0, cap: Infinity, canHost: true, loading: false, used: null };

  it('is true for a Season Pass host with no boards', () => {
    expect(isPassEmpty(empty, 'season')).toBe(true);
  });

  it('is false on Free and Admin, which keep their own screens', () => {
    expect(isPassEmpty(empty, 'free')).toBe(false);
    expect(isPassEmpty(empty, 'admin')).toBe(false);
  });

  it('is false once there is a board, while the boards load, and for a guest', () => {
    expect(isPassEmpty({ ...empty, boards: 1 }, 'season')).toBe(false);
    expect(isPassEmpty({ ...empty, loading: true }, 'season')).toBe(false);
    expect(isPassEmpty({ ...empty, canHost: false }, 'season')).toBe(false);
  });
});
