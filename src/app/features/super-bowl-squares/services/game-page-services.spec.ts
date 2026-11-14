import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EspnService } from '../../../core/services/espn.service';
import { GameService } from '../../../core/services/game.service';
import { PlanService } from '../../../core/services/plan.service';
import { ToastService } from '../../../core/services/toast.service';
import { EspnSyncService } from './espn-sync.service';
import { GamePageUiService } from './game-page-ui.service';
import { GamePlayersService } from './game-players.service';
import { GameScoringService } from './game-scoring.service';
import { GameStateService } from './game-state.service';
import { HostActionsService } from './host-actions.service';
import { NumberDrawService } from './number-draw.service';
import { PlayerNameService } from './player-name.service';
import { SquarePickerService } from './square-picker.service';

const HOME = [3, 7, 0, 9, 1, 5, 2, 8, 4, 6];
const AWAY = [6, 2, 9, 0, 4, 8, 1, 3, 7, 5];

describe('game page services', () => {
  let user: ReturnType<typeof signal<{ uid: string; displayName: string | null; isGuest: boolean; email: null; photoURL: null } | null>>;
  let updateGame: ReturnType<typeof vi.fn>;
  let getGame: ReturnType<typeof vi.fn>;
  let toast: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    user = signal({ uid: 'host-1', displayName: 'Paul', isGuest: false, email: null, photoURL: null });
    updateGame = vi.fn(() => Promise.resolve());
    getGame = vi.fn();
    toast = { error: vi.fn(), success: vi.fn(), warning: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        EspnSyncService, GamePageUiService, GamePlayersService, GameScoringService, GameStateService, HostActionsService,
        NumberDrawService, PlayerNameService, SquarePickerService,
        { provide: AuthService, useValue: { currentUser: user, previewRole: signal('actual'), isPreviewAdmin: signal(false) } },
        { provide: PlanService, useValue: { features: signal({ autoManage: true, activeBoards: 3, adFree: false, customSplits: true, squareLimit: true }), plan: signal('free') } },
        { provide: GameService, useValue: { updateGame, addJoinedGame: vi.fn() } },
        { provide: ToastService, useValue: toast },
        { provide: ConfirmService, useValue: { ask: () => Promise.resolve(true) } },
        { provide: EspnService, useValue: { getGame, isEventFinal: () => Promise.resolve(null) } }
      ]
    });
  });

  function hostedBoard(): GameStateService {
    const state = TestBed.inject(GameStateService);
    state.gameId = 'G1';
    state.ownerId.set('host-1');
    state.homeNumbers = HOME;
    state.awayNumbers = AWAY;
    state.isRandomized = true;
    return state;
  }

  describe('GameStateService', () => {
    it('knows the owner from the board and the signed-in user', () => {
      const state = hostedBoard();
      expect(state.isGameOwner()).toBe(true);
      expect(state.isHost()).toBe(true);
      user.set({ uid: 'someone', displayName: 'Kim', isGuest: false, email: null, photoURL: null });
      expect(state.isGameOwner()).toBe(false);
    });

    it('applies a snapshot in two halves, reporting a changed host note', () => {
      const state = TestBed.inject(GameStateService);
      const data = { name: '', ownerId: 'host-1', boardSize: 25, hostNote: 'Hi', managerId: 'co-1' } as never;
      state.applyCoreData(data);
      expect(state.gameName).toBe('Football Squares');
      expect(state.homeNumbers.length).toBe(5);
      expect(state.applyDetailData(data)).toBe(true);
      expect(state.applyDetailData(data)).toBe(false);
      expect(state.managerId()).toBe('co-1');
    });

    it('labels the winning squares once numbers are drawn', () => {
      const state = hostedBoard();
      state.selectedSquares = { '7-1': 'Tara' };
      state.scores.q1 = { home: 7, away: 3 };
      state.winners = { q1: 'Tara' };
      expect(state.winnerSquares).toEqual(['7-1']);
      expect(state.winnerQuarterLabels).toEqual({ '7-1': 'Q1' });
      expect(state.currentLeaderSquare).toBe('7-1');
    });

    it('counts finished quarters from the scores on an unlinked board', () => {
      const state = hostedBoard();
      state.scores.q2 = { home: 3, away: 0 };
      expect(state.completedQuarterCount()).toBe(2);
    });
  });

  describe('GameScoringService', () => {
    it('saves winners from hand-entered scores when the host enters them', () => {
      const state = hostedBoard();
      state.selectedSquares = { '7-1': 'Tara' };
      TestBed.inject(GameScoringService).onBoxScoreChange({ q1: { home: 7, away: 3 }, q2: { home: 0, away: 0 }, q3: { home: 0, away: 0 }, q4: { home: 0, away: 0 } });
      expect(state.winners).toEqual({ q1: 'Tara' });
      expect(updateGame).toHaveBeenCalledWith('G1', { winners: { q1: 'Tara' } });
    });

    it('writes ESPN winners only when they change', () => {
      const state = hostedBoard();
      state.selectedSquares = { '7-1': 'Tara' };
      state.scores.q1 = { home: 7, away: 3 };
      const scoring = TestBed.inject(GameScoringService);
      scoring.calculateWinnersFromEspn(2, false);
      scoring.calculateWinnersFromEspn(2, false);
      expect(updateGame).toHaveBeenCalledTimes(1);
    });
  });

  describe('SquarePickerService', () => {
    it('claims an open square for the player and records their account', async () => {
      const state = hostedBoard();
      state.currentPlayerName = 'Paul';
      await TestBed.inject(SquarePickerService).onSquareClick({ row: 0, col: 0 });
      expect(state.selectedSquares).toEqual({ '0-0': 'Paul' });
      expect(state.playerStats['Paul'].squares).toBe(1);
      expect(updateGame).toHaveBeenCalledWith('G1', { selectedSquares: { '0-0': 'Paul' }, playerUserIds: { Paul: 'host-1' } });
    });

    it('opens sign-in for a signed-out visitor and remembers the square', async () => {
      user.set(null);
      await TestBed.inject(SquarePickerService).onSquareClick({ row: 1, col: 2 });
      const ui = TestBed.inject(GamePageUiService);
      expect(ui.showAuthModal()).toBe(true);
      expect(ui.pendingSquare).toEqual({ row: 1, col: 2 });
    });

    it('rolls a claim back when the save fails', async () => {
      const state = hostedBoard();
      state.currentPlayerName = 'Paul';
      updateGame.mockReturnValueOnce(Promise.reject(new Error('denied')));
      await TestBed.inject(SquarePickerService).onSquareClick({ row: 0, col: 0 });
      expect(state.selectedSquares).toEqual({});
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('GamePlayersService', () => {
    it('takes a player off the board with everything tied to their name', async () => {
      const state = hostedBoard();
      state.selectedSquares = { '0-0': 'Kim', '0-1': 'Tara' };
      state.playerColors = { Kim: 'qs-p-sky', Tara: 'qs-p-rose' };
      state.paidPlayers = new Set(['Kim']);
      state.winners = { q1: 'Kim' };
      await TestBed.inject(GamePlayersService).onPlayerRemoved('Kim');
      expect(state.selectedSquares).toEqual({ '0-1': 'Tara' });
      expect(state.playerColors).toEqual({ Tara: 'qs-p-rose' });
      expect([...state.paidPlayers]).toEqual([]);
      expect(state.winners).toEqual({});
    });

    it('keeps a player and their quarter wins on a locked board', async () => {
      const state = hostedBoard();
      state.isLocked = true;
      state.selectedSquares = { '0-0': 'Kim', '0-1': 'Tara' };
      state.winners = { q1: 'Kim' };
      await TestBed.inject(GamePlayersService).onPlayerRemoved('Kim');
      expect(state.selectedSquares).toEqual({ '0-0': 'Kim', '0-1': 'Tara' });
      expect(state.winners).toEqual({ q1: 'Kim' });
      expect(updateGame).not.toHaveBeenCalled();
      expect(toast.warning).toHaveBeenCalled();
    });

    it('shows a confirmed player as Unconfirmed after they add a square', async () => {
      const state = hostedBoard();
      state.selectedSquares = { '0-0': 'Kim' };
      state.calculatePlayerStats();
      const players = TestBed.inject(GamePlayersService);
      players.onManagePayments();
      players.onPaidPlayersChange(['Kim']);
      expect(updateGame).toHaveBeenCalledWith('G1', { paidPlayers: ['Kim'], paidSquares: [1] });
      expect(state.confirmedPlayers.has('Kim')).toBe(true);
      state.selectedSquares = { '0-0': 'Kim', '0-1': 'Kim' };
      state.calculatePlayerStats();
      expect(state.confirmedPlayers.has('Kim')).toBe(false);
    });

    it('keeps a square added while Manage players is open unconfirmed when the host confirms someone else', () => {
      const state = hostedBoard();
      state.selectedSquares = { '0-0': 'Kim', '0-1': 'Tara' };
      state.calculatePlayerStats();
      const players = TestBed.inject(GamePlayersService);
      players.onManagePayments();
      players.onPaidPlayersChange(['Kim']);
      state.selectedSquares = { ...state.selectedSquares, '0-2': 'Kim' };
      state.calculatePlayerStats();
      players.onPaidPlayersChange(['Kim', 'Tara']);
      expect(state.paidSquares).toEqual([1, 1]);
      expect([...state.confirmedPlayers]).toEqual(['Tara']);
    });

    it('confirms only the squares Manage players showed, even if the player added more since', () => {
      const state = hostedBoard();
      state.selectedSquares = { '0-0': 'Kim' };
      state.calculatePlayerStats();
      const players = TestBed.inject(GamePlayersService);
      players.onManagePayments();
      state.selectedSquares = { '0-0': 'Kim', '0-1': 'Kim' };
      state.calculatePlayerStats();
      players.onPaidPlayersChange(['Kim']);
      expect(state.paidSquares).toEqual([1]);
      expect(state.confirmedPlayers.has('Kim')).toBe(false);
    });

    it('keeps a paid player who added squares on the paid list when the host confirms someone else', () => {
      const state = hostedBoard();
      state.selectedSquares = { '0-0': 'Ann', '0-1': 'Ann', '0-2': 'Bob' };
      state.paidPlayers = new Set(['Ann']);
      state.paidSquares = [1];
      state.calculatePlayerStats();
      const players = TestBed.inject(GamePlayersService);
      players.onManagePayments();
      players.onPaidPlayersChange(['Bob']);
      expect([...state.paidPlayers]).toEqual(['Ann', 'Bob']);
      expect(state.paidSquares).toEqual([1, 1]);
    });

    it('gives the host a count for players confirmed before counts were kept', () => {
      const state = hostedBoard();
      state.selectedSquares = { '0-0': 'Kim', '0-1': 'Kim' };
      state.paidPlayers = new Set(['Kim']);
      TestBed.inject(GamePlayersService).backfillPaidSquares();
      expect(updateGame).toHaveBeenCalledWith('G1', { paidSquares: [2] });
    });

    it('gives a new player the next free color', () => {
      const state = hostedBoard();
      state.selectedSquares = { '0-0': 'Kim' };
      TestBed.inject(GamePlayersService).assignMissingColors();
      expect(state.playerColors).toEqual({ Kim: 'qs-p-rose' });
    });
  });

  describe('HostActionsService', () => {
    it('locks and draws in one save', async () => {
      const state = hostedBoard();
      state.isRandomized = false;
      state.selectedSquares = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`${Math.floor(i / 10)}-${i % 10}`, 'Kim']));
      await TestBed.inject(HostActionsService).toggleLock();
      expect(state.isLocked).toBe(true);
      expect(state.isRandomized).toBe(true);
      expect(state.homeNumbers.slice().sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('suggests a smaller board when locking a mostly empty one', async () => {
      const state = hostedBoard();
      state.isRandomized = false;
      await TestBed.inject(HostActionsService).toggleLock();
      expect(TestBed.inject(GamePageUiService).showShrinkSuggestion()).toBe(true);
      expect(state.isLocked).toBe(false);
    });

    it('clears drawn numbers and their winners', async () => {
      const state = hostedBoard();
      state.winners = { q1: 'Kim' };
      await TestBed.inject(HostActionsService).randomizeNumbers();
      expect(state.isRandomized).toBe(false);
      expect(state.winners).toEqual({});
      expect(state.homeNumbers).toEqual(Array(10).fill(null));
    });
  });

  describe('EspnSyncService', () => {
    const feed = (status: string): never => ({ id: 'E1', status, period: 2, completed: false, homeScore: 7, awayScore: 3, quarters: [{ home: 7, away: 3 }] }) as never;

    afterEach(() => vi.useRealTimers());

    it('saves the host\'s cumulative scores and polls every 30 seconds while the game is on, until reset', async () => {
      vi.useFakeTimers();
      hostedBoard().espnEventId = 'E1';
      const espn = TestBed.inject(EspnSyncService);
      getGame.mockResolvedValue(feed('in'));
      await espn.syncFromEspn();
      expect(updateGame).toHaveBeenCalledWith('G1', { scores: expect.objectContaining({ q1: { home: 7, away: 3 } }) });
      await vi.advanceTimersByTimeAsync(30000);
      expect(getGame).toHaveBeenCalledTimes(2);
      espn.reset();
      await vi.advanceTimersByTimeAsync(30000);
      expect(getGame).toHaveBeenCalledTimes(2);
    });

    it('writes nothing for a viewer and stops polling once the game is over', async () => {
      vi.useFakeTimers();
      hostedBoard().espnEventId = 'E1';
      user.set({ uid: 'viewer', displayName: 'Kim', isGuest: false, email: null, photoURL: null });
      const espn = TestBed.inject(EspnSyncService);
      getGame.mockResolvedValue(feed('in'));
      await espn.syncFromEspn();
      getGame.mockResolvedValue(feed('post'));
      await vi.advanceTimersByTimeAsync(30000);
      await vi.advanceTimersByTimeAsync(30000);
      expect(getGame).toHaveBeenCalledTimes(2);
      expect(updateGame).not.toHaveBeenCalled();
    });
  });

  describe('PlayerNameService', () => {
    it('warns when another account holds the name, and forces a rename when it is their profile name', () => {
      const state = hostedBoard();
      state.selectedSquares = { '0-0': 'Paul' };
      state.playerUserIds = { Paul: 'someone-else' };
      const names = TestBed.inject(PlayerNameService);
      names.currentPlayer = 'Paul';
      expect(names.duplicateNameWarning()).toBe('"Paul" is already in use');
      expect(TestBed.inject(GamePageUiService).showForceNameChangeModal()).toBe(true);
      state.playerUserIds = { Paul: 'host-1' };
      names.checkDuplicateName();
      expect(names.duplicateNameWarning()).toBeNull();
    });
  });
});
