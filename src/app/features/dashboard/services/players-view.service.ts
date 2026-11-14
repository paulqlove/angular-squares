import { Injectable, computed, inject, signal } from '@angular/core';

import { GameChange, GameData, GameService } from '../../../core/services/game.service';
import { PlanService } from '../../../core/services/plan.service';
import { ToastService } from '../../../core/services/toast.service';
import { withPlayerConfirmCount, withPlayerConfirmed, withoutPlayer } from '../../../core/utils/board-players';
import { paidCountsByName } from '../../../core/utils/paid-squares';
import { DashboardStore } from './dashboard.store';
import { PlayerGame, PlayerSummary, PlayersBoard, playersAcrossGames } from './players-across-games';

/** The "All confirmed" beat on a card whose last game was just confirmed; `leaving` once it starts moving to Confirmed. */
export interface AllConfirmedBeat {
  key: string;
  leaving: boolean;
}

/** The line under an opened player after a Confirm, with its Undo. */
export interface ConfirmNote {
  key: string;
  text: string;
  previous: GameData[];
}

/** A card held in its spot in a group: the open card, and the card in the "All confirmed" beat. */
interface PlayerPin {
  key: string;
  group: 'unconfirmed' | 'confirmed';
  index: number;
}

/** How long "All confirmed" holds before the card moves, and how long the move takes (shorter with reduced motion). */
const BEAT_HOLD_MS = 900;
const BEAT_LEAVE_MS = 200;
const BEAT_LEAVE_REDUCED_MS = 120;

/**
 * The Players view on the dashboard (Season Pass): one list of players across every board the host runs or co-hosts,
 * with Confirm and Remove per game or for all of a player's games. Provided on the dashboard.
 */
@Injectable()
export class PlayersViewService {
  /** The Players view is on screen. */
  public readonly active = computed<boolean>(() => this.available() && this.mode() === 'players');
  /** The card showing "All confirmed" before it moves to Confirmed. */
  public readonly allConfirmed = signal<AllConfirmedBeat | null>(null);
  /** What the polite live region reads out: "Dana, all games confirmed". */
  public readonly announcement = signal<string>('');
  /** Season Pass hosts with two or more boards they run get the Boards | Players switch. */
  public readonly available = computed<boolean>(() => this.planService.features().playersView && this.boards().length >= 2);
  /** The boards in season order (oldest first), so each game keeps one spot in every player's tiles. */
  public readonly boards = computed<GameData[]>(() => [...this.store.runBoards()].sort((a, b) => a.createdAt - b.createdAt));
  public readonly confirmNote = signal<ConfirmNote | null>(null);
  /** Confirmed players. The open card and a card in the "All confirmed" beat keep their spot until they're done. */
  public readonly confirmed = computed<PlayerSummary[]>(() => this.placed('confirmed'));
  /** One game picked from the games menu, or null for all. */
  public readonly gameFilter = signal<string | null>(null);
  /** Boards or Players, from the switch in the Hosting heading. */
  public readonly mode = signal<'boards' | 'players'>('boards');
  /** The player whose card is open. */
  public readonly openKey = signal<string | null>(null);
  public readonly players = computed<PlayerSummary[]>(() => {
    const boards = this.shownBoards() as PlayersBoard[];
    const search = this.search().trim().toLowerCase();
    return playersAcrossGames(boards).filter(player => !search || [player.name, ...player.otherNames].some(name => name.toLowerCase().includes(search)));
  });
  public readonly search = signal<string>('');
  /** The boards the list covers: all of them, or the one picked from the games menu. Each is one tile column. */
  public readonly shownBoards = computed<GameData[]>(() => {
    const filter = this.gameFilter();
    return this.boards().filter(board => !filter || board.id === filter);
  });
  /** Unconfirmed players, held in place the same way as `confirmed`. */
  public readonly unconfirmed = computed<PlayerSummary[]>(() => this.placed('unconfirmed'));

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

  /**
   * The green toggle on one of a player's games. On: confirmed for the squares they hold there now. Off: back to how
   * that game stood before the host turned it on (unconfirmed, or "+2 new"), or unconfirmed if it was already on.
   */
  public async toggleGame(player: PlayerSummary, gameId: string): Promise<void> {
    const game = player.games.find(g => g.gameId === gameId);
    if (!game) return;
    const board = this.boardById(gameId);
    const key = `${gameId}\n${game.name}`;
    this.confirmNote.set(null);
    if (!game.confirmed) {
      const before = paidCountsByName(board.paidPlayers ?? [], board.paidSquares)[game.name] ?? null;
      const change = { gameId, data: withPlayerConfirmed(board, game.name) };
      const last = this.holdIfLast(player, [gameId]);
      const saved = await this.save([change], [board], `Could not confirm ${player.name}. Try again.`);
      if (saved) this.beforeToggle.set(key, before);
      this.afterConfirm(player, last, saved);
      return;
    }
    const change = { gameId, data: withPlayerConfirmCount(board, game.name, this.beforeToggle.get(key) ?? null) };
    if (await this.save([change], [board], `Could not change ${player.name}. Try again.`)) this.beforeToggle.delete(key);
  }

  /**
   * Opens a player's card, or closes it. The open card keeps its spot until it closes, so a toggle never moves it from
   * under the host's finger. Opening a card during its "All confirmed" beat stops the beat and keeps the card where it is.
   */
  public toggleOpen(key: string): void {
    const opening = this.openKey() !== key;
    this.confirmNote.set(null);
    if (this.allConfirmed()?.key === key) this.stopBeat();
    const pin = opening ? this.pinFor(key) : null;
    this.openKey.set(opening ? key : null);
    this.openPin.set(pin);
    if (this.beatPin()?.key === key) this.beatPin.set(null);
  }

  /** Puts back the Confirm marks the last Confirm changed. */
  public async undoConfirm(): Promise<void> {
    const note = this.confirmNote();
    if (!note) return;
    this.confirmNote.set(null);
    const changes = note.previous.map(board => ({ gameId: board.id as string, data: { paidPlayers: board.paidPlayers ?? [], paidSquares: board.paidSquares ?? [] } }));
    await this.save(changes, this.boardsFor(changes), 'Could not undo. Try again.');
  }

  private beatTimer: ReturnType<typeof setTimeout> | null = null;
  /** The card in the "All confirmed" beat, held in Unconfirmed until it moves. */
  private readonly beatPin = signal<PlayerPin | null>(null);
  /** Per game and name, the Confirm count from before the host turned the toggle on (null: not on the paid list). */
  private readonly beforeToggle = new Map<string, number | null>();
  private readonly gameService: GameService = inject(GameService);
  /** The open card, held where it was when it opened. */
  private readonly openPin = signal<PlayerPin | null>(null);
  private readonly planService: PlanService = inject(PlanService);
  private readonly store: DashboardStore = inject(DashboardStore);
  private readonly toastService: ToastService = inject(ToastService);

  /** After a save that confirmed a player's last games: the "All confirmed" beat, or letting go of the held spot. */
  private afterConfirm(player: PlayerSummary, last: boolean, saved: boolean): void {
    if (!last) return;
    if (saved) this.startBeat(player);
    else this.beatPin.set(null);
  }

  private boardById(gameId: string): GameData {
    return this.store.runBoards().find(board => board.id === gameId) as GameData;
  }

  private boardsFor(games: ReadonlyArray<Pick<PlayerGame, 'gameId'> | GameChange>): GameData[] {
    return games.map(game => this.boardById(game.gameId));
  }

  private async confirm(player: PlayerSummary, games: PlayerGame[], text: string): Promise<void> {
    const previous = this.boardsFor(games);
    const changes = games.map(game => ({ gameId: game.gameId, data: withPlayerConfirmed(this.boardById(game.gameId), game.name) }));
    const last = this.holdIfLast(player, games.map(game => game.gameId));
    const saved = await this.save(changes, previous, `Could not confirm ${player.name}. Try again.`);
    if (saved) this.confirmNote.set({ key: player.key, text, previous });
    this.afterConfirm(player, last, saved);
  }

  /** Ends the "All confirmed" beat: the card leaves Unconfirmed and fades in under Confirmed. */
  private endBeat(): void {
    this.stopBeat();
    this.beatPin.set(null);
  }

  /**
   * Before confirming the given games: when they're the player's last unconfirmed ones and the card shows under
   * Unconfirmed, holds it there for the "All confirmed" beat. Says whether they were the last.
   */
  private holdIfLast(player: PlayerSummary, gameIds: readonly string[]): boolean {
    const shown = this.unconfirmed().findIndex(p => p.key === player.key);
    const last = player.games.every(game => game.confirmed || gameIds.includes(game.gameId));
    if (!last || shown < 0) return false;
    this.beatPin.set({ key: player.key, group: 'unconfirmed', index: shown });
    return true;
  }

  /** Where a player's card shows now, to hold it there. */
  private pinFor(key: string): PlayerPin | null {
    const unconfirmed = this.unconfirmed().findIndex(p => p.key === key);
    if (unconfirmed >= 0) return { key, group: 'unconfirmed', index: unconfirmed };
    const confirmed = this.confirmed().findIndex(p => p.key === key);
    return confirmed >= 0 ? { key, group: 'confirmed', index: confirmed } : null;
  }

  /** One group's players in sorted order, with held cards put back in their spots. */
  private placed(group: PlayerPin['group']): PlayerSummary[] {
    const players = this.players();
    const beat = this.beatPin();
    const open = this.openPin();
    const pins = [beat, open?.key === beat?.key ? null : open].filter((pin): pin is PlayerPin => !!pin);
    const list = players.filter(player => player.confirmed === (group === 'confirmed') && !pins.some(pin => pin.key === player.key));
    for (const pin of pins.filter(p => p.group === group).sort((a, b) => a.index - b.index)) {
      const player = players.find(p => p.key === pin.key);
      if (player) list.splice(Math.min(pin.index, list.length), 0, player);
    }
    return list;
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

  /**
   * The card's "All confirmed" beat: its panel closes, the line under the name says "All confirmed", it holds, then
   * fades and drops into Confirmed. If the player is unconfirmed again by the end of the hold, it stays put.
   */
  private startBeat(player: PlayerSummary): void {
    this.stopBeat();
    if (this.openKey() === player.key) {
      this.openKey.set(null);
      this.openPin.set(null);
    }
    this.allConfirmed.set({ key: player.key, leaving: false });
    this.announcement.set(`${player.name}, all games confirmed`);
    this.beatTimer = setTimeout(() => {
      if (!this.players().find(p => p.key === player.key)?.confirmed) return this.endBeat();
      this.allConfirmed.set({ key: player.key, leaving: true });
      this.beatTimer = setTimeout(() => this.endBeat(), reducedMotion() ? BEAT_LEAVE_REDUCED_MS : BEAT_LEAVE_MS);
    }, BEAT_HOLD_MS);
  }

  /** Stops the beat's timers and its "All confirmed" line, leaving any held spot to the caller. */
  private stopBeat(): void {
    if (this.beatTimer) clearTimeout(this.beatTimer);
    this.beatTimer = null;
    this.allConfirmed.set(null);
  }
}

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
