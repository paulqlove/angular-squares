import { Injectable, Injector, Signal, afterNextRender, computed, inject, signal } from '@angular/core';

import { CardMenuItem } from '../../../components/ui/card-menu/card-menu.component';
import { AuthService, AuthUser } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { GameData, GameListItem, GameService } from '../../../core/services/game.service';
import { PlanService } from '../../../core/services/plan.service';
import { SeasonGamesService } from '../../../core/services/season-games.service';
import { TeamLogoService } from '../../../core/services/team-logo.service';
import { ToastService } from '../../../core/services/toast.service';
import { BoardGroup, groupBoards } from '../../../core/utils/board-groups';
import { drawBoardNumbers } from '../../../core/utils/draw-numbers';
import { GroupRow, gamesInGroup } from '../../../core/utils/game-groups';
import { toGameListItem } from '../../../core/utils/game-parse';
import { deleteCountNote, freeGamesText, gamesLeft, seasonLimitApplies } from '../../../core/utils/season-games';
import { EmptyDashboardFacts, isFirstEmpty, isPassEmpty, isReturningEmpty } from '../utils/returning-empty';
import { filterHostedGames } from './dashboard-filters';
import { DashboardGroupsService } from './dashboard-groups.service';
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
  /** How a card comes in: a 160ms fade when the boards first load, then nothing, so search and Boards | Players feel instant. */
  public readonly cardEnter = signal<string>('qs-row-in');
  public readonly currentUser: Signal<AuthUser | null> = inject(AuthService).currentUser;
  /** Hosted boards in the group picked in the group picker, or all of them under All groups. */
  public readonly groupGames = computed<GameListItem[]>(() => gamesInGroup(this.myGames(), this.groups.picked()?.id));
  /** The group picker shows once the owner has a group, or has a board and can make a group. */
  public readonly groupPickerShows = computed<boolean>(() =>
    !this.isLoadingGames() && (this.groups.groups().length > 0 || (this.groups.canEdit() && this.myGames().length > 0)));
  /** Each of the owner's groups with how many hosted boards are filed in it. */
  public readonly groupRows = computed<GroupRow[]>(() => this.groups.rows(this.myGames()));
  public readonly hostMenu: CardMenuItem[] = [{ id: 'edit', label: 'Edit game' }, { id: 'delete', label: 'Delete game', danger: true }];
  public readonly isLoadingGames = signal<boolean>(true);
  public readonly joinedGames = signal<GameListItem[]>([]);
  public readonly joinedMenu: CardMenuItem[] = [{ id: 'remove', label: 'Remove from my list' }];
  /** Boards locked from their card in the last moment, so their lock plays the snap-shut animation once. */
  public readonly justLocked = signal<ReadonlySet<string>>(new Set());
  /** Boards whose Lock now is being saved. */
  public readonly lockingIds = signal<ReadonlySet<string>>(new Set());
  public readonly myGames = signal<GameListItem[]>([]);
  /** A free host with no boards who already played this season: the returning-host empty dashboard shows. */
  public readonly returningEmpty = computed<boolean>(() => isReturningEmpty(this.emptyFacts()));
  /** A free host with no boards and nothing counted this season: the "Host your first squares game" dashboard shows. */
  public readonly firstEmpty = computed<boolean>(() => isFirstEmpty(this.emptyFacts()));
  /** A Season Pass host with no boards: the Season Pass tiles and the start card show. */
  public readonly passEmpty = computed<boolean>(() => isPassEmpty(this.emptyFacts(), this.planService.plan()));
  /** Any empty dashboard: code field up top and New board pinned along the bottom on phones. */
  public readonly emptyHost = computed<boolean>(() => this.returningEmpty() || this.firstEmpty() || this.passEmpty());
  /** The New board button's words on an empty dashboard. */
  public readonly newBoardLabel = computed<string>(() => this.firstEmpty() ? 'Create your first board' : 'New board');
  /** The first word of the signed-in name, for "Welcome, Sam", or '' with no name. */
  public readonly firstName = computed<string>(() => this.currentUser()?.displayName?.trim().split(/\s+/)[0] ?? '');
  /** Every board this user hosts or co-hosts, in full, for the Players view. Newest first, hosted ones first. */
  public readonly runBoards = signal<GameData[]>([]);
  public readonly shareModalGameId = signal<string | null>(null);
  /** Free games left this season for a free host while the season cap is on, else null. */
  public readonly seasonGamesLeft = computed<number | null>(() => {
    const cap = this.planService.features().seasonGames;
    const used = this.seasonGames.used();
    return seasonLimitApplies(cap) && used !== null ? gamesLeft(cap, used) : null;
  });
  /** "1 free game" or "0 free games" for the line under the dashboard title. */
  public readonly seasonGamesLeftText = computed<string>(() => freeGamesText(this.seasonGamesLeft() ?? 0));
  /** Games this host has used this season, or null until read. */
  public readonly seasonGamesUsed = computed<number | null>(() => this.seasonGames.used());
  /** Hosted boards in the picked group matching the search, newest first. */
  public readonly visibleMyGames = computed<GameListItem[]>(() => {
    const search = this.search;
    return filterHostedGames(this.groupGames(), search.gameSearch(), !!search.codeMatch() || search.showCodeError(), {
      teamsOf: g => this.teamLogos.teams(g),
      groupNameOf: g => this.groups.nameOf(g)
    });
  });

  public async deleteGame(gameId: string): Promise<void> {
    const user = this.currentUser();
    if (!user) return;

    const game = this.myGames().find(g => g.id === gameId);
    const message = `${game?.name ?? 'This game'} will be removed for everyone. This cannot be undone.${game ? this.seasonDeleteNote(game) : ''}`;
    if (await this.confirmService.ask({ title: 'Delete this game?', message, confirmLabel: 'Delete game' })) {
      try {
        await this.gameService.deleteGame(gameId, user.uid);
        this.myGames.update(games => games.filter(g => g.id !== gameId));
        this.runBoards.update(boards => boards.filter(b => b.id !== gameId));
        this.refreshSeasonCount();
      } catch {
        this.toastService.error('Could not delete the game. Try again.');
      }
    }
  }

  public async loadMyGames(): Promise<void> {
    const user = this.currentUser();
    if (user && !user.isGuest) {
      this.isLoadingGames.set(true);
      this.cardEnter.set('qs-row-in');
      try {
        const [ownedRecords, joinedRecords] = await Promise.all([
          this.gameService.getUserGameRecords(user.uid),
          this.gameService.getJoinedGameRecords(user.uid),
          this.groups.load(user.uid)
        ]);
        const owned = ownedRecords.map(game => toGameListItem(game.id as string, game, true));
        this.myGames.set(owned);
        this.joinedGames.set(joinedRecords.map(game => toGameListItem(game.id as string, game, false)));
        this.runBoards.set([...ownedRecords, ...joinedRecords.filter(game => game.managerId === user.uid)]);
        // With no boards, which empty state shows hangs on the season count, so wait for it rather than swap screens
        const seasonRead = this.refreshSeasonCount();
        if (owned.length === 0) await seasonRead;
        const linked = owned.filter(game => !!game.espnEventId);
        if (linked.length > 0) {
          this.gameService.ensureLiveGameIndexes(linked.map(game => ({
            gameId: game.id,
            espnEventId: game.espnEventId as string,
            espnSport: game.espnSport
          }))).catch(() => {});
        }
      } catch {
        this.toastService.error('Could not load your games. Try again.');
      } finally {
        this.isLoadingGames.set(false);
        afterNextRender(() => this.cardEnter.set(''), { injector: this.injector });
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
      this.runBoards.update(boards => boards.map(b => b.id === game.id ? { ...b, isLocked: true } : b));
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

  /** Re-reads how many games this host has used this season, for the plan card and the limit dialogs. */
  public async refreshSeasonCount(): Promise<void> {
    const user = this.currentUser();
    if (!user || user.isGuest || !seasonLimitApplies(this.planService.features().seasonGames)) return;
    // A failed read hides the "games left" line rather than showing a wrong number.
    await this.seasonGames.usedThisSeason(user.uid, this.myGames()).catch(() => this.seasonGames.used.set(null));
  }

  /** The extra delete-confirm sentence for a game with players that keeps counting this season, or ''. */
  public seasonDeleteNote(game: GameListItem): string {
    const note = deleteCountNote(game, this.planService.features().seasonGames, Date.now());
    return note ? ` ${note}` : '';
  }

  public shareGame(gameId: string): void {
    this.shareModalGameId.set(gameId);
  }

  /** Puts a board the Players view just changed back into both lists, so its card shows the same counts. */
  public setRunBoard(board: GameData): void {
    this.runBoards.update(boards => boards.map(b => b.id === board.id ? board : b));
    const item = (joined: boolean) => toGameListItem(board.id as string, board, !joined);
    // The co-host's email isn't on the board itself (only the owner can read it), so the card keeps the one it has.
    this.myGames.update(games => games.map(g => g.id === board.id ? { ...item(false), managerEmail: g.managerEmail } : g));
    this.joinedGames.update(games => games.map(g => g.id === board.id ? item(true) : g));
  }

  /** Applies a change to one hosted board in the list, after it was saved. */
  public updateMyGame(gameId: string, change: (game: GameListItem) => GameListItem): void {
    this.myGames.update(games => games.map(g => g.id === gameId ? change(g) : g));
  }

  private readonly confirmService: ConfirmService = inject(ConfirmService);
  private readonly gameService: GameService = inject(GameService);
  private readonly groups: DashboardGroupsService = inject(DashboardGroupsService);
  private readonly injector: Injector = inject(Injector);
  private readonly planService: PlanService = inject(PlanService);
  private readonly search: DashboardSearchService = inject(DashboardSearchService);
  private readonly seasonGames: SeasonGamesService = inject(SeasonGamesService);
  private readonly teamLogos: TeamLogoService = inject(TeamLogoService);
  private readonly toastService: ToastService = inject(ToastService);

  /** What picks the empty dashboard: boards, plan cap, sign-in, loading and this season's count. */
  private readonly emptyFacts = computed<EmptyDashboardFacts>(() => ({
    boards: this.myGames().length,
    cap: this.planService.features().seasonGames,
    canHost: this.canCreateGame(),
    loading: this.isLoadingGames(),
    used: this.seasonGames.used()
  }));
}
