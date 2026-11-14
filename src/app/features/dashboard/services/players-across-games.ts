import type { GameData } from '../../../core/services/game.service';
import { confirmedPlayers, paidCountsByName, squaresByPlayer } from '../../../core/utils/paid-squares';

/**
 * The Players view: every player across the boards a Season Pass host runs (hosts or co-hosts), with their squares,
 * points and Confirm state per game. Players group only when the same account holds them; names typed by a board's
 * host or co-host belong to that host, so each stays its own entry until the host merges by hand.
 */

/** One board as the Players view reads it. */
export type PlayersBoard = Pick<GameData, 'name' | 'isLocked' | 'pricePerSquare' | 'ownerId' | 'managerId' | 'selectedSquares' | 'paidPlayers' | 'paidSquares' | 'playerUserIds'> & { id: string };

/** A player's place on one board. */
export interface PlayerGame {
  gameId: string;
  gameName: string;
  /** The name this player uses on this board. */
  name: string;
  squares: number;
  points: number;
  confirmed: boolean;
  /** Squares added after the host confirmed this player on this board. */
  newSquares: number;
  locked: boolean;
}

/** One player across the host's boards. */
export interface PlayerSummary {
  /** The account id, or board and name for a name with no account of its own. */
  key: string;
  name: string;
  /** Other names the same account uses on other boards, like "Sammy" next to "Sam". */
  otherNames: string[];
  /** One entry per board the player is on, in the boards' order. */
  games: PlayerGame[];
  squares: number;
  points: number;
  /** Confirmed on every board they play. One unconfirmed square makes them Unconfirmed. */
  confirmed: boolean;
  newSquares: number;
  /** 1-based place among players with the same name on different accounts ("Same name, account 2"), or 0 if the name is theirs alone. */
  sameNameIndex: number;
}

/** Everyone on the given boards, Unconfirmed first, then by name. Boards keep the order given (the tile order). */
export function playersAcrossGames(boards: readonly PlayersBoard[]): PlayerSummary[] {
  const byKey = new Map<string, PlayerGame[]>();
  for (const board of boards) {
    for (const game of boardPlayers(board)) {
      const key = playerKey(board, game.name);
      byKey.set(key, [...(byKey.get(key) ?? []), game]);
    }
  }
  const players = Array.from(byKey, ([key, games]) => summarize(key, games));
  markSameNames(players);
  return players.sort((a, b) => Number(a.confirmed) - Number(b.confirmed) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.sameNameIndex - b.sameNameIndex);
}

/** Each player on one board with their squares, points and Confirm state. */
function boardPlayers(board: PlayersBoard): PlayerGame[] {
  const squares = board.selectedSquares ?? {};
  const paid = board.paidPlayers ?? [];
  const confirmed = confirmedPlayers(squares, paid, board.paidSquares);
  const paidCounts = paidCountsByName(paid, board.paidSquares);
  return Object.entries(squaresByPlayer(squares)).map(([name, count]) => ({
    gameId: board.id,
    gameName: board.name,
    name,
    squares: count,
    points: count * (board.pricePerSquare || 0),
    confirmed: confirmed.has(name),
    newSquares: name in paidCounts ? Math.max(0, count - paidCounts[name]) : 0,
    locked: !!board.isLocked
  }));
}

/** Gives each player who shares a name (any case) with another account their place among them. */
function markSameNames(players: PlayerSummary[]): void {
  const byName = new Map<string, PlayerSummary[]>();
  for (const player of players) {
    const name = player.name.trim().toLowerCase();
    byName.set(name, [...(byName.get(name) ?? []), player]);
  }
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.key.localeCompare(b.key)).forEach((player, i) => player.sameNameIndex = i + 1);
  }
}

/** The name the player uses on the most boards, the first such board on a tie. */
function mostUsedName(games: readonly PlayerGame[]): string {
  const uses = new Map<string, number>();
  for (const game of games) uses.set(game.name, (uses.get(game.name) ?? 0) + 1);
  return Array.from(uses).reduce((best, next) => next[1] > best[1] ? next : best)[0];
}

/** The account behind a name, unless it is the board's host or co-host, who own every name they typed in. */
function playerKey(board: PlayersBoard, name: string): string {
  const uid = board.playerUserIds?.[name];
  const isHostTyped = !uid || uid === board.ownerId || uid === board.managerId;
  return isHostTyped ? `${board.id}/${name}` : uid;
}

function summarize(key: string, games: PlayerGame[]): PlayerSummary {
  const name = mostUsedName(games);
  return {
    key,
    name,
    otherNames: Array.from(new Set(games.map(game => game.name))).filter(other => other !== name),
    games,
    squares: games.reduce((sum, game) => sum + game.squares, 0),
    points: games.reduce((sum, game) => sum + game.points, 0),
    confirmed: games.every(game => game.confirmed),
    newSquares: games.reduce((sum, game) => sum + game.newSquares, 0),
    sameNameIndex: 0
  };
}
