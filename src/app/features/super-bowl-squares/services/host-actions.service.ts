import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { BoardSize, GameData, GameService, getBoardDimensions } from '../../../core/services/game.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { PlanService } from '../../../core/services/plan.service';
import { SanitizationService } from '../../../core/services/sanitization.service';
import { SeasonGamesService } from '../../../core/services/season-games.service';
import { ToastService } from '../../../core/services/toast.service';
import { splitFractions } from '../../../core/plans';
import { drawBoardNumbers } from '../../../core/utils/draw-numbers';
import { clearCountNote, clearGameStep } from '../../../core/utils/season-games';
import type { EditGameValues } from '../components/edit-game-dialog/edit-game-dialog.component';
import { emptyScores } from '../utils/board-math';
import { hostNextStep } from '../utils/host-next-step';
import { GamePageCoHostService } from './game-page-cohost.service';
import { GamePageGroupsService } from './game-page-groups.service';
import { GamePageUiService } from './game-page-ui.service';
import { GameStateService } from './game-state.service';
import { NumberDrawService } from './number-draw.service';

/** The host's game-day steps: lock and draw, clear or redraw the numbers, edit the game, and clear it. */
@Injectable()
export class HostActionsService {
  constructor() {
    // Opening Edit game reads the season count, so Clear game's extra line and block are ready.
    effect(() => {
      if (this.ui.showSettings()) untracked(() => void (this.seasonLoad = this.refreshSeasonGamesLeft()));
    });
  }

  // Public properties

  /** Free games the owner has left this season, read when Edit game opens. Null while the season cap is off or doesn't apply. */
  public readonly seasonGamesLeft = signal<number | null>(null);
  /** The season dialog, for a Clear game the cap stopped. */
  public readonly showSeasonLimit = signal(false);
  /** What Clear game does for this board right now: clear, clear with a line, or open the season dialog. */
  public readonly clearStep = computed(() => clearGameStep(this.state.squaresPicked(), this.seasonGamesLeft()));
  /** The extra clear line for a host under the cap, else ''. */
  public readonly clearNote = computed(() => this.clearStep() === 'note' ? clearCountNote(this.seasonGamesLeft() ?? 0) : '');

  // Public functions

  /** Locking a half-empty board: convert to the chosen smaller size, then lock. */
  public async convertAndLock(size: BoardSize): Promise<void> {
    this.ui.showShrinkSuggestion.set(false);
    try {
      await this.gameService.resizeBoard(this.state.gameId, size);
    } catch {
      this.toastService.error('Could not convert the board. Try again.');
      return;
    }
    await this.setLocked(true, size);
  }

  public async lockAsIs(): Promise<void> {
    this.ui.showShrinkSuggestion.set(false);
    await this.setLocked(true);
  }

  /**
   * Owner only: wipes squares, numbers, scores and settings back to a new board's.
   * A free host at the season cap whose board has players gets the season dialog instead, and nothing changes.
   */
  public async onClearGame(confirmed: boolean = false): Promise<void> {
    if (!this.state.isGameOwner()) return;
    // Reuse the count read when Edit game opened, so a clear doesn't read every board again.
    await (this.seasonLoad ?? this.refreshSeasonGamesLeft());
    if (this.clearStep() === 'blocked') {
      this.showSeasonLimit.set(true);
      return;
    }

    if (!confirmed && !await this.confirmService.ask({ title: 'Clear all game data?', message: 'Squares, numbers and scores are removed. This cannot be undone.', confirmLabel: 'Clear game data' })) {
      return;
    }

    await this.seasonGames.recordBoard(this.state.gameId);
    await this.gameService.updateGame(this.state.gameId, this.clearedGame());
  }

  /** Saves the Edit game popup in one write, then the settings that have their own calls. */
  public async onEditGameSaved(values: EditGameValues): Promise<void> {
    const state = this.state;
    if (!state.isGameOwner()) return;
    const homeTeam = this.sanitizationService.sanitizeTeamName(values.homeTeam);
    const awayTeam = this.sanitizationService.sanitizeTeamName(values.awayTeam);
    const hostNote = this.sanitizationService.sanitizeHostNote(values.hostNote);
    const price = state.isLocked ? state.currentPrice : this.sanitizationService.validatePrice(values.pricePerSquare);
    const canSplit = this.planService.features().customSplits && !state.isRandomized;
    const split = canSplit ? values.quarterSplit : state.quarterSplit;
    try {
      if (values.newBoardSize) await this.gameService.resizeBoard(state.gameId, values.newBoardSize);
      await this.gameService.updateGame(state.gameId, {
        homeTeam, awayTeam, hostNote, pricePerSquare: price,
        emptyQuarterRule: values.emptyQuarterRule,
        ...(canSplit ? { quarterSplit: split } : {})
      });
      state.emptyQuarterRule = values.emptyQuarterRule;
      state.quarterSplit = split;
      state.quarterPayouts = splitFractions(split);
      state.homeTeam = homeTeam;
      state.awayTeam = awayTeam;
      if (hostNote !== state.hostNote) {
        state.hostNote = hostNote;
        this.ui.resetHostNote();
      }
      state.currentPrice = price;
      state.calculatePlayerStats();
      if (!await this.saveSeparateSettings(values)) return;
      this.toastService.success('Game saved');
    } catch {
      this.toastService.error('Could not save the game. Try again.');
    }
  }

  /** Draws the numbers on a locked board, or clears drawn ones. */
  public async randomizeNumbers(): Promise<void> {
    const state = this.state;
    if (!state.isRandomized && !state.isLocked) {
      this.toastService.warning('Lock the board before drawing numbers.');
      return;
    }
    void this.stopAutoManage();

    if (state.isRandomized) {
      await this.clearNumbers();
      return;
    }

    const { homeNumbers, awayNumbers } = drawBoardNumbers(state.boardSize);
    state.homeNumbers = homeNumbers;
    state.awayNumbers = awayNumbers;
    state.isRandomized = true;

    // Clear the seen flag so animation plays
    this.draw.clearNumbersSeenFlag();

    await this.gameService.updateGame(state.gameId, {
      homeNumbers: state.homeNumbers,
      awayNumbers: state.awayNumbers,
      isRandomized: state.isRandomized
    });

    // Trigger the reveal animation
    this.draw.playNumberRevealAnimation(state.homeNumbers, state.awayNumbers);
  }

  /** The phone bar's one game-day button: lock (and draw), draw a locked board's numbers, or unlock. */
  public async runNextStep(): Promise<void> {
    if (hostNextStep(this.state.isLocked, this.state.isRandomized) === 'draw') {
      await this.randomizeNumbers();
      return;
    }
    await this.toggleLock();
  }

  /** Owner only. Locking a board that could shrink suggests a smaller size first. */
  public async toggleLock(): Promise<void> {
    if (!this.state.isGameOwner()) return;
    if (!this.state.isLocked && this.state.shrinkSizes().length) {
      this.ui.showShrinkSuggestion.set(true);
      return;
    }
    await this.setLocked(!this.state.isLocked);
  }

  // Private properties

  private readonly coHost: GamePageCoHostService = inject(GamePageCoHostService);
  private readonly confirmService: ConfirmService = inject(ConfirmService);
  /** The season count read when Edit game last opened, while it's in flight or done. */
  private seasonLoad: Promise<void> | null = null;
  private readonly draw: NumberDrawService = inject(NumberDrawService);
  private readonly gameService: GameService = inject(GameService);
  private readonly groups: GamePageGroupsService = inject(GamePageGroupsService);
  private readonly planService: PlanService = inject(PlanService);
  private readonly sanitizationService: SanitizationService = inject(SanitizationService);
  private readonly seasonGames: SeasonGamesService = inject(SeasonGamesService);
  private readonly state: GameStateService = inject(GameStateService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly ui: GamePageUiService = inject(GamePageUiService);

  // Private functions

  /** Clears drawn numbers; the winners belong to the numbers that were drawn, so they go with them. */
  private async clearNumbers(): Promise<void> {
    const state = this.state;
    const { rows, cols } = getBoardDimensions(state.boardSize);
    // Stop any running animation first
    this.draw.stopAnimation();

    state.homeNumbers = Array(cols).fill(null);
    state.awayNumbers = Array(rows).fill(null);
    state.isRandomized = false;
    state.winners = {};
    this.draw.showStoredNumbers();

    // Reset the animation flag for this game (re-generate will play animation again)
    this.draw.clearNumbersSeenFlag();

    await this.gameService.updateGame(state.gameId, {
      homeNumbers: state.homeNumbers,
      awayNumbers: state.awayNumbers,
      isRandomized: state.isRandomized,
      winners: {}
    });
  }

  /** Open boards, the squares limit and auto-manage each save on their own. False (after a warning) when one fails. */
  private async saveSeparateSettings(values: EditGameValues): Promise<boolean> {
    const state = this.state;
    if (values.showInOpenBoards !== state.showInOpenBoards) {
      try {
        state.openListId = await this.gameService.setShowInOpenBoards({ id: state.gameId, ownerId: state.gameOwnerId, openListId: state.openListId }, values.showInOpenBoards);
        state.showInOpenBoards = values.showInOpenBoards;
      } catch {
        this.toastService.warning('Saved, but Show in my open boards could not be changed. Try again in a moment.');
        return false;
      }
    }
    if (!await this.groups.saveChoice(values.group)) return false;
    await this.coHost.addGroupCoHost(values.coHostFromGroup, this.groups.groups().find(g => g.id === state.openListId)?.coHost?.email);
    if (state.isGameOwner() && this.planService.features().squareLimit && (values.maxSquaresPerPlayer ?? undefined) !== state.maxSquaresPerPlayer) {
      try {
        await this.gameService.setSquareLimit(state.gameId, values.maxSquaresPerPlayer);
        state.maxSquaresPerPlayer = values.maxSquaresPerPlayer ?? undefined;
      } catch {
        this.toastService.warning('Saved, but the squares limit could not be changed. Try again in a moment.');
        return false;
      }
    }
    if (state.canAutoManage() && values.autoManage !== !!state.autoManage) {
      try {
        const date = state.linkedEspnGame()?.date;
        await this.gameService.setAutoManage(state.gameId, values.autoManage ? { enabled: true, resize: true } : null, date ? Date.parse(date) : undefined);
        state.autoManage = values.autoManage ? { enabled: true, resize: true } : undefined;
      } catch {
        this.toastService.warning('Saved, but Auto-lock and draw could not be changed. Try again in a moment.');
        return false;
      }
    }
    return true;
  }

  /** A board as Clear game leaves it: a new game with no squares, numbers, scores or settings. */
  private clearedGame(): Partial<GameData> {
    const { rows, cols } = getBoardDimensions(this.state.boardSize);
    return {
      // A cleared board is a new game toward the season; the old one stays counted if it had players.
      startedAt: Date.now(),
      selectedSquares: {},
      homeNumbers: Array(cols).fill(null),
      awayNumbers: Array(rows).fill(null),
      scores: emptyScores(),
      winners: {},
      playerColors: {},
      playerUserIds: {},
      pricePerSquare: 10,
      isRandomized: false,
      isLocked: false,
      homeTeam: '',
      awayTeam: '',
      hostNote: '',
      paidPlayers: [],
      paidSquares: {}
    };
  }

  /**
   * Reads how many free games the owner has left this season. Leaves null when the cap is off or doesn't apply.
   * A failed read also leaves null on purpose: Clear game then works as before rather than blocking a host by mistake.
   */
  private async refreshSeasonGamesLeft(): Promise<void> {
    if (!this.state.isGameOwner()) return;
    this.seasonGamesLeft.set(await this.gameService.seasonGamesLeft(this.state.ownerId()).catch(() => null));
  }

  /**
   * Locking also draws the numbers in the same save, the way auto lock does. A board that
   * already has numbers just locks. `size` is the board size after a convert.
   */
  private async setLocked(locked: boolean, size: BoardSize = this.state.boardSize): Promise<void> {
    const state = this.state;
    void this.stopAutoManage();
    if (!locked || state.isRandomized) {
      state.isLocked = locked;
      try {
        await this.gameService.updateGame(state.gameId, { isLocked: locked });
      } catch {
        state.isLocked = !locked;
      }
      return;
    }

    const { homeNumbers, awayNumbers } = drawBoardNumbers(size);
    try {
      await this.gameService.updateGame(state.gameId, { isLocked: true, homeNumbers, awayNumbers, isRandomized: true, winners: {} });
    } catch {
      this.toastService.error('Could not lock the board. Try again.');
      return;
    }
    state.isLocked = true;
    state.homeNumbers = homeNumbers;
    state.awayNumbers = awayNumbers;
    state.isRandomized = true;
    state.winners = {};
    // The game listener sees numbers this browser hasn't seen and plays the reveal.
  }

  /** A host who locks, unlocks, draws or clears by hand takes over: Auto-lock and draw switches itself off for this board. */
  private async stopAutoManage(): Promise<void> {
    const state = this.state;
    if (!state.autoManage) return;
    const before = state.autoManage;
    state.autoManage = undefined;
    try {
      await this.gameService.setAutoManage(state.gameId, null);
      this.toastService.success('Auto-lock and draw is off for this board');
    } catch {
      state.autoManage = before;
      this.toastService.warning('Could not turn off Auto-lock and draw. Turn it off in Edit game.');
    }
  }
}
