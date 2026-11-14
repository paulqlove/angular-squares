import { Injectable, computed, inject, signal } from '@angular/core';

import { DEFAULT_EMPTY_QUARTER_RULE } from '../../../core/plans';
import { EspnGame, EspnService, SportType } from '../../../core/services/espn.service';
import { GameListItem, GameService } from '../../../core/services/game.service';
import { PlanService } from '../../../core/services/plan.service';
import { SanitizationService } from '../../../core/services/sanitization.service';
import { ToastService } from '../../../core/services/toast.service';
import { EditGameValues } from '../../super-bowl-squares/components/edit-game-dialog/edit-game-dialog.component';
import { DashboardStore } from './dashboard.store';

type EditablePlayer = { name: string; uid: string };

/** The settings saved one by one after the main save, as they ended up: a failure keeps the board's old value. */
interface AppliedExtras {
  autoManage: GameListItem['autoManage'];
  maxSquaresPerPlayer: GameListItem['maxSquaresPerPlayer'];
  showInOpenBoards: boolean;
}

/** The fields the main save writes, sanitized. */
interface EditedFields {
  awayTeam: string;
  emptyQuarterRule: EditGameValues['emptyQuarterRule'];
  espnEventId: string | null;
  espnSport: SportType | null | undefined;
  homeTeam: string;
  hostNote: string;
  name: string;
  pricePerSquare: number;
}

const zeroScores = (): Record<string, { home: number; away: number }> =>
  ({ q1: { home: 0, away: 0 }, q2: { home: 0, away: 0 }, q3: { home: 0, away: 0 }, q4: { home: 0, away: 0 } });

/** The Edit game dialog opened from a dashboard card: its values, the ESPN games to link, co-host and saving. Provided on the dashboard. */
@Injectable()
export class DashboardEditService {
  /** Show in my open boards can be changed: a plan with open boards, on a board that is open or already shown. */
  public readonly canEditShowInOpenBoards = computed<boolean>(() => {
    const g = this.editingGame();
    return !!g && this.planService.features().activeBoards > 1 && (!!g.showInOpenBoards || (!g.isLocked && g.squaresFilled < g.boardSize));
  });
  /** The co-host line in the dialog: their name, else their email, else Assigned; empty with no co-host. */
  public readonly coHostName = computed<string>(() => {
    const game = this.editingGame();
    return game?.managerId ? (game.managerName || game.managerEmail || 'Assigned') : '';
  });
  public readonly editBoardRandomized = signal<boolean>(false);
  public readonly editEspnGames = signal<EspnGame[]>([]);
  public readonly editGamePlayers = signal<EditablePlayer[]>([]);
  public readonly editingGame = signal<GameListItem | null>(null);
  public readonly editValues = signal<EditGameValues>({ awayTeam: '', homeTeam: '', pricePerSquare: 10, hostNote: '', quarterSplit: null, emptyQuarterRule: DEFAULT_EMPTY_QUARTER_RULE, newBoardSize: null, showInOpenBoards: false, autoManage: false, maxSquaresPerPlayer: null });
  public readonly isLoadingEditEspnGames = signal<boolean>(false);
  public readonly isSavingGame = signal<boolean>(false);
  public readonly showEditModal = signal<boolean>(false);

  public async assignManagerFromPlayer(player: EditablePlayer): Promise<void> {
    const game = this.editingGame();
    if (!game) return;

    try {
      await this.gameService.updateGameManager(game.id, player.uid, null, player.name);
      this.editingGame.set({ ...game, managerId: player.uid, managerName: player.name, managerEmail: undefined });
      this.store.updateMyGame(game.id, g => ({ ...g, managerId: player.uid, managerName: player.name, managerEmail: undefined }));
    } catch (error) {
      this.toastService.error('Could not assign the co-host. Try again.');
    }
  }

  public closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingGame.set(null);
    this.editGamePlayers.set([]);
    this.editEspnGames.set([]);
  }

  public async fetchEditEspnGames(sport: SportType | 'custom'): Promise<void> {
    if (sport === 'custom') {
      this.editEspnGames.set([]);
      return;
    }
    this.isLoadingEditEspnGames.set(true);
    try {
      const games = await this.espnService.getGames(sport);
      this.editEspnGames.set(games);
    } finally {
      this.isLoadingEditEspnGames.set(false);
    }
  }

  public async openEditModal(game: GameListItem): Promise<void> {
    const isCustomGame = !game.espnEventId;
    this.editingGame.set(game);
    this.editValues.set({
      name: game.name,
      sport: isCustomGame ? 'custom' : (game.espnSport || 'nfl'),
      espnGameId: game.espnEventId || '',
      awayTeam: game.awayTeam || '',
      homeTeam: game.homeTeam || '',
      pricePerSquare: game.pricePerSquare,
      hostNote: game.hostNote || '',
      quarterSplit: null,
      emptyQuarterRule: game.emptyQuarterRule ?? DEFAULT_EMPTY_QUARTER_RULE,
      newBoardSize: null,
      showInOpenBoards: !!game.showInOpenBoards,
      autoManage: !!game.autoManage,
      maxSquaresPerPlayer: game.maxSquaresPerPlayer ?? null
    });
    this.editBoardRandomized.set(false);
    this.showEditModal.set(true);
    if (!isCustomGame) {
      this.fetchEditEspnGames(game.espnSport || 'nfl');
    }
    await this.loadPlayers(game.id);
  }

  public async removeManager(): Promise<void> {
    const game = this.editingGame();
    if (!game) return;

    try {
      await this.gameService.updateGameManager(game.id, null, null, null);
      this.editingGame.set({ ...game, managerId: undefined, managerEmail: undefined, managerName: undefined });
      this.store.updateMyGame(game.id, g => ({ ...g, managerId: undefined, managerEmail: undefined, managerName: undefined }));
    } catch (error) {
      this.toastService.error('Could not remove the co-host. Try again.');
    }
  }

  public async saveGameEdits(v: EditGameValues): Promise<void> {
    const game = this.editingGame();
    if (!game) return;

    const sanitizedName = this.sanitizationService.sanitizeGameName(v.name ?? '');
    const sanitizedPrice = this.sanitizationService.validatePrice(v.pricePerSquare);
    const sanitizedHostNote = this.sanitizationService.sanitizeHostNote(v.hostNote);

    this.isSavingGame.set(true);
    try {
      const espnChanged = (v.espnGameId || undefined) !== game.espnEventId;
      const fields: EditedFields = {
        name: sanitizedName,
        pricePerSquare: sanitizedPrice,
        hostNote: sanitizedHostNote,
        emptyQuarterRule: v.emptyQuarterRule,
        espnEventId: v.espnGameId || null,
        espnSport: v.espnGameId && v.sport !== 'custom' ? v.sport : null,
        ...this.editedTeams(game, v)
      };
      const updates: Record<string, any> = espnChanged ? { ...fields, scores: zeroScores(), winners: {} } : { ...fields };
      const newSize = v.newBoardSize;
      if (newSize) await this.gameService.resizeBoard(game.id, newSize);
      await this.gameService.updateGame(game.id, updates);
      const applied = await this.saveExtras(game, v, espnChanged);
      const saved = { ...applied, ...fields, espnEventId: fields.espnEventId || undefined, espnSport: fields.espnSport || undefined };
      this.store.updateMyGame(game.id, g => ({ ...g, ...(newSize ? { boardSize: newSize } : {}), ...saved, ...(espnChanged ? { scores: zeroScores(), winners: {} } : {}) }));
      this.closeEditModal();
    } catch (error) {
      this.toastService.error('Could not save changes. Try again.');
    } finally {
      this.isSavingGame.set(false);
    }
  }

  private readonly espnService: EspnService = inject(EspnService);
  private readonly gameService: GameService = inject(GameService);
  private readonly planService: PlanService = inject(PlanService);
  private readonly sanitizationService: SanitizationService = inject(SanitizationService);
  private readonly store: DashboardStore = inject(DashboardStore);
  private readonly toastService: ToastService = inject(ToastService);

  /** Team names: a custom game uses the edited fields, an ESPN game uses the selected game. */
  private editedTeams(game: GameListItem, v: EditGameValues): { awayTeam: string; homeTeam: string } {
    if (v.sport === 'custom') {
      return {
        homeTeam: this.sanitizationService.sanitizeTeamName(v.homeTeam) || game.homeTeam || '',
        awayTeam: this.sanitizationService.sanitizeTeamName(v.awayTeam) || game.awayTeam || ''
      };
    }
    const selectedEspnGame = this.editEspnGames().find(g => g.id === v.espnGameId);
    return {
      homeTeam: selectedEspnGame?.homeTeam || game.homeTeam || '',
      awayTeam: selectedEspnGame?.awayTeam || game.awayTeam || ''
    };
  }

  /** The players on the board other than this host, who can be made co-host; and whether its numbers are drawn. */
  private async loadPlayers(gameId: string): Promise<void> {
    const fullGame = await this.gameService.getGame(gameId);
    this.editBoardRandomized.set(!!fullGame?.isRandomized);
    if (fullGame?.playerUserIds) {
      const currentUid = this.store.currentUser()?.uid;
      const players = Object.entries(fullGame.playerUserIds)
        .filter(([, uid]) => uid !== currentUid)
        .map(([name, uid]) => ({ name, uid }));
      this.editGamePlayers.set(players);
    } else {
      this.editGamePlayers.set([]);
    }
  }

  /** Auto-lock and draw saves on its own, after the main save. */
  private async saveAutoManage(game: GameListItem, v: EditGameValues, espnChanged: boolean): Promise<AppliedExtras['autoManage']> {
    const wantAuto = this.planService.features().autoManage && !!v.espnGameId && v.autoManage;
    if (!(!!wantAuto !== !!game.autoManage || (wantAuto && espnChanged))) return game.autoManage;
    try {
      const autoApplied = wantAuto ? { enabled: true, resize: true } : undefined;
      const picked = this.editEspnGames().find(g => g.id === v.espnGameId)?.date;
      await this.gameService.setAutoManage(game.id, autoApplied ?? null, picked ? Date.parse(picked) : undefined);
      return autoApplied;
    } catch {
      this.toastService.warning('Saved, but Auto-lock and draw could not be changed. Try again in a moment.');
      return game.autoManage;
    }
  }

  /** The open-boards switch, the squares limit and Auto-lock and draw save on their own, so a failure never loses the other edits. */
  private async saveExtras(game: GameListItem, v: EditGameValues, espnChanged: boolean): Promise<AppliedExtras> {
    const showInOpenBoards = await this.saveShowInOpenBoards(game, v);
    const maxSquaresPerPlayer = await this.saveSquareLimit(game, v);
    const autoManage = await this.saveAutoManage(game, v, espnChanged);
    return { showInOpenBoards, autoManage, maxSquaresPerPlayer };
  }

  private async saveShowInOpenBoards(game: GameListItem, v: EditGameValues): Promise<boolean> {
    const showApplied = !!game.showInOpenBoards;
    const uid = this.store.currentUser()?.uid;
    if (!uid || v.showInOpenBoards === showApplied) return showApplied;
    try {
      await this.gameService.setShowInOpenBoards(game.id, uid, v.showInOpenBoards);
      return v.showInOpenBoards;
    } catch {
      this.toastService.warning('Saved, but Show in my open boards could not be changed. Try again in a moment.');
      return showApplied;
    }
  }

  private async saveSquareLimit(game: GameListItem, v: EditGameValues): Promise<AppliedExtras['maxSquaresPerPlayer']> {
    if (!this.planService.features().squareLimit || (v.maxSquaresPerPlayer ?? undefined) === game.maxSquaresPerPlayer) return game.maxSquaresPerPlayer;
    try {
      await this.gameService.setSquareLimit(game.id, v.maxSquaresPerPlayer);
      return v.maxSquaresPerPlayer ?? undefined;
    } catch {
      this.toastService.warning('Saved, but the squares limit could not be changed. Try again in a moment.');
      return game.maxSquaresPerPlayer;
    }
  }
}
