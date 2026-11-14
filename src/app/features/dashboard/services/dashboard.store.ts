import { Injectable, Signal, computed, inject, signal } from '@angular/core';

import { CardMenuItem } from '../../../components/ui/card-menu/card-menu.component';
import { AuthService, AuthUser } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { GameListItem, GameService } from '../../../core/services/game.service';
import { TeamLogoService } from '../../../core/services/team-logo.service';
import { ToastService } from '../../../core/services/toast.service';
import { BoardGroup, groupBoards } from '../../../core/utils/board-groups';
import { drawBoardNumbers } from '../../../core/utils/draw-numbers';
import { filterHostedGames } from './dashboard-filters';
import { DashboardSearchService } from './dashboard-search.service';

/**
 * The dashboard's boards: the ones you host and the ones you joined, how the hosted ones are filtered and grouped,
 * and the actions on a card. Provided on the dashboard, so it lives and dies with the page.
 */
@Injectable()
export class DashboardStore {
  /** Hosted boards grouped by what the host does next. Empty groups are left out. */
  public readonly boardGroups = computed<BoardGroup[]>(() => groupBoards(this.visibleMyGames()));
  public canCreateGame: Signal<boolean> = inject(AuthService).canCreateGame;
  public readonly currentUser: Signal<AuthUser | null> = inject(AuthService).currentUser;
  public readonly hostMenu: CardMenuItem[] = [{ id: 'edit', label: 'Edit game' }, { id: 'delete', label: 'Delete game', danger: true }];
  public readonly isLoadingGames = signal<boolean>(true);
  public readonly joinedGames = signal<GameListItem[]>([]);
  public readonly joinedMenu: CardMenuItem[] = [{ id: 'remove', label: 'Remove from my list' }];
  /** Boards locked from their card in the last moment, so their lock plays the snap-shut animation once. */
  public readonly justLocked = signal<ReadonlySet<string>>(new Set());
  /** Boards whose Lock now is being saved. */
  public readonly lockingIds = signal<ReadonlySet<string>>(new Set());
  public readonly myGames = signal<GameListItem[]>([]);
  public readonly shareModalGameId = signal<string | null>(null);
  /** Hosted boards matching the search, newest first. */
  public readonly visibleMyGames = computed<GameListItem[]>(() => {
    const search = this.search;
    return filterHostedGames(this.myGames(), search.gameSearch(), !!search.codeMatch() || search.showCodeError(), g => this.teamLogos.teams(g));
  });

  public async deleteGame(gameId: string): Promise<void> {
    const user = this.currentUser();
    if (!user) return;

    const name = this.myGames().find(g => g.id === gameId)?.name ?? 'This game';
    if (await this.confirmService.ask({ title: 'Delete this game?', message: `${name} will be removed for everyone. This cannot be undone.`, confirmLabel: 'Delete game' })) {
      try {
        await this.gameService.deleteGame(gameId, user.uid);
        this.myGames.update(games => games.filter(g => g.id !== gameId));
      } catch (error) {
        this.toastService.error('Could not delete the game. Try again.');
      }
    }
  }

  public async loadMyGames(): Promise<void> {
    const user = this.currentUser();
    if (user && !user.isGuest) {
      this.isLoadingGames.set(true);
      try {
        const [owned, joined] = await Promise.all([
          this.gameService.getUserGames(user.uid),
          this.gameService.getJoinedGames(user.uid)
        ]);
        this.myGames.set(owned);
        this.joinedGames.set(joined);
        const linked = owned.filter(game => !!game.espnEventId);
        if (linked.length > 0) {
          this.gameService.ensureLiveGameIndexes(linked.map(game => ({
            gameId: game.id,
            espnEventId: game.espnEventId as string,
            espnSport: game.espnSport
          }))).catch(() => {});
        }
      } catch (error) {
        this.toastService.error('Could not load your games. Try again.');
      } finally {
        this.isLoadingGames.set(false);
      }
    } else {
      this.isLoadingGames.set(false);
    }
  }

  /** Lock now on a Ready to lock card: same write as the game page's Lock button, which also turns Auto-lock and draw off. */
  public async lockNow(game: GameListItem): Promise<void> {
    if (this.lockingIds().has(game.id)) return;
    const auto = !!game.autoManage?.enabled;
    const draws = !game.isRandomized;
    const ok = await this.confirmService.ask({
      title: `Lock ${game.name}?`,
      message: `Players can't pick or change squares once it's locked.${draws ? ' The numbers are drawn now.' : ''}${auto ? ' Auto-lock and draw turns off for this board.' : ''}`,
      confirmLabel: draws ? 'Lock and draw numbers' : 'Lock board',
      tone: 'primary',
      rememberKey: 'lock-board'
    });
    if (!ok) return;
    this.lockingIds.update(ids => new Set(ids).add(game.id));
    try {
      // Locking draws the numbers in the same save, as auto lock does; drawn numbers stay as they are.
      await this.gameService.updateGame(game.id, draws
        ? { isLocked: true, ...drawBoardNumbers(game.boardSize || 100), isRandomized: true, winners: {} }
        : { isLocked: true });
      if (auto) {
        await this.gameService.setAutoManage(game.id, null).catch(() =>
          this.toastService.warning('Locked, but Auto-lock and draw could not be turned off. Turn it off in Edit game.'));
      }
      this.justLocked.update(ids => new Set(ids).add(game.id));
      this.myGames.update(games => games.map(g => g.id === game.id ? { ...g, isLocked: true, isRandomized: true, autoManage: undefined } : g));
      setTimeout(() => this.justLocked.update(ids => { const next = new Set(ids); next.delete(game.id); return next; }), 1200);
    } catch {
      this.toastService.error('Could not lock the board. Try again.');
    } finally {
      this.lockingIds.update(ids => { const next = new Set(ids); next.delete(game.id); return next; });
    }
  }

  /** Takes a joined game off this user's list only. Their squares stay on the board. */
  public async removeJoinedGame(gameId: string): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    try {
      await this.gameService.removeJoinedGame(user.uid, gameId);
      this.joinedGames.update(games => games.filter(g => g.id !== gameId));
      this.toastService.success('Removed from your list. Your squares stay on the board.');
    } catch {
      this.toastService.error('Could not remove it. Try again.');
    }
  }

  public shareGame(gameId: string): void {
    this.shareModalGameId.set(gameId);
  }

  /** Applies a change to one hosted board in the list, after it was saved. */
  public updateMyGame(gameId: string, change: (game: GameListItem) => GameListItem): void {
    this.myGames.update(games => games.map(g => g.id === gameId ? change(g) : g));
  }

  private readonly confirmService: ConfirmService = inject(ConfirmService);
  private readonly gameService: GameService = inject(GameService);
  private readonly search: DashboardSearchService = inject(DashboardSearchService);
  private readonly teamLogos: TeamLogoService = inject(TeamLogoService);
  private readonly toastService: ToastService = inject(ToastService);
}
