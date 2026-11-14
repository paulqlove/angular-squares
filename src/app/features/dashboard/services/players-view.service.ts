import { Injectable, computed, inject, signal } from '@angular/core';

import { GameChange, GameData, GameService } from '../../../core/services/game.service';
import { PlanService } from '../../../core/services/plan.service';
import { ToastService } from '../../../core/services/toast.service';
import { withPlayerConfirmed, withoutPlayer } from '../../../core/utils/board-players';
import { DashboardStore } from './dashboard.store';
import { PlayerGame, PlayerSummary, PlayersBoard, playersAcrossGames } from './players-across-games';

/** The line under an opened player after a Confirm, with its Undo. */
export interface ConfirmNote {
  key: string;
  text: string;
  previous: GameData[];
}

/**
 * The Players view on the dashboard (Season Pass): one list of players across every board the host runs or co-hosts,
 * with Confirm and Remove per game or for all of a player's games. Provided on the dashboard.
 */
@Injectable()
export class PlayersViewService {
  /** Season Pass hosts with two or more boards they run get the Boards | Players switch. */
  public readonly available = computed<boolean>(() => this.planService.features().playersView && this.boards().length >= 2);
  /** The boards in season order (oldest first), so each game keeps one spot in every player's tiles. */
  public readonly boards = computed<GameData[]>(() => [...this.store.runBoards()].sort((a, b) => a.createdAt - b.createdAt));
  public readonly confirmNote = signal<ConfirmNote | null>(null);
  public readonly confirmed = computed<PlayerSummary[]>(() => this.players().filter(player => player.confirmed));
  /** One game picked from the games menu, or null for all. */
  public readonly gameFilter = signal<string | null>(null);
  /** The player whose card is open. */
  public readonly openKey = signal<string | null>(null);
  public readonly players = computed<PlayerSummary[]>(() => {
    const filter = this.gameFilter();
    const boards = this.boards().filter(board => !filter || board.id === filter) as PlayersBoard[];
    const search = this.search().trim().toLowerCase();
    return playersAcrossGames(boards).filter(player => !search || [player.name, ...player.otherNames].some(name => name.toLowerCase().includes(search)));
  });
  public readonly search = signal<string>('');
  public readonly unconfirmed = computed<PlayerSummary[]>(() => this.players().filter(player => !player.confirmed));

  /** Confirms the player on one game, for the squares they hold there now. */
  public async confirmGame(player: PlayerSummary, gameId: string): Promise<void> {
    const game = player.games.find(g => g.gameId === gameId && !g.confirmed);
    if (game) await this.confirm(player, [game], `${game.gameName} confirmed for ${player.name}.`);
  }

  /** Confirms the player on every game they still have unconfirmed squares on. */
  public async confirmRest(player: PlayerSummary): Promise<void> {
    const games = player.games.filter(game => !game.confirmed);
    if (games.length) await this.confirm(player, games, `${player.name} confirmed on every game.`);
  }

  /**
   * Takes the player off the picked games. Locked games are skipped: removing there would empty squares that can't be
   * picked again and wipe quarter wins.
   */
  public async removeFromGames(player: PlayerSummary, gameIds: readonly string[]): Promise<void> {
    const picked = player.games.filter(game => gameIds.includes(game.gameId));
    const open = picked.filter(game => !game.locked);
    if (open.length < picked.length) this.toastService.warning('Locked games were skipped. Unlock a game to remove a player there.');
    if (!open.length) return;
    const previous = this.boardsFor(open);
    const changes = open.map(game => ({ gameId: game.gameId, data: withoutPlayer(this.boardById(game.gameId), game.name) }));
    if (await this.save(changes, previous, `Could not remove ${player.name}. Try again.`)) {
      this.toastService.success(open.length === 1 ? `Removed ${player.name} from ${open[0].gameName}` : `Removed ${player.name} from ${open.length} games`);
    }
  }

  public toggleOpen(key: string): void {
    this.openKey.update(open => open === key ? null : key);
    this.confirmNote.set(null);
  }

  /** Puts back the Confirm marks the last Confirm changed. */
  public async undoConfirm(): Promise<void> {
    const note = this.confirmNote();
    if (!note) return;
    this.confirmNote.set(null);
    const changes = note.previous.map(board => ({ gameId: board.id as string, data: { paidPlayers: board.paidPlayers ?? [], paidSquares: board.paidSquares ?? [] } }));
    await this.save(changes, this.boardsFor(changes), 'Could not undo. Try again.');
  }

  private readonly gameService: GameService = inject(GameService);
  private readonly planService: PlanService = inject(PlanService);
  private readonly store: DashboardStore = inject(DashboardStore);
  private readonly toastService: ToastService = inject(ToastService);

  private boardById(gameId: string): GameData {
    return this.store.runBoards().find(board => board.id === gameId) as GameData;
  }

  private boardsFor(games: ReadonlyArray<Pick<PlayerGame, 'gameId'> | GameChange>): GameData[] {
    return games.map(game => this.boardById(game.gameId));
  }

  private async confirm(player: PlayerSummary, games: PlayerGame[], text: string): Promise<void> {
    const previous = this.boardsFor(games);
    const changes = games.map(game => ({ gameId: game.gameId, data: withPlayerConfirmed(this.boardById(game.gameId), game.name) }));
    if (await this.save(changes, previous, `Could not confirm ${player.name}. Try again.`)) {
      this.confirmNote.set({ key: player.key, text, previous });
    }
  }

  /** Shows the changes at once and saves them in one update; on failure puts the boards back and says so. */
  private async save(changes: GameChange[], previous: GameData[], failure: string): Promise<boolean> {
    changes.forEach(change => this.store.setRunBoard({ ...this.boardById(change.gameId), ...change.data }));
    try {
      await this.gameService.updateGames(changes);
      return true;
    } catch {
      previous.forEach(board => this.store.setRunBoard(board));
      this.toastService.error(failure);
      return false;
    }
  }
}
