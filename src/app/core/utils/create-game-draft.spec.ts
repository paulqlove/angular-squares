import {
  CreateGameDraft, buildCreateGameValues, clearCreateDraft, emptyDraft, isPendingAutoSubmit, loadCreateDraft, saveCreateDraft, splitToTenths
} from './create-game-draft';

const sanitizer = {
  sanitizeGameName: (s: string) => s.trim().slice(0, 100),
  sanitizeHostNote: (s: string) => s.trim().slice(0, 140),
  sanitizeTeamName: (s: string) => s.trim().slice(0, 50),
  validatePrice: (p: number | string) => Number(p)
};

function fakeStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const data = new Map<string, string>();
  return {
    getItem: k => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: k => void data.delete(k)
  };
}

describe('create game draft', () => {
  it('round-trips through storage', () => {
    const store = fakeStorage();
    const draft: CreateGameDraft = { ...emptyDraft(), name: 'Office party', autoSubmit: true, boardSize: 50 };
    saveCreateDraft(draft, 1000, store);
    const back = loadCreateDraft(2000, store);
    expect(back?.name).toBe('Office party');
    expect(back?.autoSubmit).toBe(true);
    expect(back?.boardSize).toBe(50);
  });

  it('drops a draft older than two hours', () => {
    const store = fakeStorage();
    saveCreateDraft({ ...emptyDraft(), name: 'Old' }, 0, store);
    expect(loadCreateDraft(2 * 60 * 60 * 1000 + 1, store)).toBeNull();
    expect(loadCreateDraft(1, store)).toBeNull();
  });

  it('ignores junk and clears', () => {
    const store = fakeStorage();
    store.setItem('qs_create_draft', '{not json');
    expect(loadCreateDraft(1, store)).toBeNull();
    saveCreateDraft({ ...emptyDraft(), name: 'x' }, 1, store);
    clearCreateDraft(store);
    expect(loadCreateDraft(2, store)).toBeNull();
  });
});

describe('buildCreateGameValues', () => {
  it('needs a name', () => {
    expect(buildCreateGameValues({ ...emptyDraft(), name: '   ' }, sanitizer, true)).toEqual({ ok: false, reason: 'name' });
  });

  it('rejects a split that does not total 100', () => {
    const draft = { ...emptyDraft(), name: 'A', splitPct: { q1: 30, q2: 20, q3: 20, q4: 40 } };
    expect(buildCreateGameValues(draft, sanitizer, true)).toEqual({ ok: false, reason: 'split' });
  });

  it('uses the linked game and drops the default split', () => {
    const draft: CreateGameDraft = { ...emptyDraft(), name: ' Party ', espnGame: { id: '401', homeTeam: 'DAL', awayTeam: 'PHI' } };
    const result = buildCreateGameValues(draft, sanitizer, true);
    expect(result.ok && result.values).toMatchObject({ name: 'Party', espnEventId: '401', espnSport: 'nfl', homeTeam: 'DAL', awayTeam: 'PHI', quarterSplit: null });
  });

  it('keeps a custom split only when the plan allows it', () => {
    const draft = { ...emptyDraft(), name: 'A', splitPct: { q1: 10, q2: 10, q3: 10, q4: 70 } };
    const allowed = buildCreateGameValues(draft, sanitizer, true);
    const free = buildCreateGameValues(draft, sanitizer, false);
    expect(allowed.ok && allowed.values.quarterSplit).toEqual({ q1: 100, q2: 100, q3: 100, q4: 700 });
    expect(free.ok && free.values.quarterSplit).toBeNull();
  });

  it('custom sport uses typed team names and no ESPN link', () => {
    const draft = { ...emptyDraft(), name: 'A', sport: 'custom' as const, customHome: ' Lincoln ', customAway: 'Washington', espnGame: { id: '9', homeTeam: 'X', awayTeam: 'Y' } };
    const result = buildCreateGameValues(draft, sanitizer, false);
    expect(result.ok && result.values).toMatchObject({ homeTeam: 'Lincoln', awayTeam: 'Washington', espnEventId: undefined });
  });
});

describe('splitToTenths', () => {
  it('converts clean tenths and rejects finer values', () => {
    expect(splitToTenths({ q1: 20, q2: 20, q3: 20, q4: 40 })).toEqual({ q1: 200, q2: 200, q3: 200, q4: 400 });
    expect(splitToTenths({ q1: 20.05, q2: 20, q3: 20, q4: 40 })).toBeNull();
  });

  it('an auto-create is pending only while fresh', () => {
    const fresh = { ...emptyDraft(), autoSubmit: true, savedAt: 1_000_000 };
    expect(isPendingAutoSubmit(fresh, 1_000_000 + 60_000)).toBe(true);
    expect(isPendingAutoSubmit(fresh, 1_000_000 + 16 * 60_000)).toBe(false);
    expect(isPendingAutoSubmit({ ...fresh, autoSubmit: false }, 1_000_000 + 1000)).toBe(false);
    expect(isPendingAutoSubmit(null)).toBe(false);
  });

  it('carries the Show in my open boards choice, off by default', () => {
    const off = buildCreateGameValues({ ...emptyDraft(), name: 'Game' }, sanitizer, true);
    const on = buildCreateGameValues({ ...emptyDraft(), name: 'Game', showInOpenBoards: true }, sanitizer, true);
    expect(off.ok && off.values.showInOpenBoards).toBe(false);
    expect(on.ok && on.values.showInOpenBoards).toBe(true);
  });

  it('carries Auto-manage only for a linked game', () => {
    const game = { id: '401', homeTeam: 'KC', awayTeam: 'SF' };
    const linked = buildCreateGameValues({ ...emptyDraft(), name: 'Game', espnGame: game, autoManage: true }, sanitizer, true);
    expect(linked.ok && linked.values.autoManage).toBe(true);
    const timed = buildCreateGameValues({ ...emptyDraft(), name: 'Game', espnGame: { ...game, kickoffAt: 123 }, autoManage: true }, sanitizer, true);
    expect(timed.ok && timed.values.kickoffAt).toBe(123);
    const custom = buildCreateGameValues({ ...emptyDraft(), name: 'Game', sport: 'custom', autoManage: true }, sanitizer, true);
    expect(custom.ok && custom.values.autoManage).toBe(false);
  });

  it('carries the squares limit only when allowed, clamped to 1 to 25', () => {
    const on = buildCreateGameValues({ ...emptyDraft(), name: 'Game', maxSquaresPerPlayer: 5 }, sanitizer, true, true);
    expect(on.ok && on.values.maxSquaresPerPlayer).toBe(5);
    const high = buildCreateGameValues({ ...emptyDraft(), name: 'Game', maxSquaresPerPlayer: 99 }, sanitizer, true, true);
    expect(high.ok && high.values.maxSquaresPerPlayer).toBe(25);
    const none = buildCreateGameValues({ ...emptyDraft(), name: 'Game' }, sanitizer, true, true);
    expect(none.ok && none.values.maxSquaresPerPlayer).toBeNull();
    const free = buildCreateGameValues({ ...emptyDraft(), name: 'Game', maxSquaresPerPlayer: 5 }, sanitizer, true, false);
    expect(free.ok && free.values.maxSquaresPerPlayer).toBeNull();
  });
});
