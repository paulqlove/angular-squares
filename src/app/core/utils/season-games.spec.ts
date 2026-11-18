import { PLANS } from '../plans';
import {
  SEASON_LIMIT_ON,
  SeasonGame,
  clearCountNote,
  clearGameStep,
  deleteCountNote,
  gameCounts,
  gamesLeft,
  gamesUsed,
  isCounted,
  seasonGameKey,
  seasonGamePath,
  seasonLimitApplies,
  seasonOf
} from './season-games';

describe('season games', () => {
  const now = Date.UTC(2026, 10, 15, 18, 0, 0);
  const game = (extra: Partial<SeasonGame> = {}): SeasonGame => ({ id: 'ABCDEF', createdAt: Date.UTC(2026, 10, 1), squaresFilled: 3, ...extra });

  it('ships switched on, with 3 games for free hosts and no cap on paid plans', () => {
    expect(SEASON_LIMIT_ON).toBe(true);
    expect(PLANS.free.seasonGames).toBe(3);
    expect(PLANS.season.seasonGames).toBe(Number.POSITIVE_INFINITY);
    expect(PLANS.admin.seasonGames).toBe(Number.POSITIVE_INFINITY);
  });

  it('counts a game once one square is claimed', () => {
    expect(gameCounts(0)).toBe(false);
    expect(gameCounts(1)).toBe(true);
  });

  it('runs a season from July 1 to June 30, named by the year it starts', () => {
    expect(seasonOf(Date.UTC(2026, 6, 1))).toBe('2026');
    expect(seasonOf(Date.UTC(2027, 1, 14))).toBe('2026');
    expect(seasonOf(Date.UTC(2027, 5, 30, 23, 59))).toBe('2026');
    expect(seasonOf(Date.UTC(2027, 6, 1))).toBe('2027');
    expect(seasonOf(Date.UTC(2026, 5, 30))).toBe('2025');
  });

  it('keys a game by its board and when it started, so a reset is a new game', () => {
    expect(seasonGameKey(game())).toBe(`ABCDEF_${Date.UTC(2026, 10, 1)}`);
    expect(seasonGameKey(game({ startedAt: 1_800_000_000_000 }))).toBe('ABCDEF_1800000000000');
  });

  it('never counts a board with no start time, so its delete or reset still works', () => {
    expect(isCounted(game({ createdAt: 0 }))).toBe(false);
    expect(seasonGamePath('owner1', game({ createdAt: 0 }))).toBeNull();
    expect(gamesUsed([], [game({ createdAt: 0 })], now)).toBe(0);
  });

  it('gives a path only for a game with players, in the season it started', () => {
    expect(seasonGamePath('host1', game())).toBe(`seasonGames/host1/2026/ABCDEF_${Date.UTC(2026, 10, 1)}`);
    expect(seasonGamePath('host1', game({ squaresFilled: 0 }))).toBeNull();
  });

  it('adds boards with players to the saved games without counting one twice', () => {
    const saved = [seasonGameKey(game()), 'OLD123_1700000000000'];
    expect(gamesUsed(saved, [game()], now)).toBe(2);
    expect(gamesUsed(saved, [game({ id: 'NEW456' })], now)).toBe(3);
  });

  it('leaves out empty boards and boards from an earlier season', () => {
    expect(gamesUsed([], [game({ squaresFilled: 0 })], now)).toBe(0);
    expect(gamesUsed([], [game({ createdAt: Date.UTC(2026, 2, 1) })], now)).toBe(0);
    expect(gamesUsed([], [game({ createdAt: Date.UTC(2026, 2, 1), startedAt: Date.UTC(2026, 8, 1) })], now)).toBe(1);
  });

  it('never shows fewer than 0 games left', () => {
    expect(gamesLeft(3, 1)).toBe(2);
    expect(gamesLeft(3, 5)).toBe(0);
  });

  it('applies only while switched on and the cap is finite', () => {
    expect(seasonLimitApplies(3, true)).toBe(true);
    expect(seasonLimitApplies(3, false)).toBe(false);
    expect(seasonLimitApplies(Number.POSITIVE_INFINITY, true)).toBe(false);
  });

  it('warns on delete only for a game with players this season', () => {
    expect(deleteCountNote(game(), 3, now, true)).toBe('This game has players, so it still counts as 1 of your 3 free games this season.');
    expect(deleteCountNote(game({ squaresFilled: 0 }), 3, now, true)).toBe('');
    expect(deleteCountNote(game(), 3, now, false)).toBe('');
    expect(deleteCountNote(game(), Number.POSITIVE_INFINITY, now, true)).toBe('');
    expect(deleteCountNote(game({ createdAt: Date.UTC(2026, 2, 1) }), 3, now, true)).toBe('');
  });

  it('clears an empty board as before, whatever is left', () => {
    expect(clearGameStep(0, 0)).toBe('clear');
    expect(clearGameStep(0, 2)).toBe('clear');
  });

  it('clears as before while the cap is off or the plan has none', () => {
    expect(clearGameStep(5, null)).toBe('clear');
  });

  it('adds the line under the cap and stops the clear at it, for a board with players', () => {
    expect(clearGameStep(1, 2)).toBe('note');
    expect(clearGameStep(1, 0)).toBe('blocked');
  });

  it('words the clear line with the games left', () => {
    expect(clearCountNote(2, 3)).toBe('Once someone claims a square, this counts as a new game. You have 2 of 3 free games left this season.');
  });
});
