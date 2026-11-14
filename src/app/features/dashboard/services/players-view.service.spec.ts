import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GameData, GameService } from '../../../core/services/game.service';
import { PlanService } from '../../../core/services/plan.service';
import { ToastService } from '../../../core/services/toast.service';
import { DashboardStore } from './dashboard.store';
import { PlayersViewService } from './players-view.service';

function board(id: string, createdAt: number, extra: Partial<GameData> = {}): GameData {
  return {
    id, name: `Game ${id}`, ownerId: 'host-1', ownerName: 'Paul', createdAt, pricePerSquare: 5, isLocked: false, isRandomized: false,
    homeTeam: '', awayTeam: '', homeNumbers: [], awayNumbers: [], scores: {} as GameData['scores'],
    selectedSquares: { '0-0': 'Dana', '0-1': 'Dana' }, playerUserIds: { Dana: 'dana-uid' }, ...extra
  };
}

describe('PlayersViewService', () => {
  let runBoards: ReturnType<typeof signal<GameData[]>>;
  let updateGames: ReturnType<typeof vi.fn>;
  let features: ReturnType<typeof signal<{ playersView: boolean }>>;
  let toast: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    runBoards = signal([board('B', 2), board('A', 1)]);
    updateGames = vi.fn(() => Promise.resolve());
    features = signal({ playersView: true });
    toast = { error: vi.fn(), success: vi.fn(), warning: vi.fn() };
    const setRunBoard = (next: GameData) => runBoards.update(boards => boards.map(b => b.id === next.id ? next : b));
    TestBed.configureTestingModule({
      providers: [
        PlayersViewService,
        { provide: DashboardStore, useValue: { runBoards, setRunBoard } },
        { provide: GameService, useValue: { updateGames } },
        { provide: PlanService, useValue: { features } },
        { provide: ToastService, useValue: toast }
      ]
    });
  });

  it('shows only to Season Pass hosts with two or more boards', () => {
    const view = TestBed.inject(PlayersViewService);
    expect(view.available()).toBe(true);
    features.set({ playersView: false });
    expect(view.available()).toBe(false);
    features.set({ playersView: true });
    runBoards.set([board('A', 1)]);
    expect(view.available()).toBe(false);
  });

  it('shows the Players view only once the host switches to it', () => {
    const view = TestBed.inject(PlayersViewService);
    expect(view.active()).toBe(false);
    view.mode.set('players');
    expect(view.active()).toBe(true);
    features.set({ playersView: false });
    expect(view.active()).toBe(false);
  });

  it('opens the phone filter sheet, keyboard up only from Find a player, and Clear empties both filters', () => {
    const view = TestBed.inject(PlayersViewService);
    view.openFilter(true);
    expect([view.filterOpen(), view.filterFocusSearch()]).toEqual([true, true]);
    view.openFilter(false);
    expect(view.filterFocusSearch()).toBe(false);
    view.search.set('da');
    view.gameFilter.set('A');
    view.clearFilters();
    expect([view.search(), view.gameFilter()]).toEqual(['', null]);
  });

  it('puts the boards in season order', () => {
    expect(TestBed.inject(PlayersViewService).boards().map(b => b.id)).toEqual(['A', 'B']);
  });

  it('confirms the rest of a player in one save and offers Undo', async () => {
    const view = TestBed.inject(PlayersViewService);
    await view.confirmRest(view.players()[0]);
    expect(updateGames).toHaveBeenCalledTimes(1);
    expect(updateGames.mock.calls[0][0]).toEqual([
      { gameId: 'A', data: { paidPlayers: ['Dana'], paidSquares: [2] } },
      { gameId: 'B', data: { paidPlayers: ['Dana'], paidSquares: [2] } }
    ]);
    expect(view.players()[0].confirmed).toBe(true);
    expect(view.confirmNote()?.text).toBe('Dana confirmed on every game.');

    await view.undoConfirm();
    expect(updateGames.mock.calls[1][0]).toEqual([
      { gameId: 'A', data: { paidPlayers: [], paidSquares: [] } },
      { gameId: 'B', data: { paidPlayers: [], paidSquares: [] } }
    ]);
    expect(view.unconfirmed().length).toBe(1);
  });

  it('shows All confirmed for a beat when the last game is confirmed, then moves the card to Confirmed', async () => {
    vi.useFakeTimers();
    try {
      const view = TestBed.inject(PlayersViewService);
      view.toggleOpen('dana-uid');
      await view.confirmRest(view.players()[0]);
      expect(view.openKey()).toBeNull();
      expect(view.unconfirmed().map(p => p.key)).toEqual(['dana-uid']);
      expect(view.allConfirmed()).toEqual({ key: 'dana-uid', leaving: false });
      expect(view.announcement()).toBe('Dana, all games confirmed');

      vi.advanceTimersByTime(900);
      expect(view.allConfirmed()).toEqual({ key: 'dana-uid', leaving: true });
      expect(view.unconfirmed().length).toBe(1);

      vi.advanceTimersByTime(200);
      expect(view.allConfirmed()).toBeNull();
      expect(view.unconfirmed().length).toBe(0);
      expect(view.confirmed().map(p => p.key)).toEqual(['dana-uid']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops the beat and keeps the card in place when the host opens it during the hold', async () => {
    vi.useFakeTimers();
    try {
      const view = TestBed.inject(PlayersViewService);
      await view.confirmRest(view.players()[0]);
      view.toggleOpen('dana-uid');
      expect(view.allConfirmed()).toBeNull();
      vi.advanceTimersByTime(2000);
      expect(view.unconfirmed().map(p => p.key)).toEqual(['dana-uid']);

      view.toggleOpen('dana-uid');
      expect(view.confirmed().map(p => p.key)).toEqual(['dana-uid']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps an open card in its group until it closes', async () => {
    runBoards.update(boards => boards.map(b => ({ ...b, paidPlayers: ['Dana'], paidSquares: [2] })));
    const view = TestBed.inject(PlayersViewService);
    view.toggleOpen('dana-uid');
    await view.toggleGame(view.players()[0], 'A');
    expect(view.players()[0].confirmed).toBe(false);
    expect(view.confirmed().map(p => p.key)).toEqual(['dana-uid']);

    view.toggleOpen('dana-uid');
    expect(view.unconfirmed().map(p => p.key)).toEqual(['dana-uid']);
  });

  it('toggles one game on with no Undo note, then back to how it stood', async () => {
    runBoards.update(boards => boards.map(b => b.id === 'A' ? { ...b, paidPlayers: ['Dana'], paidSquares: [1] } : b));
    const view = TestBed.inject(PlayersViewService);
    const game = () => view.players()[0].games.find(g => g.gameId === 'A');
    expect(game()?.newSquares).toBe(1);

    await view.toggleGame(view.players()[0], 'A');
    expect(updateGames.mock.calls[0][0]).toEqual([{ gameId: 'A', data: { paidPlayers: ['Dana'], paidSquares: [2] } }]);
    expect(game()?.confirmed).toBe(true);
    expect(view.confirmNote()).toBeNull();

    await view.toggleGame(view.players()[0], 'A');
    expect(updateGames.mock.calls[1][0]).toEqual([{ gameId: 'A', data: { paidPlayers: ['Dana'], paidSquares: [1] } }]);
    expect(game()?.newSquares).toBe(1);

    await view.toggleGame(view.players()[0], 'B');
    await view.toggleGame(view.players()[0], 'B');
    expect(updateGames.mock.calls[3][0]).toEqual([{ gameId: 'B', data: { paidPlayers: [], paidSquares: [] } }]);
  });

  it('puts the boards back and says so when a save fails', async () => {
    updateGames.mockReturnValueOnce(Promise.reject(new Error('denied')));
    const view = TestBed.inject(PlayersViewService);
    await view.confirmGame(view.players()[0], 'A');
    expect(view.unconfirmed().length).toBe(1);
    expect(view.confirmNote()).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Could not confirm Dana. Try again.');
  });

  it('removes a player from open games and skips locked ones', async () => {
    runBoards.update(boards => boards.map(b => b.id === 'B' ? { ...b, isLocked: true } : b));
    const view = TestBed.inject(PlayersViewService);
    await view.removeFromGames(view.players()[0], ['A', 'B']);
    expect(updateGames.mock.calls[0][0].map((change: { gameId: string }) => change.gameId)).toEqual(['A']);
    expect(toast.warning).toHaveBeenCalled();
    expect(view.players()[0].games.map(game => game.gameId)).toEqual(['B']);
  });

  it('finds a player by any name they use', () => {
    const view = TestBed.inject(PlayersViewService);
    view.search.set('dan');
    expect(view.players().length).toBe(1);
    view.search.set('kim');
    expect(view.players().length).toBe(0);
  });

  it('shows only the picked game', () => {
    runBoards.update(boards => boards.map(b => b.id === 'B' ? { ...b, selectedSquares: { '0-0': 'Kim' }, playerUserIds: { Kim: 'kim-uid' } } : b));
    const view = TestBed.inject(PlayersViewService);
    view.gameFilter.set('B');
    expect(view.players().map(player => player.name)).toEqual(['Kim']);
    expect(view.shownBoards().map(b => b.id)).toEqual(['B']);
  });
});
