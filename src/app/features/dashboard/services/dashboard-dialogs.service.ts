import { Injectable, computed, inject, signal } from '@angular/core';
import { ParamMap, Router } from '@angular/router';

import { ActiveBoardLimitError } from '../../../core/errors/active-board-limit.error';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { GameListItem, GameService } from '../../../core/services/game.service';
import { PlanService } from '../../../core/services/plan.service';
import { SanitizationService } from '../../../core/services/sanitization.service';
import { ToastService } from '../../../core/services/toast.service';
import { buildCreateGameValues, clearCreateDraft, isPendingAutoSubmit, loadCreateDraft, saveCreateDraft } from '../../../core/utils/create-game-draft';
import { CreateGameSubmit } from '../../create/create-game-form.component';
import { DashboardEditService } from './dashboard-edit.service';
import { DashboardStore } from './dashboard.store';

type UpgradeTrigger = 'limit' | 'pass' | 'ended';

/** New board and Season Pass: the create form, the board-limit check, and the upgrade dialog. Provided on the dashboard. */
@Injectable()
export class DashboardDialogsService {
  /** Any sheet or dialog is open: the page stops scrolling. */
  public readonly anyModalOpen = computed<boolean>(() => this.showCreateModal() || this.edit.showEditModal() || this.showUpgradeDialog());
  public readonly autoManageDefault = signal<boolean>(true);
  /** The phone bottom bar steps out of the way while a sheet or dialog is open. */
  public readonly barHidden = computed<boolean>(() => this.showCreateModal() || this.edit.showEditModal() || this.showUpgradeDialog() || !!this.store.shareModalGameId());
  /** The finished board shown in the 'ended' dialog. */
  public readonly endedBoard = signal<GameListItem | null>(null);
  public readonly isCheckingBoardLimit = signal<boolean>(false);
  public readonly isCreating = signal<boolean>(false);
  public readonly showCreateModal = signal<boolean>(false);
  public readonly showUpgradeDialog = signal<boolean>(false);
  public readonly upgradeTrigger = signal<UpgradeTrigger>('limit');

  public closeCreateModal(): void {
    this.showCreateModal.set(false);
    clearCreateDraft();
  }

  public closeUpgrade(): void {
    this.showUpgradeDialog.set(false);
    const trigger = this.upgradeReturnFocus;
    setTimeout(() => trigger?.focus());
  }

  public async createGame(submit: CreateGameSubmit): Promise<void> {
    const user = this.store.currentUser();
    if (!user) return;
    if (user.isGuest) {
      this.toastService.error('Sign in with Google or email to create a game.');
      return;
    }

    const { draft, values } = submit;
    this.isCreating.set(true);
    try {
      const gameId = await this.gameService.createGame(
        user.uid, user.displayName || 'Unknown', values.name, values.espnEventId, values.homeTeam, values.awayTeam, values.price,
        values.espnSport, values.manager, values.hostNote, values.boardSize, values.quarterSplit, values.emptyQuarterRule
      );
      await this.applyCreateExtras(gameId, user.uid, values);
      this.showCreateModal.set(false);
      clearCreateDraft();
      this.router.navigate(['/game', gameId]);
    } catch (error) {
      // Keep what the host entered so a retry, or a reset of the old board, does not start over.
      saveCreateDraft({ ...draft, autoSubmit: false });
      if (error instanceof ActiveBoardLimitError) {
        this.showCreateModal.set(false);
        this.openUpgradeDialog('limit');
      } else {
        console.error('[Dashboard] Create game failed', (error as { code?: string })?.code ?? error);
        this.toastService.error('Could not create the game. Try again.');
        this.showCreateModal.set(true);
      }
    } finally {
      this.isCreating.set(false);
    }
  }

  /** Deletes the finished board, then opens the new game form. */
  public async deleteOldBoard(): Promise<void> {
    const board = this.endedBoard();
    const user = this.store.currentUser();
    if (!board || !user) return;
    if (!await this.confirmService.ask({ title: 'Delete this game?', message: `${board.name} will be removed for everyone. This cannot be undone.`, confirmLabel: 'Delete game' })) return;
    try {
      await this.gameService.deleteGame(board.id, user.uid);
      this.store.myGames.update(games => games.filter(g => g.id !== board.id));
      this.showUpgradeDialog.set(false);
      this.showCreateModal.set(true);
    } catch {
      this.toastService.error('Could not delete the game. Try again.');
    }
  }

  /** Esc: close but keep the entries, so reopening restores them. The X and Cancel clear the draft. */
  public dismissCreateModal(): void {
    this.showCreateModal.set(false);
  }

  /** Reads this host's Auto-lock and draw default for the create form, once sign-in has settled. */
  public loadAutoManageDefault(): void {
    this.authService.waitForAuthReady().then(() => {
      const uid = this.store.currentUser()?.uid;
      if (uid) this.gameService.getAutoManageDefault(uid).then(on => this.autoManageDefault.set(on));
    });
  }

  public async openCreateModal(event: Event): Promise<void> {
    const trigger = event.currentTarget;
    if (trigger instanceof HTMLElement) {
      this.upgradeReturnFocus = trigger;
    }
    const user = this.store.currentUser();
    if (!user || user.isGuest || this.isCheckingBoardLimit()) {
      return;
    }
    this.isCheckingBoardLimit.set(true);
    try {
      await this.gameService.assertUnderFreeBoardLimit(user.uid);
      if (this.showEndedBoardDialog()) return;
      this.showCreateModal.set(true);
    } catch (error) {
      if (error instanceof ActiveBoardLimitError) {
        this.openUpgradeDialog('limit');
      } else {
        this.toastService.error('Could not check your boards. Try again.');
      }
    } finally {
      this.isCheckingBoardLimit.set(false);
    }
  }

  public openUpgrade(event: Event): void {
    if (event.currentTarget instanceof HTMLElement) this.upgradeReturnFocus = event.currentTarget;
    this.openUpgradeDialog('pass');
  }

  /** Clears the finished board, then opens its settings so the host can pick the next game. */
  public async resetOldBoard(): Promise<void> {
    const board = this.endedBoard();
    if (!board) return;
    if (!await this.confirmService.ask({ title: 'Reset this game?', message: 'Squares, numbers and scores are cleared. Players keep your link.', confirmLabel: 'Reset game' })) return;
    try {
      await this.gameService.resetGame(board.id, board.boardSize);
      this.store.updateMyGame(board.id, g => ({ ...g, squaresFilled: 0, playerCount: 0, confirmedCount: 0, isLocked: false }));
      this.showUpgradeDialog.set(false);
      this.edit.openEditModal(board);
    } catch {
      this.toastService.error('Could not reset the game. Try again.');
    }
  }

  /**
   * Opens the create form when the page was asked to: ?create=true, the team page's flag from before sign-in,
   * or a create the visitor started signed out.
   */
  public resumeCreateIntent(params: ParamMap): void {
    const createFromQuery = params.get('create') === 'true';
    const createFromStorage = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('qs_create_after_auth') === 'true';
    const createFromDraft = typeof localStorage !== 'undefined' && isPendingAutoSubmit(loadCreateDraft());
    if (createFromQuery || createFromStorage || createFromDraft) {
      // Clear both indicators
      if (createFromQuery) {
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
      }
      if (createFromStorage) {
        sessionStorage.removeItem('qs_create_after_auth');
      }
      setTimeout(() => this.openCreateModalDirect(), 100);
    }
  }

  private readonly authService: AuthService = inject(AuthService);
  private readonly confirmService: ConfirmService = inject(ConfirmService);
  private readonly edit: DashboardEditService = inject(DashboardEditService);
  private readonly gameService: GameService = inject(GameService);
  private readonly planService: PlanService = inject(PlanService);
  private readonly router: Router = inject(Router);
  private readonly sanitizationService: SanitizationService = inject(SanitizationService);
  private readonly store: DashboardStore = inject(DashboardStore);
  private readonly toastService: ToastService = inject(ToastService);
  private upgradeReturnFocus: HTMLElement | null = null;

  /** The settings saved after the board exists. Each one failing only warns: the board is already made. */
  private async applyCreateExtras(gameId: string, uid: string, values: CreateGameSubmit['values']): Promise<void> {
    if (values.showInOpenBoards) {
      try {
        await this.gameService.setShowInOpenBoards(gameId, uid, true);
      } catch {
        this.toastService.warning('Board created, but Show in my open boards could not be turned on. Try again in Edit.');
      }
    }
    if (values.maxSquaresPerPlayer && this.planService.features().squareLimit) {
      try {
        await this.gameService.setSquareLimit(gameId, values.maxSquaresPerPlayer);
      } catch {
        this.toastService.warning('Board created, but the squares limit could not be set. Try again in Edit.');
      }
    }
    if (values.autoManage && this.planService.features().autoManage) {
      try {
        await this.gameService.setAutoManage(gameId, { enabled: true, resize: true }, values.kickoffAt);
      } catch {
        this.toastService.warning('Board created, but Auto-lock and draw could not be turned on. Try again in Edit.');
      }
    }
  }

  /** Open create modal directly without event (for query param trigger). Finishes a create the visitor started signed out. */
  private async openCreateModalDirect(): Promise<void> {
    await this.authService.waitForAuthReady();
    const user = this.store.currentUser();
    const draft = loadCreateDraft();
    if (!user) return;
    this.isCheckingBoardLimit.set(true);
    try {
      if (isPendingAutoSubmit(draft)) {
        // The limit checks below need the real plan and board list, not the defaults.
        await Promise.all([this.store.loadMyGames(), this.planService.refresh(user.uid)]);
        saveCreateDraft({ ...draft, autoSubmit: false });
      }
      await this.gameService.assertUnderFreeBoardLimit(user.uid);
      if (this.showEndedBoardDialog()) return;
      // The signed-out form cannot see the plan or the profile switch, so it saved Auto-lock and draw as off. Apply the real default here.
      const wantAuto = isPendingAutoSubmit(draft) && this.planService.features().autoManage && await this.gameService.getAutoManageDefault(user.uid);
      const readyDraft = draft && wantAuto ? { ...draft, autoManage: true } : draft;
      const built = readyDraft && isPendingAutoSubmit(draft) ? buildCreateGameValues(readyDraft, this.sanitizationService, this.planService.features().customSplits) : null;
      if (readyDraft && built?.ok) {
        await this.createGame({ draft: readyDraft, values: built.values });
        return;
      }
      this.showCreateModal.set(true);
    } catch (error) {
      if (error instanceof ActiveBoardLimitError) {
        this.openUpgradeDialog('limit');
      } else {
        // Never fail silently: say so, and open the form with the saved entries.
        console.error('[Dashboard] Could not finish the create', (error as { code?: string })?.code ?? error);
        this.toastService.error('We could not finish creating your board. Your entries are saved: press Create to try again.');
        this.showCreateModal.set(true);
      }
    } finally {
      this.isCheckingBoardLimit.set(false);
    }
  }

  private openUpgradeDialog(trigger: UpgradeTrigger): void {
    this.upgradeTrigger.set(trigger);
    this.showUpgradeDialog.set(true);
  }

  /**
   * A free host whose only board has ended: ask them to reset or delete it before starting another.
   * Returns true when the dialog was opened. Paid plans with room, and admins, are not affected.
   */
  private showEndedBoardDialog(): boolean {
    const owned = this.store.myGames();
    if (owned.length === 0 || owned.length < this.planService.features().activeBoards) return false;
    this.endedBoard.set(owned[0]);
    this.openUpgradeDialog('ended');
    return true;
  }
}
