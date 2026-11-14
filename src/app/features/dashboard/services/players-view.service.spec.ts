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
    expect(view.confirmed().length).toBe(1);
    expect(view.confirmNote()?.text).toBe('Dana confirmed on every game.');

    await view.undoConfirm();
    expect(updateGames.mock.calls[1][0]).toEqual([
      { gameId: 'A', data: { paidPlayers: [], paidSquares: [] } },
      { gameId: 'B', data: { paidPlayers: [], paidSquares: [] } }
    ]);
    expect(view.unconfirmed().length).toBe(1);
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
  });
});
