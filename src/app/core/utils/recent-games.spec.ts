import {
  RECENT_GAMES_KEPT,
  RECENT_GAMES_KEY,
  forgetRecentVisit,
  pickYourGameIds,
  readRecentVisits,
  recordRecentVisit,
  toYourGameRow
} from './recent-games';

function memoryStorage(initial?: string): Pick<Storage, 'getItem' | 'setItem'> & { value: string | null } {
  const store = { value: initial ?? null } as Pick<Storage, 'getItem' | 'setItem'> & { value: string | null };
  store.getItem = () => store.value;
  store.setItem = (_key: string, v: string) => { store.value = v; };
  return store;
}

describe('recent games', () => {
  it('records visits newest first, once per game', () => {
    const storage = memoryStorage();
    recordRecentVisit('AAA111', 1, storage);
    recordRecentVisit('BBB222', 2, storage);
    recordRecentVisit('AAA111', 3, storage);
    expect(readRecentVisits(storage)).toEqual([{ id: 'AAA111', at: 3 }, { id: 'BBB222', at: 2 }]);
  });

  it('keeps only the newest visits', () => {
    const storage = memoryStorage();
    for (let i = 0; i < RECENT_GAMES_KEPT + 5; i++) recordRecentVisit(`G${i}`, i, storage);
    const visits = readRecentVisits(storage);
    expect(visits.length).toBe(RECENT_GAMES_KEPT);
    expect(visits[0].id).toBe(`G${RECENT_GAMES_KEPT + 4}`);
  });

  it('reads nothing from storage that is broken or tampered with', () => {
    expect(readRecentVisits(memoryStorage('not json'))).toEqual([]);
    expect(readRecentVisits(memoryStorage('{"id":"A"}'))).toEqual([]);
    expect(readRecentVisits(memoryStorage(JSON.stringify([{ id: '../x', at: 1 }, { id: 'OK1', at: 'soon' }, { id: 'OK2', at: 2 }]))))
      .toEqual([{ id: 'OK2', at: 2 }]);
    expect(readRecentVisits(null)).toEqual([]);
  });

  it('forgets a deleted game', () => {
    const storage = memoryStorage();
    recordRecentVisit('AAA111', 1, storage);
    recordRecentVisit('BBB222', 2, storage);
    forgetRecentVisit('AAA111', storage);
    expect(readRecentVisits(storage).map(v => v.id)).toEqual(['BBB222']);
  });

  it('survives storage that refuses writes', () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('full'); } };
    expect(() => recordRecentVisit('AAA111', 1, storage)).not.toThrow();
  });

  it('uses the shared key', () => {
    const storage = memoryStorage();
    const setItem = vi.spyOn(storage, 'setItem');
    recordRecentVisit('AAA111', 1, storage);
    expect(setItem).toHaveBeenCalledWith(RECENT_GAMES_KEY, expect.any(String));
  });
});

describe('pickYourGameIds', () => {
  it('leads with the game on screen, then the rest by latest touch', () => {
    const visits = [{ id: 'B', at: 50 }, { id: 'C', at: 10 }];
    const index = [{ id: 'C', at: 90 }, { id: 'D', at: 70 }, { id: 'CUR', at: 1 }];
    expect(pickYourGameIds(visits, index, 'CUR', 5)).toEqual(['CUR', 'C', 'D', 'B']);
  });

  it('stops at the limit', () => {
    const index = ['A', 'B', 'C', 'D', 'E', 'F'].map((id, i) => ({ id, at: i }));
    expect(pickYourGameIds([], index, 'A', 3)).toEqual(['A', 'F', 'E']);
  });

  it('works with no game on screen', () => {
    expect(pickYourGameIds([{ id: 'A', at: 1 }], [], null, 5)).toEqual(['A']);
  });
});

describe('toYourGameRow', () => {
  const base = {
    id: 'G1', name: 'Sunday Squares', ownerId: 'host', managerId: undefined, homeTeam: 'Eagles', awayTeam: 'Cowboys',
    boardSize: 100 as const, isLocked: false, selectedSquares: { '0-0': 'Ann', '0-1': 'Bo' }
  };

  it('shows a filling board with its open squares', () => {
    expect(toYourGameRow(base, 'player')).toEqual({
      boardSize: 100, host: false, id: 'G1', matchup: 'Cowboys vs Eagles', name: 'Sunday Squares', openCount: 98, squaresFilled: 2, state: 'filling'
    });
  });

  it('tags games the person hosts or co-hosts', () => {
    expect(toYourGameRow(base, 'host').host).toBe(true);
    expect(toYourGameRow({ ...base, managerId: 'cohost' }, 'cohost').host).toBe(true);
    expect(toYourGameRow(base, null).host).toBe(false);
  });

  it('marks a full board ready to lock and a locked board locked', () => {
    const full = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`${Math.floor(i / 5)}-${i % 5}`, 'Ann']));
    expect(toYourGameRow({ ...base, boardSize: 25, selectedSquares: full }, null).state).toBe('ready');
    expect(toYourGameRow({ ...base, isLocked: true }, null).state).toBe('locked');
  });

  it('says so when the teams are not set', () => {
    expect(toYourGameRow({ ...base, homeTeam: '', awayTeam: '' }, null).matchup).toBe('Teams not set');
  });
});
